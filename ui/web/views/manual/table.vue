<template>
  <div v-loading="$asyncComputed.tableList.updating" class="flex-column-layout">
    <div class="jx-header">
      <div>
        <span class="header-title">手工数据维护 — — 表格输入</span>
        <el-date-picker
          v-model="query.month"
          style="margin: 0 20px"
          size="mini"
          type="month"
          placeholder="选择月"
          :clearable="false"
        >
        </el-date-picker>
      </div>
      <div>
        <el-button
          style="margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="exportManual"
          >导出
        </el-button>
        <el-button
          style="margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="remarkDialogVisible = true"
          >备注
        </el-button>
        <el-button
          style="margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="saveManual"
          >保存
        </el-button>
        <el-button
          style="margin: -4px 0 0 20px;"
          size="small"
          plain
          @click="
            $router.push({
              name: 'manual'
            })
          "
          >返回
        </el-button>
      </div>
    </div>
    <div style="flex-grow: 1;height: 100%;">
      <vxe-table
        v-hidden-scroll
        border
        stripe
        show-footer
        :footer-span-method="footerRowspanMethod"
        :footer-method="footerMethod"
        :data="list"
        :mouse-config="{selected: true}"
        :keyboard-config="{
          isArrow: true,
          isDel: true,
          isEnter: true,
          isTab: true,
          isEdit: true,
          isChecked: true
        }"
        :edit-config="{trigger: 'click', mode: 'cell', showIcon: false}"
        :max-height="this.remark ? '86%' : '96%'"
      >
        <vxe-column
          type="seq"
          title="序号"
          width="70"
          fixed="left"
        ></vxe-column>
        <vxe-column field="name" title="医生姓名" min-width="80"> </vxe-column>
        <vxe-column
          v-for="(field, index) of manualList"
          :key="index"
          :title="field.name"
          min-width="80"
          :edit-render="{autofocus: '.vxe-input--inner'}"
        >
          <template #default="{ row }">
            <span v-if="!editable">{{ row.item[field.id].value }}</span>
            <el-tooltip
              v-else
              effect="dark"
              content="已结算"
              placement="top-start"
            >
              <i class="el-icon-s-claim manual-settle"></i>
            </el-tooltip>
          </template>
          <template #edit="{ row }">
            <vxe-input
              v-model="row.item[field.id].value"
              type="number"
              :disabled="editable"
              size="mini"
              placeholder="请输入数值"
              @blur="updateManual(row.item[field.id])"
              @mousewheel.native.capture.passive.stop
            ></vxe-input>
          </template>
        </vxe-column>
      </vxe-table>
    </div>
    <el-dialog title="备注" center :visible.sync="remarkDialogVisible">
      <el-input
        v-model="remark"
        type="textarea"
        size="medium"
        rows="6"
      ></el-input>
      <div style="text-align: right; margin: 30px 30px 0;">
        <el-button size="mini" type="text" @click="remarkDialogVisible = false"
          >取消
        </el-button>
        <el-button type="primary" size="mini" @click="saveRemark"
          >确定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Vxe-table',
  data() {
    return {
      remarkDialogVisible: false,
      remark: '',
      query: {
        month: new Date()
      },
      editable: false
    };
  },
  computed: {
    // 初始工分项列表
    list() {
      if (!this.tableList) return;
      const {manuals, staffs, details} = this.tableList;

      return staffs?.map(it => ({
        ...it,
        item: Object.assign(
          {},
          ...manuals?.map(ii => {
            const value = details?.find(
              i => i.staff === it.id && i.id === ii.id
            )?.score;
            return {
              [ii.id]: {
                value: value || null,
                edit: false,
                update: false,
                original: value || null
              }
            };
          })
        )
      }));
    },
    manualList() {
      if (!this.tableList) return;
      return this.tableList.manuals;
    }
  },
  asyncComputed: {
    //获取手工工分项列表
    tableList: {
      async get() {
        try {
          const month = this.query.month;
          const result = await this.$api.HisManualData.tableList(month);
          this.editable = result.settle;
          this.remark = result.remark;
          return result;
        } catch (e) {
          console.error(e.message);
        }
      }
    }
  },
  methods: {
    // 导出
    async exportManual() {
      try {
        await this.$api.HisManualData.excelBuffer(this.query.month);
        this.$message.success('导出成功!');
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    // 保存备注
    async saveRemark() {
      this.remarkDialogVisible = false;
      try {
        await this.$api.HisManualData.upsertRemark(
          this.query.month,
          this.remark
        );
        this.$asyncComputed.tableList.update();
        this.$message.success('保存成功!');
      } catch (e) {
        console.error(e.message);
      }
    },
    footerMethod({columns}) {
      const footerData = [
        columns.map((column, _columnIndex) => {
          if (_columnIndex === 0) {
            return '备注';
          }
          if (['name'].includes(column.property)) {
            return this.remark;
          }
          return null;
        })
      ];
      return footerData;
    },
    footerRowspanMethod({_rowIndex, _columnIndex}) {
      if (_rowIndex === 0) {
        if (_columnIndex === 1) {
          return {rowspan: 1, colspan: 1 + this.manualList.length};
        }
      }
    },
    // 更新状态
    updateManual(row) {
      if (row.original !== row.value) row.update = true;
    },
    //保存数据
    async saveManual() {
      try {
        const arr = this.list
          .map(it => {
            return Object.keys(it.item)
              .filter(i => it.item[i].value !== null && it.item[i].update)
              .map(i => ({
                staff: it.id,
                id: i,
                value: +it.item[i].value,
                date: this.query.month
              }));
          })
          .flat();

        if (!arr.length) {
          this.$message.warning('请修改后再保存！');
          return;
        }
        await this.$api.HisManualData.setAllData(arr);
        this.$asyncComputed.tableList.update();
        this.$message.success('保存成功!');
      } catch (e) {
        this.$message.error(e.message);
      }
    }
  }
};
</script>

<style scoped>
::v-deep .vxe-table--render-default .vxe-body--row.row--stripe {
  background-color: #d4dcf0;
}
::v-deep .vxe-footer--row .vxe-cell {
  height: 70px;
  width: 800px;
  overflow-y: auto;
}
::v-deep .vxe-footer--row td[colspan] ~ td {
  display: none;
}
</style>
