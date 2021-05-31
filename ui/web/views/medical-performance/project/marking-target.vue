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
        :data="targetList"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column type="index" align="center" label="序号">
        </el-table-column>
        <el-table-column label="适配同方案所有员工">
          <template slot-scope="scope">
            <el-checkbox v-model="scope.row.all"></el-checkbox>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="指标"></el-table-column>
        <el-table-column prop="requirement" label="考核要求"></el-table-column>
        <el-table-column prop="baseScore" label="指标基础分"> </el-table-column>
        <el-table-column prop="score" label="指标得分">
          <template slot-scope="scope">
            <el-input-number
              v-model="scope.row.score"
              size="mini"
              :min="1"
              label="描述文字"
            ></el-input-number>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="考核说明">
          <template slot-scope="scope">
            <el-input
              v-model="scope.row.description"
              size="mini"
              placeholder="请输入内容"
            ></el-input>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'MarkingTarget',
  data() {
    return {
      query: {
        id: '',
        name: '',
        doctor: ''
      },
      targetList: [
        {
          all: false,
          target: '指标指标名称',
          requirement: '考核要求考核要求',
          baseScore: 20,
          score: 0,
          description: ''
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
