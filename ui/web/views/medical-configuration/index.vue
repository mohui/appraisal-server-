<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: $settings.isMobile ? 'calc(100% - 80px)' : 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0 0' : '20px'
      }"
    >
      <div slot="header" class="header">
        <span>工作量管理</span>
      </div>
      <kn-collapse
        :is-show="$settings.isMobile"
        :is-collapsed="isCollapsed"
        @toggle="is => (isCollapsed = is)"
      >
        <el-form
          ref="ruleForm"
          :model="searchForm"
          label-width="100px"
          size="mini"
        >
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="维度">
              <el-button-group>
                <el-button
                  :type="
                    currentTarget === HisWorkScoreType.WORK_ITEM
                      ? 'primary'
                      : 'default'
                  "
                  size="mini"
                  @click="currentTarget = HisWorkScoreType.WORK_ITEM"
                >
                  工作
                </el-button>
                <el-button
                  :type="
                    currentTarget === HisWorkScoreType.STAFF
                      ? 'primary'
                      : 'default'
                  "
                  size="mini"
                  @click="currentTarget = HisWorkScoreType.STAFF"
                >
                  员工
                </el-button>
              </el-button-group>
            </el-form-item>
          </el-col>
        </el-form>
      </kn-collapse>
      <el-collapse v-model="activeCollapse">
        <el-collapse-item
          v-for="data of tableData"
          :key="data.id"
          :name="data.id"
        >
          <template slot="title">
            <div
              style="display: flex;justify-content: space-between;width: 100%"
            >
              <div>{{ data.index }} {{ data.name }}</div>
              <div style="margin-right: 30px">
                <el-tooltip
                  v-show="!data.batchEditing"
                  content="新增"
                  :enterable="false"
                >
                  <el-button
                    type="success"
                    icon="el-icon-plus"
                    circle
                    size="mini"
                    @click.native.stop="addRow(data)"
                  >
                  </el-button>
                </el-tooltip>
                <el-tooltip
                  v-show="!data.batchEditing"
                  content="批量编辑"
                  :enterable="false"
                >
                  <el-button
                    type="primary"
                    icon="el-icon-edit-outline"
                    circle
                    size="mini"
                    @click.native.stop="batchEdit(data)"
                  >
                  </el-button>
                </el-tooltip>
                <el-tooltip
                  v-show="!data.batchEditing"
                  content="批量删除"
                  :enterable="false"
                >
                  <el-button
                    type="danger"
                    :icon="
                      removeLoading
                        ? 'el-icon-loading'
                        : 'el-icon-document-delete'
                    "
                    :disabled="removeLoading"
                    circle
                    size="mini"
                    @click.native.stop="batchRemove(data)"
                  >
                  </el-button>
                </el-tooltip>
                <el-tooltip
                  v-show="data.batchEditing"
                  content="提交批量修改"
                  :enterable="false"
                >
                  <el-button
                    type="success"
                    :icon="updateLoading ? 'el-icon-loading' : 'el-icon-check'"
                    circle
                    size="mini"
                    @click.native.stop="submitBatchEdit(data)"
                  >
                  </el-button>
                </el-tooltip>
                <el-tooltip
                  v-show="data.batchEditing"
                  content="取消修改"
                  :enterable="false"
                >
                  <el-button
                    type="default"
                    icon="el-icon-close"
                    circle
                    size="mini"
                    @click.native.stop="cancelEdit(data)"
                  >
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </template>
          <el-table
            v-loading="$asyncComputed.serverData.updating"
            stripe
            border
            size="small"
            :data="data.subs"
            current-row-key="id"
            :header-cell-style="{background: '#F3F4F7', color: '#555'}"
          >
            <el-table-column
              align="center"
              prop="staffName"
              :label="
                currentTarget === HisWorkScoreType.WORK_ITEM ? '员工' : '工分项'
              "
            >
              <template slot-scope="{row}">
                <div
                  v-if="
                    !row.staffId &&
                      currentTarget === HisWorkScoreType.WORK_ITEM &&
                      !row.noConfig
                  "
                >
                  <el-select
                    v-model="tempRow.staffId"
                    clearable
                    filterable
                    size="mini"
                  >
                    <el-option
                      v-for="m in memberList"
                      :key="m.id"
                      :label="m.name"
                      :value="m.id"
                    ></el-option>
                  </el-select>
                </div>
                <div
                  v-else-if="
                    !row.itemId &&
                      currentTarget === HisWorkScoreType.STAFF &&
                      !row.noConfig
                  "
                >
                  <el-select
                    v-model="tempRow.item"
                    clearable
                    filterable
                    size="mini"
                  >
                    <el-option
                      v-for="m in workList"
                      :key="m.id"
                      :label="m.name"
                      :value="m.id"
                    ></el-option>
                  </el-select>
                </div>
                <div v-else>{{ row.staffName || '没有配置' }}</div>
              </template>
            </el-table-column>
            <el-table-column align="center" prop="rate" label="权重">
              <template slot-scope="{row}">
                <div v-if="row.isEdit">
                  <el-input-number v-model="tempRow.rate" size="mini">
                  </el-input-number>
                  %
                </div>
                <div
                  v-else-if="
                    row.id === tempRow.id && tableData.some(d => d.batchEditing)
                  "
                >
                  <el-input-number disabled v-model="tempRow.rate" size="mini">
                  </el-input-number>
                  %
                </div>
                <div v-else-if="!row.isEdit && !row.noConfig">
                  {{ row.rate }} %
                </div>
              </template>
            </el-table-column>
            <el-table-column align="center" prop="operation" label="操作">
              <template slot-scope="{row}">
                <div v-show="!row.batchEditing">
                  <el-tooltip
                    v-show="!row.isEdit && !row.noConfig"
                    content="编辑"
                    :enterable="false"
                  >
                    <el-button
                      type="primary"
                      icon="el-icon-edit"
                      circle
                      size="mini"
                      @click="editRow(row)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-show="row.isEdit"
                    content="提交修改"
                    :enterable="false"
                  >
                    <el-button
                      type="success"
                      :icon="
                        updateLoading ? 'el-icon-loading' : 'el-icon-check'
                      "
                      circle
                      size="mini"
                      @click="submitEdit(row)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-show="row.isEdit"
                    content="取消修改"
                    :enterable="false"
                  >
                    <el-button
                      type="default"
                      icon="el-icon-close"
                      circle
                      size="mini"
                      @click="cancelEdit(row)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-show="!row.isEdit && !row.noConfig"
                    content="删除"
                    :enterable="false"
                  >
                    <el-button
                      type="danger"
                      :icon="
                        row.removeLoading ? 'el-icon-loading' : 'el-icon-delete'
                      "
                      :disabled="row.removeLoading"
                      circle
                      size="mini"
                      @click="removeRow(row)"
                    >
                    </el-button>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';
