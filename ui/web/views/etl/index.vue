<template>
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
    <div slot="header" class="clearfix">
      <span>机构列表</span>
    </div>
    <el-table
      :data="list"
      border
      height="100%"
      style="flex-grow: 1"
      size="small"
    >
      <el-table-column prop="index" label="序号" width="50px"></el-table-column>
      <el-table-column prop="name" label="名称"></el-table-column>
      <el-table-column label="操作" width="200px">
        <template slot-scope="{row}">
          <el-button
            :loading="row.running"
            type="primary"
            size="mini"
            @click="sync(row.id)"
            >同步</el-button
          >
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script>
export default {
  name: 'HospitalETL',
  data() {
    return {};
  },
  computed: {
    list() {
      return this.serverData.map((it, index) => {
        return {
          ...it,
          index
        };
      });
    }
  },
  methods: {
    sync(id) {
      this.$api.ETL.run(id);
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        return this.$api.ETL.list();
      },
      default() {
        return [];
      }
    }
  }
};
</script>

<style scoped></style>
