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
      <el-table
        :data="tableData"
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column prop="name" label="姓名"></el-table-column>
        <el-table-column prop="idCard" label="身份证"></el-table-column>
        <el-table-column prop="hospitalName" label="管理机构"></el-table-column>
        <el-table-column label="标记">
          <template slot-scope="scope">
            <el-tag :key="tag" v-for="tag of scope.row.tags">{{ tag }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'PersonList',
  computed: {
    tableData() {
      return this.serverData.rows.map(it => {
        it.tags = [];
        if (it?.S03) it.tags.push('动态使用');
        if (it?.S23) it.tags.push('档案规范');
        return it;
      });
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        return this.$api.Person.list(20, 1);
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    }
  }
};
</script>

<style scoped></style>
