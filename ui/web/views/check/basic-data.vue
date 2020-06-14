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
        <span>基础数据</span>
      </div>
      <el-table
        stripe
        size="medium"
        @row-click="handleCellClick"
        :cell-class-name="cellClassHover"
        :data="tagList"
        border
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column align="center" width="50" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column label="公共卫生服务" prop="name"> </el-table-column>
      </el-table>
    </el-card>
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
.tags-title {
  cursor: pointer;
  :hover {
    color: #1a95d7;
  }
}
</style>
