<template>
  <div v-loading="$asyncComputed.workData.updating" class="preview-container">
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
      </el-row>
    </el-form>
    <el-table
      :data="workData"
      border
      class="work-config-table"
      size="mini"
      stripe
    >
      <el-table-column align="center" label="员工" prop="staffName">
        <template slot-scope="{row}">
          {{ row.staffName }}
          <el-tag :type="staffType(row.type)" size="mini">{{
            row.type
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column
        align="center"
        label="项目名"
        prop="itemName"
      ></el-table-column>
      <el-table-column align="center" label="值" prop="value"></el-table-column>
      <el-table-column align="center" label="时间" prop="date">
        <template slot-scope="{row}">
          {{ row.date.$format() }}
        </template>
      </el-table-column>
    </el-table>
    <div class="preview-score">
      <div class="work-score">
        <span>工作量</span><el-tag>{{ total }}</el-tag>
      </div>
      <i class="el-icon-close"></i>
      <div class="work-score">
        <span>单位得分</span><el-tag>{{ config.score }}</el-tag>
      </div>
      =
      <div class="work-score">
        <span>预计总得分</span><el-tag>{{ previewScore }}</el-tag>
      </div>
    </div>
  </div>
</template>

<script>
import {Decimal} from 'decimal.js';
import {previewType} from '../../../../../common/his.ts';
export default {
  name: 'WorkPreview',
  props: {
    config: {
      type: Object,
      required: true
    }
  },
  computed: {
    total() {
      return this.workData
        .reduce((pre, next) => {
          pre = pre.add(new Decimal(Number(next.value)));
          return pre;
        }, new Decimal(0))
        .toNumber();
    },
    previewScore() {
      return new Decimal(this.total)
        .mul(new Decimal(this.config.score))
        .toNumber();
    }
  },
  data() {
    return {
      staff: '',
      date: this.$dayjs().toDate()
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
  },
  methods: {
    staffType(type) {
      if (type === previewType.HIS_STAFF) return 'warning';
      if (type === previewType.STAFF) return 'primary';
      if (type === previewType.HOSPITAL) return 'info';
    }
  }
};
</script>

<style lang="scss" scoped>
.work-score {
  margin: 0 10px;
  span {
    margin: 0 5px;
  }
}
.preview-container {
  display: flex;
  flex-direction: column;
  height: 50vh;
}
.preview-score {
  width: 60%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  float: right;
  margin: 20px 0;
}
</style>
<style lang="scss">
.work-config-table {
  display: flex;
  flex-direction: column;

  .el-table__body-wrapper {
    flex: 1;
    overflow-y: scroll;
  }
}
</style>
