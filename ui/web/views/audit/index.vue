<template>
  <div style="height: 100%">
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
      <el-form
        :inline="true"
        :model="searchForm"
        size="mini"
        class="demo-form-inline"
      >
        <el-form-item label="操作日期">
          <el-date-picker
            v-model="searchForm.date"
            size="mini"
            type="daterange"
            style="margin-right: 20px"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          >
          </el-date-picker>
        </el-form-item>
        <el-form-item label="操作人名称">
          <el-input
            v-model="searchForm.name"
            placeholder="操作人名称"
          ></el-input>
        </el-form-item>
        <el-form-item label="考核名称选择">
          <el-select
            v-model="searchForm.checkId"
            clearable
            placeholder="考核名称选择"
          >
            <el-option
              v-for="item in selectSystemService"
              :key="item.checkId"
              :label="item.checkName"
              :value="item.checkId"
            >
              <span style="float: left">{{ item.checkName }}</span>
              <span style="float: right; color: #8492a6; font-size: 13px">{{
                item.checkYear
              }}</span>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="mini"
            @click="$asyncComputed.auditLogService.update()"
            >查询</el-button
          >
        </el-form-item>
      </el-form>
      <el-table
        :data="auditLogData"
        class="clearfix"
        size="small"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column
          align="center"
          prop="time"
          label="操作时间"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="ip"
          label="终端ip地址"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="account"
          label="登录名"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="extraModule"
          label="模块"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="checkName"
          label="考核名称"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="checkYear"
          label="考核年度"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="operation"
          label="操作"
        ></el-table-column>
      </el-table>
      <!--分页-->
      <el-pagination
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :total="pageData.rows"
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
import * as dayjs from 'dayjs';

export default {
  data() {
    return {
      searchForm: {
        date: '',
        checkId: '',
        name: '',
        pageSize: 10,
        pageNo: 1
      }
    };
  },
  computed: {
    auditLogData() {
      const listModels = this.auditLogService;
      return listModels.data.map(it => {
        // 判断操作类型
        let curdName = '';
        if (it.extra?.curd === 'delete') curdName = '删除';
        else if (it.extra?.curd === 'insert') curdName = '新建';
        else if (it.extra?.curd === 'update') curdName = '修改';
        else if (it.extra?.curd === 'copy') curdName = '复制';
        // 考核细则优先级最高,其次是考核项,最后是考核名称
        let systemType = it.extra?.ruleName
          ? `考核细则${it.extra.ruleName}`
          : it.extra?.parentRuleName
          ? `考核项${it.extra?.parentRuleName ?? ''}`
          : `考核规则${it.extra?.checkName ?? ''}`;

        return {
          time: it.time.$format('YYYY-MM-DD HH:mm:ss'),
          userName: it.user_name,
          ip: it.extra?.ip ?? '',
          extraModule: it.extra?.module ?? '',
          checkName: it.extra?.checkName ?? '',
          checkYear: it.extra?.checkYear ?? '',
          account: it.extra?.account ?? '',
          operation: it.extra?.curd ? `${curdName}${systemType}` : '',
          extra: it.extra ? JSON.stringify(it.extra) : ''
        };
      });
    },
    pageData() {
      return {
        rows: this.auditLogService.rows,
        pages: this.auditLogService.pages
      };
    }
  },
  asyncComputed: {
    auditLogService: {
      async get() {
        const {date, checkId, name, pageSize, pageNo} = this.searchForm;

        let startDate = null;
        let endDate = null;
        if (date) {
          startDate = date[0];
          endDate = date[1];
          endDate = dayjs(endDate).add(1, 'day');
        }

        return this.$api.AuditLog.list(
          startDate,
          endDate,
          checkId,
          name,
          pageNo,
          pageSize
        );
      },
      default() {
        return {
          data: [],
          rows: 0,
          pages: 0
        };
      }
    },
    selectSystemService: {
      async get() {
        return this.$api.AuditLog.checkSystems();
      },
      default() {
        return [];
      }
    }
  }
};
</script>
