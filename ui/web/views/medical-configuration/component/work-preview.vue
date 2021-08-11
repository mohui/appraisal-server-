<template>
  <div>
    <el-form label-position="right">
      <el-row>
        <el-col :span="12">
          <el-form-item label="员工">
            <el-select v-model="staff" size="mini">
              <el-option
                v-for="staff of staffs"
                :key="staff.id"
                :value="staff.id"
                :label="staff.name"
              ></el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="时间">
            <el-date-picker
              v-model="date"
              size="mini"
              type="month"
              placeholder="选择月份"
            >
            </el-date-picker>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="工分详情">
            <el-table size="mini" border stripe :data="workData">
              <el-table-column
                label="工分项"
                align="center"
                prop="name"
              ></el-table-column>
              <el-table-column
                label="工作量"
                align="center"
                prop="score"
              ></el-table-column>
            </el-table>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <div
            style="display: flex;justify-content: space-between;align-items: center;float: right"
          >
            <div class="work-score">
              <span>工作量</span><el-tag>100</el-tag>
            </div>
            <i class="el-icon-close"></i>
            <div class="work-score">
              <span>单位得分</span><el-tag>1</el-tag>
            </div>
            =
            <div class="work-score">
              <span>预计总得分</span><el-tag>100</el-tag>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

<script>
export default {
  name: 'WorkPreview',
  props: {},
  data() {
    return {
      staff: '',
      workData: [
        {id: 'xzxc', name: '中药', score: 10},
        {id: 'xafas', name: '中3药', score: 10},
        {id: 'dwdasd', name: '中2药', score: 10},
        {id: 'asd3d', name: '中1药', score: 10}
      ],
      date: ''
    };
  },
  asyncComputed: {
    staffs: {
      async get() {
        try {
          return await this.$api.HisStaff.list();
        } catch (e) {
          this.$message.error(e.message);
          console.error(e.message);
          return [];
        }
      },
      default: []
    }
  }
};
</script>

<style scoped lang="scss">
.work-score {
  margin: 0 10px;
  span {
    margin: 0 5px;
  }
}
</style>
