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
        <span>机构列表</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="dialogSetVisible = true"
          >配置
        </el-button>
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
        stripe
        border
        size="mini"
        :data="listHospital"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{
          background: '#F3F4F7',
          color: '#555',
          textAlign: 'center'
        }"
      >
        <el-table-column align="center" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column align="center" label="机构名称" prop="name">
        </el-table-column>
        <el-table-column align="center" label="金额" prop="budget">
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog title="选择机构" :visible.sync="dialogSetVisible">
      <p>
        <el-cascader
          style="width: 100%"
          :props="regionList"
          v-model="saveForm.code"
          @change="changeRegion"
        ></el-cascader>
      </p>
      <p>
        <el-input-number
          v-model="saveForm.budget"
          :precision="4"
          style="width: 50%;"
          placeholder="请输入金额"
        ></el-input-number>
      </p>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogSetVisible = false">取 消</el-button>
        <el-button type="primary" @click="setBudget">确 定</el-button>
      </div>
    </el-dialog>
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
      dialogSetVisible: false,
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
          const {level, value = null} = node;
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
  asyncComputed: {
    listHospital: {
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
    reset() {
      this.searchForm = {
        region: this.$settings.user.region.code
      };
    },
    //异步加载地区列表
    async region(code) {
      return await this.$api.Region.list(code);
    },
    async changeRegion(code) {
      let regionId = Array.isArray(code) ? code[code.length - 1] : code;
      let result = await this.$api.Region.info(regionId);
      this.saveForm.budget = result.budget;
    },
    async setBudget() {
      const {budget, code} = this.saveForm;
      let regionId = Array.isArray(code) ? code[code.length - 1] : code;
      if (!regionId) {
        this.$message.warning('请选择地区！');
        return;
      }
      try {
        await this.$api.Region.setBudget(budget, regionId);
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.dialogSetVisible = false;
      }
    }
  }
};
</script>

<style scoped lang="scss"></style>