import {HisWorkMethod, HisWorkScoreType} from '../../../../common/his.ts';

export default {
  name: 'Configuration',
  data() {
    return {
      isCollapsed: !!this.$settings.isMobile,
      permission: Permission,
      searchForm: {
        scoreType: '',
        score: '',
        work: '',
        pageSize: 20,
        pageNo: 1
      },
      tempRow: '',
      HisWorkMethod: Object.keys(HisWorkMethod).map(it => ({
        value: HisWorkMethod[it],
        key: it
      })),
      HisWorkScoreType: HisWorkScoreType,
      updateLoading: false,
      removeLoading: false,
      currentTarget: HisWorkScoreType.WORK_ITEM, //默认以工作量维度
      activeCollapse: []
    };
  },
  computed: {
    tableData() {
      let data = [];
      //以工作量为维度
      if (this.currentTarget === HisWorkScoreType.WORK_ITEM) {
        data = this.serverData.workItems.map(it => {
          //找出每个工作量绑定的员工
          const bindStaffs = this.serverData.mappings
            .filter(map => map.item === it.id)
            .map(item => ({
              ...item,
              name: this.serverData.staffs.find(
                staff => staff.id === item.staff
              )?.name //员工名字
            }));
          return {...it, subs: bindStaffs};
        });
      }
      //以员工为维度
      if (this.currentTarget === HisWorkScoreType.STAFF) {
        data = this.serverData.staffs.map(it => {
          //找出每个员工所绑定的工作量
          const bindItems = this.serverData.mappings
            .filter(map => map.staff === it.id)
            .map(item => ({
              ...item,
              name: this.serverData.workItems.find(
                work => work.id === item.item
              )?.name //工分名称
            }));
          return {...it, subs: bindItems};
        });
      }
      //每条绑定的数据
      data.forEach(data => {
        if (data.subs.length > 0)
          data.subs.forEach(row => {
            row.mappingId = row.id;
            row.staffId = row.staff; //工分项维度时用到的员工变量
            row.staffName = row.name; //工分项维度时用到的员工变量
            row.itemId = row.item; //员工维度时用到的工分变量
            row.itemName = row.name; //员工维度时用到的工分名变量
            row.rate = row.rate * 100;
          });
        else data.noConfig = true;
      });
      return data.map((d, index) => ({
        index: index + 1,
        ...d,
        isEdit: !d.mappingId && !d.noConfig,
        removeLoading: false,
        batchEditing: false
      }));
    },
    workList() {
      return this.serverWorkData;
    },
    memberList() {
      return this.serverMemberData;
    },
    //表格合并方法
    spanArr() {
      let arr = [];
      let pos = 0;
      for (let i = 0; i < this.tableData.length; i++) {
        if (i === 0) {
          arr.push(1);
          pos = 0;
        } else {
          // 判断当前元素与上一个元素是否相同
          if (this.tableData[i].id === this.tableData[i - 1].id) {
            arr[pos] += 1;
            arr.push(0);
          } else {
            arr.push(1);
            pos = i;
          }
        }
      }
      return arr;
    }
  },
  watch: {
    currentTarget() {
      this.tempRow = ''; //切换维度时重置临时变量
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        let data = [];
        const {scoreType, work} = this.searchForm;
        try {
          data = await this.$api.HisWorkItem.selStaffWorkItemMapping(
            scoreType || undefined,
            work || undefined
          );
          return data;
        } catch (e) {
          this.$message.error(e.message);
          console.error(e.message);
          return {counts: 0, rows: []};
        }
      },
      default: {
        mappings: [],
        staffs: [],
        workItems: []
      }
    },
    serverWorkData: {
      async get() {
        try {
          return await this.$api.HisWorkItem.list();
        } catch (e) {
          this.$message.error(e.message);
          console.error(e.message);
          return [];
        }
      },
      default: []
    },
    serverMemberData: {
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
  },
  methods: {
    addRow(row) {
      if (this.tempRow) {
        this.$message.warning('已有其他数据正在编辑');
        return;
      }
      //添加时这一行自动展开
      if (!this.activeCollapse.includes(row.id))
        this.activeCollapse.push(row.id);
      //新增一项没有mappingId的数据
      let addRow = {
        id: '',
        item: '',
        staffId: '',
        rate: 0,
        isEdit: true
      };
      this.tempRow = JSON.parse(JSON.stringify(addRow));

      //工分项绑定新的员工,工分项id是固定的
      if (this.currentTarget === HisWorkScoreType.WORK_ITEM)
        addRow.item = row.id;

      //员工绑定新的工分项,员工id是固定的
      if (this.currentTarget === HisWorkScoreType.STAFF) addRow.staff = row.id;

      //新增一个以当前维度为主id的临时数据进去
      this.serverData.mappings.push(addRow);
    },
    editRow(row) {
      if (this.tempRow) {
        this.$message.warning('已有其他数据正在编辑');
        return;
      }
      row.isEdit = !row.isEdit;
      this.tempRow = JSON.parse(JSON.stringify(row));
    },
    cancelEdit(row) {
      if (!row.mappingId) {
        //新增时取消了,撤回新添进去的临时数据
        this.serverData.mappings.splice(this.serverData.mappings.length - 1, 1);
      }
      row.isEdit = !row.isEdit;
      row.batchEditing = false;
      this.tempRow = '';
    },
    async submitEdit(row) {
      this.updateLoading = true;
      try {
        await this.$api.HisWorkItem.upsertStaffWorkItemMapping({
          id: row.mappingId || null,
          item: row.itemId || this.tempRow.item,
          staff: row.staffId || this.tempRow.staffId,
          rate: this.tempRow.rate / 100
        });
        this.$message.success('修改成功');
        row.isEdit = !row.isEdit;
        await this.$asyncComputed.serverData.update();
        this.tempRow = '';
      } catch (e) {
        console.log(e);
        this.$message.error(e);
      } finally {
        this.updateLoading = false;
      }
    },
    async submitBatchEdit(row) {
      this.updateLoading = true;
      try {
        let editArr = [];
        //以工分项维度
        if (this.currentTarget === HisWorkScoreType.WORK_ITEM)
          editArr = this.serverData.mappings.filter(
            it => it.item === row.itemId
          );

        //以员工的维度
        if (this.currentTarget === HisWorkScoreType.STAFF)
          editArr = this.serverData.mappings.filter(
            it => it.staff === row.staffId
          );
        if (editArr.length === 0) {
          this.$message.info('没有可编辑项');
          return;
        }
        for (const current of editArr) {
          await this.$api.HisWorkItem.upsertStaffWorkItemMapping({
            id: current.id || null,
            item: current.item,
            staff: current.staff,
            rate: this.tempRow.rate / 100
          });
        }

        this.$message.success('修改成功');
        row.isEdit = !row.isEdit;
        row.batchEditing = false;
        await this.$asyncComputed.serverData.update();
        this.tempRow = '';
      } catch (e) {
        console.log(e);
        this.$message.error(e);
      } finally {
        this.updateLoading = false;
      }
    },
    async removeRow(row) {
      try {
        await this.$confirm('确定删除该配置?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        row.removeLoading = true;
        await this.$api.HisWorkItem.delStaffWorkItemMapping(row.mappingId);
        this.$message.success('删除成功');
        this.$asyncComputed.serverData.update();
      } catch (e) {
        console.log(e);
      } finally {
        row.removeLoading = false;
      }
    },
    batchEdit(row) {
      if (this.tempRow) {
        this.$message.warning('已有其他数据正在编辑');
        return;
      }
      row.isEdit = !row.isEdit;
      row.batchEditing = !row.batchEditing;
      this.tempRow = JSON.parse(JSON.stringify(row));
    },
    async batchRemove(row) {
      try {
        if (row?.subs?.length === 0) {
          this.$message.info('没有可删除项');
          return;
        }
        await this.$confirm(
          `确定删除"${row.name}"的所有配置? 删除后不可恢复!`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );
        row.removeLoading = true;
        //挨个遍历删除
        for (const row of row.subs) {
          await this.$api.HisWorkItem.delStaffWorkItemMapping(row.mappingId);
        }
        this.$message.success('删除成功');
        this.$asyncComputed.serverData.update();
      } catch (e) {
        console.log(e);
      } finally {
        row.removeLoading = false;
      }
    },
    spanMethod({column, rowIndex}) {
      if (
        column.property !== 'staffName' &&
        column.property !== 'rate' &&
        column.property !== 'operation'
      ) {
        const _row = this.spanArr[rowIndex];
        const _col = _row > 0 ? 1 : 0;
        return {rowspan: _row, colspan: _col};
      }
    }
  }
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
}
</style>
