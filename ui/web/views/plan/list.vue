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
      <div slot="header" class="clearfix">
        <span>医疗考核方案</span>
        <el-button
          style="float: right;margin:0 -9px;"
          type="primary"
          size="small"
          @click="
            $router.push({
              name: 'plan-add'
            })
          "
          >新建方案
        </el-button>
      </div>
      <el-table
        v-loading="$asyncComputed.serverData.updating"
        :data="tableData"
        empty-text="没有筛选到符合条件的数据"
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column
          width="50px"
          type="index"
          align="center"
          label="序号"
        ></el-table-column>
        <el-table-column prop="name" label="方案名称" align="center">
        </el-table-column>
        <el-table-column
          prop="idCard"
          label="考核员工"
          align="center"
        ></el-table-column>
        <el-table-column
          prop="hospitalName"
          label="负责项目"
          align="center"
        ></el-table-column
        ><el-table-column
          prop="hospitalName"
          label="分值"
          min-width="40"
          align="center"
        ></el-table-column
        ><el-table-column
          prop="hospitalName"
          label="操作"
          min-width="60"
          align="center"
        ></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'PlanList',
  data() {
    return {
      isInit: false
    };
  },
  computed: {
    tableData() {
      return [];
    }
  },
  created() {},
  asyncComputed: {
    serverData: {
      async get() {
        // return this.$api.Person.list();
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    }
  },
  methods: {}
};
</script>

<style lang="scss"></style>
