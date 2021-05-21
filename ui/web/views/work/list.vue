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
        <span>医疗工作列表</span>
      </div>
      <el-form
        ref="ruleForm"
        :model="searchForm"
        label-width="100px"
        size="mini"
      >
        <el-row>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="周期：">
              <el-date-picker
                v-model="searchForm.month"
                type="month"
                placeholder="选择月"
                :picker-options="disabledDate"
              >
              </el-date-picker>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="员工姓名：">
              <el-input
                v-model="searchForm.name"
                size="mini"
                clearable
              ></el-input>
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
              <el-button type="primary" size="mini" @click="reset">
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
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column
          type="index"
          align="center"
          label="序号"
        ></el-table-column>
        <el-table-column prop="name" label="员工姓名" align="center">
        </el-table-column>
        <el-table-column
          prop="idCard"
          label="员工号"
          align="center"
        ></el-table-column>
        <el-table-column
          prop="hospitalName"
          label="项目"
          align="center"
        ></el-table-column
        ><el-table-column
          prop="hospitalName"
          label="项目编号"
          align="center"
        ></el-table-column
        ><el-table-column
          prop="hospitalName"
          label="时间"
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
      searchForm: {
        month: '',
        name: ''
      },
      disabledDate: {
        disabledDate(time) {
          return time.getTime() < new Date('2021-05-01');
        }
      }
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
  methods: {
    reset() {
      this.searchForm = {
        month: '',
        name: ''
      };
    }
  }
};
</script>

<style lang="scss"></style>
