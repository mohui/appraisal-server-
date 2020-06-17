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
        <span>个人档案列表</span>
      </div>
      <el-form :model="queryForm" label-width="100px" size="mini">
        <el-row>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="姓名：">
              <kn-debounce-input
                v-model.trim="queryForm.name"
                placeholder="请输入要查询的姓名"
                clearable
              ></kn-debounce-input>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="身份证号码：">
              <kn-debounce-input
                v-model.trim="queryForm.idCard"
                placeholder="请输入要查询的身份证号码"
                clearable
              ></kn-debounce-input>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="管理机构：">
              <el-select
                v-model="queryForm.hospital"
                clearable
                placeholder="请选择"
                style="width: 100%;"
              >
                <el-option
                  v-for="item in hospitals"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                >
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="标记:">
              <el-select
                v-model="queryForm.tags"
                clearable
                multiple
                collapse-tags
                placeholder="请选择"
                style="width: 100%;"
              >
                <el-option
                  v-for="item in tagList"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                >
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="5" :xs="24" :sm="24" :md="12" :lg="6" :xl="6">
            <el-form-item label="">
              <el-button
                type="primary"
                size="mini"
                @click="$asyncComputed.serverData.update()"
                >查询</el-button
              >
              <el-button
                type="primary"
                size="mini"
                @click="handleResetCondition"
              >
                重置条件
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        v-loading="$asyncComputed.serverData.updating"
        :data="tableData"
        empty-text="没有筛选到符合条件的数据"
        @row-click="handleCellClick"
        :cell-class-name="cellClassHover"
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column prop="name" label="姓名" min-width="50" align="center">
        </el-table-column>
        <el-table-column
          prop="idCardfFormat"
          label="身份证"
          min-width="80"
          align="center"
        ></el-table-column>
        <el-table-column
          prop="hospitalName"
          label="管理机构"
          min-width="100"
          align="center"
        ></el-table-column>
        <el-table-column label="标记" min-width="400" align="center">
          <template slot-scope="scope">
            <el-tag
              v-for="tag of scope.row.tags"
              :key="tag.label"
              style="margin-right: 5px"
              size="mini"
              :type="tag.type ? 'primary' : 'danger'"
              >{{ tag.label }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        background
        :page-size="pageSize"
        :current-page="pageNo"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :page-sizes="[50, 100, 200, 400]"
        :total="serverData.count"
        @current-change="handlePageNoChange"
        @size-change="handlePageSizeChange"
      >
      </el-pagination>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'PersonList',
  created() {
    this.initParams(this.$route);
  },
  data() {
    return {
      pageSize: 50,
      pageNo: 1,
      hospitals: this.$settings.user.hospitals,
      queryForm: {
        name: '',
        hospital: '',
        idCard: '',
        tags: []
      },
      tagList: [
        {
          id: 'C00',
          name: '普通居民'
        },
        {
          id: 'C01',
          name: '老年人'
        },
        {
          id: 'C02',
          name: '高血压'
        },
        {
          id: 'C03',
          name: '糖尿病'
        },
        {
          id: 'C04',
          name: '孕产妇'
        },
        {
          id: 'C05',
          name: '0~6岁儿童'
        },
        {
          id: 'S03',
          name: '非动态使用'
        },
        {
          id: 'S23',
          name: '档案不规范'
        },
        {
          id: 'O00',
          name: '老年人健康管理不规范'
        },
        {
          id: 'O01',
          name: '老年人体检不完整'
        },
        {
          id: 'O02',
          name: '无老年人中医药管理'
        },
        {
          id: 'H01',
          name: '高血压管理不规范'
        },
        {
          id: 'H02',
          name: '高血压未控制'
        },
        {
          id: 'D01',
          name: '糖尿病管理不规范'
        },
        {
          id: 'D02',
          name: '糖尿病未控制'
        }
      ]
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows.map(it => {
        it.tags = [];
        //重点人群
        if (it.C00) it.tags.push({label: `普通居民`, type: it?.C00});
        if (it.C01) it.tags.push({label: `老年人`, type: it?.C01});
        if (it.C02) it.tags.push({label: `高血压`, type: it?.C02});
        if (it.C03) it.tags.push({label: `糖尿病`, type: it?.C03});
        if (it.C04) it.tags.push({label: `孕产妇`, type: it?.C04});
        if (it.C05) it.tags.push({label: `0~6岁儿童`, type: it?.C05});
        // 健康档案标记
        if (it.S03 !== null)
          it.tags.push({
            label: `${it?.S03 ? '' : '非'}动态使用`,
            type: it?.S03
          });
        if (it.S23 !== null)
          it.tags.push({
            label: `档案${it?.S23 ? '' : '不'}规范`,
            type: it?.S23
          });
        // 老年人标记

        if (it.O00 !== null)
          it.tags.push({
            label: `老年人健康管理${it?.O00 ? '' : '不'}规范`,
            type: it?.O00
          });
        if (it.O01 !== null)
          it.tags.push({
            label: `老年人体检${it?.O01 ? '' : '不'}完整`,
            type: it?.S23
          });
        if (it.O02 !== null)
          it.tags.push({
            label: `${it?.O02 ? '' : '无'}老年人中医药管理`,
            type: it?.O02
          });
        // 高血压标记
        if (it.H01 !== null)
          it.tags.push({
            label: `高血压管理${it?.H01 ? '' : '不'}规范`,
            type: it?.H01
          });
        if (it.H02 !== null)
          it.tags.push({
            label: `高血压${it?.H02 ? '已' : '未'}控制`,
            type: it?.H02
          });
        // 糖尿病标记
        if (it.D01 !== null)
          it.tags.push({
            label: `糖尿病管理${it?.D01 ? '' : '不'}规范`,
            type: it?.D01
          });
        if (it.D02 !== null)
          it.tags.push({
            label: `糖尿病${it?.D02 ? '已' : '未'}控制`,
            type: it?.D02
          });
        it.idCardfFormat = it.idCard.replace(
          /^(.{10})(?:\d+)(.{2})$/,
          '$1******$2'
        );
        return it;
      });
    }
  },
  watch: {
    queryForm: {
      handler() {
        this.pageNo = 1;
        const urlTags = JSON.stringify(this.queryForm.tags);
        let query = {};
        if (this.queryForm.name) query.name = this.queryForm.name;
        if (this.queryForm.hospital) query.hospital = this.queryForm.hospital;
        if (this.queryForm.idCard) query.idCard = this.queryForm.idCard;
        if (this.queryForm.tags.length) query.tags = urlTags;
        else delete query.tags;
        this.$router.replace({query: query}).catch(err => {
          err;
        });
      },
      deep: true
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        return this.$api.Person.list({
          pageSize: this.pageSize,
          pageNo: this.pageNo,
          name: this.queryForm.name,
          idCard: this.queryForm.idCard,
          hospital: this.queryForm.hospital,
          tags: this.queryForm.tags.reduce((res, next) => {
            res[`${next}`] = next.includes('C0');
            return res;
          }, {})
        });
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    }
  },
  methods: {
    initParams(route) {
      if (route.query.name) this.queryForm.name = route.query.name;
      if (route.query.hospital) this.queryForm.hospital = route.query.hospital;
      if (route.query.idCard) this.queryForm.idCard = route.query.idCard;
      if (route.query.tags) this.queryForm.tags = JSON.parse(route.query.tags);
    },
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 0) return 'person-name';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name')
        return this.$router.push({
          name: 'patient',
          query: {
            id: row.id,
            tags: JSON.stringify(row.tags)
          }
        });
    },
    handlePageNoChange(no) {
      this.pageNo = no;
    },
    handlePageSizeChange(size) {
      this.pageNo = 1;
      this.pageSize = size;
    },
    handleResetCondition() {
      this.queryForm = {
        name: '',
        hospital: '',
        idCard: '',
        tags: []
      };
    }
  }
};
</script>

<style lang="scss">
.person-name {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}
</style>
