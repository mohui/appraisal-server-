<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>金额列表</span>
      </div>
      <el-form
        ref="ruleForm"
        :model="searchForm"
        label-width="100px"
        size="mini"
      >
        <el-row>
          <el-col :span="6" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
            <el-form-item label="地区：">
              <el-cascader
                v-model="searchForm.region"
                style="width: 100%"
                :props="regionList"
                collapse-tags
                filterable
              ></el-cascader>
            </el-form-item>
          </el-col>
          <el-col :span="5" :xs="24" :sm="24" :md="12" :lg="12" :xl="12">
            <el-form-item label="">
              <el-button
                type="primary"
                size="mini"
                @click="$asyncComputed.listHospital.update()"
                >查询</el-button
              >
              <el-button type="primary" size="mini" @click="reset">
                重置条件
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        size="mini"
        :data="hospitalListData"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{
          background: '#F3F4F7',
          color: '#555',
          textAlign: 'center'
        }"
      >
        <el-table-column type="expand">
          <template slot-scope="props">
            <el-table
              border
              size="mini"
              :data="props.row.children"
              @row-click="handleCellClick"
              :cell-class-name="cellClassHover"
            >
              <el-table-column align="center" label="序号">
                <template slot-scope="scope">
                  {{ scope.$index + 1 }}
                </template>
              </el-table-column>
              <el-table-column align="center" label="机构名称" prop="name">
              </el-table-column>
              <el-table-column
                align="center"
                label="校正后总工分值"
                prop="correctWorkPointFormat"
              >
              </el-table-column>
              <el-table-column
                align="center"
                label="质量系数"
                prop="rateFormat"
              >
              </el-table-column>
              <el-table-column align="center" label="金额" prop="budgetFormat">
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column align="center" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column align="center" label="机构名称" prop="name">
        </el-table-column>
        <el-table-column
          align="center"
          label="校正后总工分值"
          prop="correctWorkPointFormat"
        >
        </el-table-column>
        <el-table-column align="center" label="质量系数" prop="rateFormat">
        </el-table-column>
        <el-table-column align="center" label="金额" prop="budgetFormat">
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';
export default {
  name: 'hospital',
  data() {
    const that = this;
    return {
      permission: Permission,
      saveForm: {
        budget: '',
        code: ''
      },
      searchForm: {
        region: this.$settings.user.region.code
      },
      regionList: {
        lazy: true,
        checkStrictly: true,
        async lazyLoad(node, resolve) {
          const {level, value = that.$settings.user.region.code || null} = node;
          const region = (await that.region(value)).map(it => ({
            value: it.code,
            label: it.name,
            leaf: level >= 2
          }));
          resolve(region);
        }
      }
    };
  },
  computed: {
    hospitalListData() {
      console.log('hospitalListServerData', this.hospitalListServerData);
      return (
        this.hospitalListServerData
          //添加格式化数据
          .map(item => {
            item.correctWorkPointFormat = Math.round(item.correctWorkPoint);
            item.rateFormat = (item.rate * 100).toFixed(2) + '%';
            item.budgetFormat = item.budget.toFixed(2);
            return item;
          })
          //过滤，只取一级机构（name以"服务中心"和"卫生院"结尾）的值
          .filter(
            item =>
              item.name.endsWith('服务中心') || item.name.endsWith('卫生院')
          )
          //添加child
          .map(item => {
            const returnValue = Object.assign({}, item, {
              children: [
                item,
                ...this.hospitalListServerData.filter(
                  it => it.parent === item.id
                )
              ]
            });
            //累加校正后的总工分值
            returnValue.correctWorkPoint = returnValue.children.reduce(
              (result, current) => (result += current.correctWorkPoint),
              0
            );
            //格式化累加校正后的总工分值
            returnValue.correctWorkPointFormat = Math.round(
              returnValue.correctWorkPoint
            );
            //累加金额数
            returnValue.budget = returnValue.children.reduce(
              (result, current) => (result += current.budget),
              0
            );
            //格式化累加金额数
            returnValue.budgetFormat = returnValue.budget.toFixed(2);
            //累加质量系数
            returnValue.rate = returnValue.children.reduce(
              (result, current) => (result += current.rate),
              0
            );
            //取累加后质量系数的平均值
            returnValue.rate = returnValue.rate / returnValue.children.length;
            //格式化质量系数平均值
            returnValue.rateFormat = (returnValue.rate * 100).toFixed(2) + '%';

            return returnValue;
          })
      );
    }
  },
  asyncComputed: {
    hospitalListServerData: {
      async get() {
        let code = this.searchForm.region;
        let regionId = Array.isArray(code) ? code[code.length - 1] : code;
        return await this.$api.Region.listAllHospital(regionId);
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'hospital-name';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name')
        return this.$router.push({
          name: 'appraisal-result-institutions',
          query: {
            id: row.id,
            listFlag: 'quality',
            isInstitution: 'true'
          }
        });
    },
    reset() {
      this.searchForm = {
        region: this.$settings.user.region.code
      };
    },
    //异步加载地区列表
    async region(code) {
      return await this.$api.Region.list(code);
    }
  }
};
</script>

<style lang="scss">
.hospital-name {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}
</style>
