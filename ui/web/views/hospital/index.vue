<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 120px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>金额列表</span>
        <!--年度选择-->
        <span style="margin: 0 10px">
          <el-select
            v-model="year"
            placeholder="请选择考核年度"
            @change="handleYearChange(year)"
          >
            <el-option
              v-for="item in yearList"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
            </el-option>
          </el-select>
        </span>
      </div>
      <el-table
        v-loading="$asyncComputed.hospitalListServerData.updating"
        size="mini"
        border
        :data="hospitalListData"
        height="100%"
        style="flex-grow: 1;"
        row-key="uuid"
        lazy
        :load="load"
        :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
        :header-cell-style="{
          background: '#F3F4F7',
          color: '#555',
          textAlign: 'center'
        }"
        @row-click="handleCellClick"
        :cell-class-name="cellClassHover"
      >
        <el-table-column align="center" label="序号" width="160px" prop="uuid">
        </el-table-column>
        <el-table-column align="center" label="名称" prop="name">
        </el-table-column>
        <el-table-column
          align="center"
          label="校正后总工分值"
          prop="correctWorkPointFormat"
        >
        </el-table-column>
        <el-table-column align="center" label="质量系数" prop="rateFormat">
        </el-table-column>
        <el-table-column align="center" label="金额" prop="budgetFormat">
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'hospital',
  data() {
    return {
      year: '2020',
      yearList: [
        {value: '2020', label: '2020年度'},
        {value: '2021', label: '2021年度'}
      ]
    };
  },
  computed: {
    hospitalListData() {
      const currentData = this.hospitalListServerData;
      return currentData
        .sort((a, b) => b.budget - a.budget) //根据金额排序
        .map((item, index) => {
          //添加格式化数据
          item.correctWorkPointFormat = Math.round(item.correctWorkPoint);
          item.rateFormat = (item.rate * 100).toFixed(2) + '%';
          item.budgetFormat = item.budget.toFixed(2);
          item.uuid = index + 1;
          return item;
        });
    }
  },
  asyncComputed: {
    hospitalListServerData: {
      async get() {
        let code = this.$settings.user.region.code;
        return await Promise.all(
          (await this.$api.SystemArea.rank(code, this.year)).map(async item => {
            item.hasChildren =
              (await this.$api.SystemArea.rank(item.code, this.year)).length >
              0;
            return item;
          })
        );
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    async load(tree, treeNode, resolve) {
      let result = await Promise.all(
        (await this.$api.SystemArea.rank(tree.code, this.year))
          //根据金额排序
          .sort((a, b) => b.budget - a.budget)
          .map(async (item, index) => {
            item.correctWorkPointFormat = Math.round(item.correctWorkPoint);
            item.rateFormat = (item.rate * 100).toFixed(2) + '%';
            item.budgetFormat = item.budget.toFixed(2);
            item.uuid = `${tree.uuid}-${index + 1}`;
            item.hasChildren =
              item.code !== tree.code &&
              (await this.$api.SystemArea.rank(item.code, this.year)).length >
                0;
            return item;
          })
      );
      resolve(result);
    },
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'hospital-name';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name') {
        return this.$router.push({
          name: 'appraisal-result-institutions',
          query: {
            id: row.code,
            listFlag: 'quality',
            isInstitution: row.level === 3 ? 'false' : 'true'
          }
        });
      }
    },
    //年度选择
    handleYearChange(value) {
      console.log(value);
      this.year = value;
    }
  }
};
</script>

<style lang="scss">
.hospital-name {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}
</style>
