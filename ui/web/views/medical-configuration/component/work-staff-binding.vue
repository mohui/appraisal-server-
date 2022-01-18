<template>
  <el-dialog
    v-hidden-scroll
    :title="`批量新增:${workItem.name}`"
    :visible.sync="visible"
    width="60%"
    :before-close="() => reset()"
  >
    <el-table
      v-hidden-scroll
      ref="staffBinding"
      class="binding-div"
      style="flex:1"
      :data="staffsByDepartment"
      border
      size="small"
      :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
      row-key="rowId"
      @select="(rows, row) => selectStaff(rows, row, !row.selected)"
      @select-all="selectAllStaff"
    >
      <el-table-column align="center" type="selection" width="55">
      </el-table-column>
      <el-table-column label="科室名" prop="departmentName"></el-table-column>
      <el-table-column
        align="center"
        label="姓名"
        prop="name"
      ></el-table-column>
      <el-table-column align="center" label="权重" prop="rate">
        <template slot-scope="{row}">
          <div v-if="row.selected">
            <el-input-number
              v-model="row.rate"
              :disabled="isDisabled(row)"
              size="mini"
            >
            </el-input-number>
            %
          </div></template
        >
      </el-table-column>
    </el-table>
    <div slot="footer" class="dialog-footer">
      <el-button size="mini" @click="reset()">取 消</el-button>
      <el-button
        v-loading="btnLoading"
        class="work-submit-loading"
        size="mini"
        type="primary"
        @click="submit()"
      >
        确 定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
export default {
  name: 'WorkStaffBinding',
  data() {
    return {
      btnLoading: false,
      selectAll: false
    };
  },
  computed: {
    //员工按部门分类
    staffsByDepartment() {
      const bindedStaff = this.workItem.subs;
      if (this.memberList.length === 0) return [];
      return this.memberList
        .map(it => {
          let bindInfo;
          if (bindedStaff)
            bindInfo = bindedStaff.find(bind => bind.staff === it.id);
          return {
            //rowId作为列表行的key值,员工用员工id作为rowId
            rowId: it.id,
            id: it.id,
            department: it.department,
            departmentName: it.departmentName,
            name: it.name,
            rate: bindInfo?.rate ?? 0,
            selected: bindInfo?.rate ?? 0 > 0
          };
        })
        .reduce((p, n) => {
          //没有科室的单独放置
          if (n.department === null) {
            p.push(n);
            return p;
          }
          //有科室的员工进行集合
          const current = p.find(it => it.rowId === n.department);
          if (current)
            current.children.push({
              ...n,
              departmentName: ''
            });
          if (!current) {
            p.push({
              //rowId作为列表行的key值,部门用部门id作为rowId
              rowId: n.department,
              departmentName: n.departmentName,
              rate: 0,
              selected: false,
              children: [{...n, departmentName: ''}]
            });
          }
          return p;
        }, [])
        .sort(a => (a.id ? 0 : 1))
        .map(it => ({...it, hasChildren: !!it.department}));
    }
  },
  props: {
    visible: {
      type: Boolean,
      required: true,
      default: false
    },
    workItem: {
      type: Object,
      required: true
    },
    memberList: {
      default: []
    }
  },
  watch: {
    workItem: {
      handler: function(newVal) {
        if (newVal?.subs) {
          newVal.subs
            .map(it => {
              let current = '';
              for (let i = 0; i < this.staffsByDepartment.length; i++) {
                const row = this.staffsByDepartment[i];
                if (row.children) {
                  for (let j = 0; j < row.children.length; j++) {
                    if (row.children[j].id === it.staff) {
                      current = row.children[j];
                      break;
                    }
                  }
                }
                if (!row.children && row.rowId === it.staff) {
                  current = row;
                  break;
                }
              }
              if (current) return current;
            })
            .forEach(it => {
              this.$nextTick(() => {
                this.selectStaff(null, it, true);
              });
            });
        }
      },
      deep: true
    }
  },
  methods: {
    reset() {
      this.$parent.resetBatchDialog();
      this.$refs.staffBinding.clearSelection();
      this.selectedData = [];
      this.staffsByDepartment.forEach(it => {
        //数据的重置工作
        it.selected = false;
        if (!it.children) {
          it.rate = 0;
          it.selected = false;
        }
        if (it.children) {
          it.children.forEach(c => {
            c.rate = 0;
            c.selected = false;
          });
        }
        //取消所有的勾选状态
        this.$refs.staffBinding.toggleRowExpansion(it, false);
      });
    },
    selectStaff(selectedRows, row, checked) {
      const expandRow = this.staffsByDepartment.find(
        it => it.rowId === row.department
      );

      if (expandRow) {
        this.$nextTick(() => {
          //默认展开被选中员工所在的科室父级
          this.$refs.staffBinding.toggleRowExpansion(expandRow, true);
        });
      }
      row.selected = checked;
      this.$refs.staffBinding.toggleRowSelection(row, row.selected);

      if (row.children) {
        row.children.forEach(e => {
          this.$nextTick(() => {
            e.selected = checked;
            this.$refs.staffBinding.toggleRowSelection(e, e.selected);
          });
        });
      }
    },
    selectAllStaff() {
      this.selectAll = !this.selectAll;
      this.staffsByDepartment.forEach(row => {
        this.selectStaff(null, row, this.selectAll);
      });
    },
    //检查是否禁用
    isDisabled(row) {
      if (!row.children) {
        const parent = this.staffsByDepartment.find(
          it => it.id === row.department
        );
        if (parent && parent.rate > 0) {
          parent.children.forEach(it => (it.rate = parent.rate));
          return parent.rate > 0;
        }
        return false;
      }
    },
    async submit() {
      try {
        this.btnLoading = true;
        const selectedData = this.staffsByDepartment.reduce((p, n) => {
          if (!n.children && n.selected)
            p.push({
              id: null,
              item: this.workItem.id,
              staff: n.id,
              rate: n.rate / 100
            });
          if (n.children) {
            n.children.forEach(c => {
              if (c.selected)
                p.push({
                  id: null,
                  item: this.workItem.id,
                  staff: c.id,
                  rate: c.rate / 100
                });
            });
          }
          return p;
        }, []);
        const emptyRate = selectedData.find(it => it.rate === 0);
        if (emptyRate) {
          this.$message.error('权重配置必须大于0');
          return;
        }
        try {
          await this.$api.HisWorkItem.batchUpsertStaffWorkItemMapping(
            selectedData
          );
          this.$message.success('新增成功');
          this.$parent.$asyncComputed.serverData.update();
          this.updateLoading = false;
          this.reset();
        } catch (e) {
          this.$message.error(e.message);
        }
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.btnLoading = false;
      }
    }
  }
};
</script>

<style lang="scss">
.binding-div {
  height: 60vh;
  display: flex;
  flex-direction: column;
  .el-table__body-wrapper {
    flex: 1;
    overflow-y: scroll;
  }
}
</style>
