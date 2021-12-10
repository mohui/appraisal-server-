<template>
  <div v-loading="$asyncComputed.workData.updating" class="preview-container">
    <el-form label-position="right">
      <el-row>
        <el-col :span="12">
          <el-form-item label="计算员工">
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
          <el-form-item label="计算时间">
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
      v-hidden-scroll
      :data="showWorkData"
      border
      class="work-config-table"
      size="mini"
    >
      <el-table-column align="center" label="员工" prop="staffName">
        <template slot="header" slot-scope="scope">
          {{ scope.row }}
          <el-input
            v-model="staffKey"
            size="mini"
            placeholder="员工关键字搜索"
          />
        </template>
        <template slot-scope="{row}">
          {{ row.staffName }}
          <el-tag :type="staffType(row.type)" size="mini">{{
            row.type
          }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column align="center" label="项目名" prop="itemName">
        <template slot="header" slot-scope="scope">
          {{ scope.row }}
          <el-input
            v-model="workKey"
            size="mini"
            placeholder="项目名关键字搜索"
          />
        </template>
      </el-table-column>
      <el-table-column align="center" label="值" prop="value"></el-table-column>
      <el-table-column align="center" label="时间" prop="date">
        <template slot-scope="{row}">
          {{ row.date.$format() }}
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-reset-scroll
      background
      :current-page="pageNo"
      :page-size="pageSize"
      :page-sizes="[50, 100, 200, 500]"
      layout="total, sizes, prev, pager, next"
      style="margin:5px 0 5px 10px"
      :total="dataTotal"
      @size-change="
        size => {
          pageSize = size;
          pageNo = 1;
        }
      "
      @current-change="
        no => {
          pageNo = no;
        }
      "
    >
    </el-pagination>
    <span>得分详情:</span>
    <el-table
      v-hidden-scroll
      class="gradient-table"
      height="250"
      size="mini"
      :data="gradientScore"
      border
      align="center"
    >
      <el-table-column align="center" type="index" label="梯度" width="80">
        <template slot-scope="{$index}">
          {{ `第${$index + 1}梯度` }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="梯度范围">
        <template slot-scope="{row}">
          <div>
            <span v-if="row.start === null">无穷小</span>
            <span v-else>{{ row.start }}</span>
            ~
            <span v-if="row.end === null">无穷大</span>
            <span v-else>{{ row.end }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="unit"
        align="center"
        label="单位得分"
      ></el-table-column>
      <el-table-column
        prop="num"
        align="center"
        label="该区间工作量"
      ></el-table-column>
      <el-table-column
        prop="total"
        align="center"
        label="该区间总得分"
      ></el-table-column>
    </el-table>
    <div class="preview-score">
      <div class="work-score">
        <span>总工作量</span><el-tag>{{ reduceResult.num }}</el-tag>
      </div>
      <div class="work-score">
        <span>预计总得分</span><el-tag>{{ reduceResult.total }}</el-tag>
      </div>
    </div>
  </div>
</template>

<script>
import {Decimal} from 'decimal.js';
import {PreviewType, HisWorkMethod} from '../../../../../common/his.ts';
import {strToPinyin} from '../../../utils/pinyin';
import {multistep} from '../../../../../common/his.ts';

export default {
  name: 'WorkPreview',
  props: {
    config: {
      type: Object,
      required: true
    }
  },
  computed: {
    showWorkData() {
      return this.workData
        .filter(
          data =>
            !this.workKey ||
            data.itemName.indexOf(this.workKey) > -1 ||
            data.itemPinyin.indexOf(this.workKey) > -1
        )
        .filter(
          data =>
            !this.staffKey ||
            data.staffName.indexOf(this.staffKey) > -1 ||
            data.staffPinyin.indexOf(this.staffKey) > -1
        )
        .slice((this.pageNo - 1) * this.pageSize, this.pageSize * this.pageNo);
    },
    dataTotal() {
      return this.workData
        .filter(
          data =>
            !this.workKey ||
            data.itemName.indexOf(this.workKey) > -1 ||
            data.itemPinyin.indexOf(this.workKey) > -1
        )
        .filter(
          data =>
            !this.staffKey ||
            data.staffName.indexOf(this.staffKey) > -1 ||
            data.staffPinyin.indexOf(this.staffKey) > -1
        ).length;
    },
    total() {
      if (this.config.method === HisWorkMethod.SUM)
        return this.workData
          .reduce((pre, next) => {
            pre = pre.add(new Decimal(Number(next.value)));
            return pre;
          }, new Decimal(0))
          .toNumber();
      if (this.config.method === HisWorkMethod.AMOUNT)
        return this.workData.length;
      return 0;
    },
    previewScore() {
      return new Decimal(this.total)
        .mul(new Decimal(this.config.score))
        .toNumber();
    },
    //梯度分计算
    gradientScore() {
      return multistep(this.config.gradient, this.total);
    },
    reduceResult() {
      const reduceResult = this.gradientScore.reduce(
        (pre, next) => {
          pre.total = Decimal.add(pre.total, next.total);
          pre.num = Decimal.add(pre.num, next.num);
          return pre;
        },
        {
          num: new Decimal(0),
          total: new Decimal(0)
        }
      );
      reduceResult.total = reduceResult.total.toNumber();
      reduceResult.num = reduceResult.num.toNumber();
      return reduceResult;
    }
  },
  data() {
    return {
      staff: '',
      date: this.$dayjs().toDate(),
      staffKey: '',
      workKey: '',
      pageSize: 100,
      pageNo: 1
    };
  },
  asyncComputed: {
    staffs: {
      async get() {
        try {
          const result = await this.$api.HisStaff.list();
          this.staff = result[0]?.id ?? '';
          return result;
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
          if (!this.staff) return [];
          if (!this.date) return [];

          const result = await this.$api.HisWorkItem.preview(
            this.config.work,
            this.config.scoreMethod,
            this.config.mappings.map(it => it.id),
            this.config.staffMethod,
            this.config.staffs.map(it => ({
              code: it.value,
              type: it.type
            })),
            this.config.score,
            this.config.scope || null,
            this.staff,
            this.$dayjs(this.date).toDate()
          );
          return this.addPinyin(result);
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
      if (type === PreviewType.HIS_STAFF) return 'warning';
      if (type === PreviewType.STAFF) return 'primary';
      if (type === PreviewType.HOSPITAL) return 'info';
    },
    addPinyin(arr) {
      arr = arr.map(it => ({
        ...it,
        itemPinyin: strToPinyin(it.itemName),
        staffPinyin: strToPinyin(it.staffName)
      }));
      for (let current of arr) {
        if (current?.children?.length > 0) {
          current.children = this.addPinyin(current.children);
        }
      }
      return arr;
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
  height: 60vh;
}
.preview-score {
  width: 60%;
  display: flex;
  align-items: center;
  float: right;
  margin: 5px 0 0 0;
}
</style>
<style lang="scss">
.gradient-table {
  flex: 1;
  margin: 5px 0;
  overflow-y: scroll;
  .gutter {
    display: none;
  }
}
.work-config-table {
  display: flex;
  flex-direction: column;
  flex: 2;

  .el-table__body-wrapper {
    flex: 1;
    overflow-y: scroll;
  }
}
</style>
