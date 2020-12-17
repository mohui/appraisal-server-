<template>
  <el-popover placement="bottom" width="550" trigger="click">
    <el-table
      align="center"
      size="mini"
      height="200px"
      width="100%"
      :data="jobDataShow"
    >
      <el-table-column align="center" label="状态" width="100">
        <template slot-scope="{row}">
          <el-button
            v-show="row.status === 'success'"
            size="mini"
            type="success"
            icon="el-icon-download"
            @click="downloadFile(row.result)"
            circle
          ></el-button>
          <el-button
            v-show="row.status === 'success' || row.status === 'error'"
            size="mini"
            type="danger"
            icon="el-icon-delete"
            @click="deleteJob(row.id)"
            circle
          ></el-button>
          <div v-show="row.status === 'running'">
            <i class="el-icon-loading"></i>正在运行...
          </div>
        </template>
      </el-table-column>
      <el-table-column
        align="center"
        property="title"
        label="名称"
        :min-width="computedColWidth('title')"
      ></el-table-column>
      <el-table-column
        align="center"
        property="startTime"
        label="时间"
        :min-width="computedColWidth('startTime')"
      >
        <template slot-scope="{row}">
          <div>
            {{ row.status === 'success' ? row.endTime : row.startTime }}
          </div>
        </template>
      </el-table-column>
      <el-table-column
        align="center"
        property="error"
        label="备注"
        :width="computedColWidth('error')"
      >
        <template slot-scope="{row}">
          <div style="color:red">{{ row.error }}</div>
        </template>
      </el-table-column>
    </el-table>
    <template slot="reference">
      <el-badge
        :value="jobDataShow.length"
        :max="20"
        v-show="jobDataShow.length > 0"
      >
        <el-button class="dropdown" type="text" style="color: white; padding: 0"
          >后台任务
        </el-button>
      </el-badge>
    </template>
  </el-popover>
</template>

<script>
import io from 'socket.io-client';
import {getToken} from '../utils/cache';
const DateStringRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

export default {
  name: 'kn-back-job',
  data() {
    return {
      jobData: []
    };
  },
  async created() {
    const socket = io({path: '/back-job', query: {id: getToken()}});
    socket.on('update', data => {
      if (
        typeof data.startTime === 'string' &&
        DateStringRegex.exec(data?.startTime)
      )
        data.startTime = new Date(data?.startTime);
      if (
        typeof data.endTime === 'string' &&
        DateStringRegex.exec(data?.endTime)
      )
        data.endTime = new Date(data?.endTime);

      const index = this.jobData.findIndex(it => it.id === data.id);

      if (index !== -1) this.$set(this.jobData, index, data);
      else this.jobData.push(data);
    });
    this.socket = socket;
  },
  computed: {
    jobDataShow() {
      return this.jobData.map(it => ({
        ...it,
        startTime: it.startTime.$format(),
        endTime: it?.endTime?.$format() || ''
      }));
    }
  },
  methods: {
    computedColWidth(field) {
      if (this.jobDataShow?.length > 0) {
        return this.$widthCompute(
          this.jobDataShow.map(item => item[field] || '--')
        );
      }
    },
    deleteJob(id) {
      this.socket.emit('delete', id);
      const index = this.jobData.findIndex(it => it.id === id);
      if (index > -1) this.jobData.splice(index, 1);
    },
    async downloadFile(file) {
      const fileUrl = await this.$api.Report.sign(file);
      if (fileUrl) window.open(fileUrl);
    }
  },
  destroyed() {
    this.socket.disconnect();
  }
};
</script>

<style scoped></style>
