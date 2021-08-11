<template>
  <div>
    <el-form label-position="right">
      <el-row>
        <el-col :span="12">
          <el-form-item label="员工">
            <el-select v-model="staff" filterable size="mini">
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
                label="员工"
                align="center"
                prop="staffName"
              ></el-table-column>
              <el-table-column
                label="项目名"
                align="center"
                prop="itemName"
              ></el-table-column>
              <el-table-column
                label="值"
                align="center"
                prop="value"
              ></el-table-column>
              <el-table-column label="时间" align="center" prop="date">
                <template slot-scope="{row}">
                  {{ row.date.toString() }}
                </template>
              </el-table-column>
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
  props: {
    config: {
      type: Object,
      required: true
    }
  },
  created() {},
  data() {
    return {
      staff: '',

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
    },
    workData: {
      async get() {
        try {
          console.log(this.config);

          if (!this.staff) return [];
          if (!this.date) return [];

          return await this.$api.HisWorkItem.preview(
            this.config.work,
            this.config.scoreMethod,
            this.config.projectsSelected.map(it => it.id),
            this.config.staffMethod,
            this.config.score,
            this.config.staffs,
            this.config.scope,
            this.staff,
            this.$dayjs(this.date).toDate()
          );
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
