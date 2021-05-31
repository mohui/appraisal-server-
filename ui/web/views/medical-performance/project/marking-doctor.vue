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
        <span>{{ query.name }}</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          >确定
        </el-button>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          @click="
            $router.push({
              name: 'check-project'
            })
          "
          >返回
        </el-button>
      </div>
      <el-table
        stripe
        border
        size="small"
        :data="doctorList"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column type="index" align="center" label="序号">
        </el-table-column>
        <el-table-column prop="doctor" label="员工"></el-table-column>
        <el-table-column prop="workPoints" label="分配工分"></el-table-column>
        <el-table-column prop="workload" label="工作量">
          <template slot-scope="scope">
            <el-input-number
              v-model="scope.row.workload"
              size="mini"
              :min="1"
              label="描述文字"
            ></el-input-number>
          </template>
        </el-table-column>
        <el-table-column prop="scores" label="项目得分"> </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'MarkingDoctor',
  data() {
    return {
      query: {
        id: '',
        name: ''
      },
      doctorList: [
        {
          doctor: '赵医生',
          workPoints: 80,
          workload: 0,
          scores: 0
        }
      ]
    };
  },
  created() {
    this.query = this.$route.query;
  },
  methods: {}
};
</script>

<style scoped></style>
