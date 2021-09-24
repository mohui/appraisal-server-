<template>
  <div class="flex-column-layout">
    <div class="jx-header">
      <span class="header-title">基础数据</span>
    </div>
    <el-table
      v-hidden-scroll
      :cell-class-name="cellClassHover"
      :data="tagList"
      height="100%"
      style="flex-grow: 1;"
      @row-click="handleCellClick"
    >
      <el-table-column align="center" width="50" label="序号">
        <template slot-scope="scope">
          {{ scope.$index + 1 }}
        </template>
      </el-table-column>
      <el-table-column label="公共卫生服务" prop="name"> </el-table-column>
    </el-table>
  </div>
</template>

<script>
import {BasicTags} from '../../../../common/rule-score.ts';
export default {
  name: 'basicData',
  data() {
    return {
      tagList: BasicTags
    };
  },
  methods: {
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'tags-title';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name')
        return this.$router.push({
          name: 'basic-data-detail',
          query: {
            code: row.code,
            name: row.name
          }
        });
    }
  }
};
</script>

<style lang="scss">
@import '../../styles/vars';
.tags-title {
  cursor: pointer;
  :hover {
    color: $color-primary;
  }
}
</style>
