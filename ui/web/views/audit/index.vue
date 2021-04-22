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
          prop="userName"
          label="操作人名称"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="module"
          label="操作模块"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="method"
          label="操作功能"
        ></el-table-column>

        <el-table-column
          align="center"
          prop="extra"
          label="操作附加属性"
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
        account: '',
        date: '',
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
        return {
          time: it.time.$format('YYYY-MM-DD HH:mm:ss'),
          userName: it.user_name,
          module: it.module,
          method: it.method,
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
        const {date, name, pageSize, pageNo} = this.searchForm;

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
    }
  }
};
</script>
