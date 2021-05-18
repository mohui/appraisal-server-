<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '20px'
      }"
    >
      <div slot="header" class="header">
        <span>配置列表</span>
        <div>
          <el-button size="mini" type="primary">新增考核项</el-button>
          <el-button size="mini" type="text">工分考核</el-button>
          <el-button size="mini" type="text">员工考核</el-button>
        </div>
      </div>
      <kn-collapse
        :is-show="$settings.isMobile"
        :is-collapsed="isCollapsed"
        @toggle="is => (isCollapsed = is)"
      >
        <el-form
          ref="ruleForm"
          :model="searchForm"
          label-width="100px"
          size="mini"
        >
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="打分方式:">
              <el-select v-model="searchForm.scoreType" size="mini" clearable>
                <el-option value="manual" label="手动打分"></el-option>
                <el-option value="auto" label="自动打分"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="打分标准:">
              <el-select
                v-model="searchForm.score"
                size="mini"
                clearable
              ></el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="工分项:">
              <el-input
                v-model="searchForm.work"
                size="mini"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
        </el-form>
      </kn-collapse>
      <el-table
        v-loading="tableLoading"
        stripe
        size="small"
        :data="tableData"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column prop="index" label="序号"></el-table-column>
        <el-table-column prop="work" label="工分项"></el-table-column>
        <el-table-column prop="scoreType" label="打分类型"></el-table-column>
        <el-table-column prop="scoreMember" label="考核员工"></el-table-column>
        <el-table-column prop="score" label="配置得分"></el-table-column>
        <el-table-column prop="createdAt" label="创建时间"></el-table-column>
        <el-table-column prop="" label="操作"></el-table-column>
      </el-table>
      <el-pagination
        background
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :total="serverData.counts"
        @size-change="
          size => {
            searchForm.pageSize = size;
            searchForm.pageNo = 1;
          }
        "
        @current-change="
          no => {
            searchForm.pageNo = no;
          }
        "
      >
      </el-pagination>
    </el-card>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';

export default {
  name: 'User',
  data() {
    return {
      isCollapsed: !!this.$settings.isMobile,
      permission: Permission,
      searchForm: {
        scoreType: '',
        score: '',
        work: '',
        pageSize: 20,
        pageNo: 1
      },
      tableLoading: false
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows;
    }
  },
  watch: {},
  asyncComputed: {
    serverData: {
      async get() {
        let data = [];
        this.tableLoading = true;
        const {scoreType, score, work} = this.searchForm;
        console.log(scoreType, score, work);
        try {
          await new Promise(resolve =>
            setTimeout(() => {
              for (let i = 0; i < 10; i++) {
                data.push({
                  index: i + 1,
                  work: '工分项1',
                  scoreType: '自动打分',
                  scoreMember: `员工${i + 1}`,
                  score: 30,
                  createdAt: '2021-05-18 11:23:21'
                });
              }
              resolve();
            }, 1000)
          );
          return {
            counts: 10,
            rows: data
          };
        } catch (e) {
          console.error(e.message);
        } finally {
          this.tableLoading = false;
        }
      },
      default: {counts: 0, rows: []}
    }
  },
  methods: {}
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
}
</style>
