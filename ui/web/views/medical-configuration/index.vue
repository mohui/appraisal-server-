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
        <div>
          维度:
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
                currentTarget === HisWorkScoreType.STAFF ? 'primary' : 'default'
              "
              size="mini"
              @click="currentTarget = HisWorkScoreType.STAFF"
            >
              员工
            </el-button>
          </el-button-group>
        </div>
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
            <el-form-item label="">
              <el-button
                size="mini"
                type="primary"
                @click="$asyncComputed.serverData.update()"
                >查 询
              </el-button>
            </el-form-item>
          </el-col>
        </el-form>
      </kn-collapse>
      <el-table
        v-loading="$asyncComputed.serverData.updating"
        stripe
        border
        size="small"
        :data="tableData"
        height="100%"
        style="flex-grow: 1;"
        current-row-key="id"
        :span-method="spanMethod"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column
          align="center"
          :label="
            this.currentTarget === HisWorkScoreType.WORK_ITEM
              ? '工分项'
              : '员工'
          "
          prop="name"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="staffName"
          :label="
            this.currentTarget === HisWorkScoreType.WORK_ITEM
              ? '员工'
              : '工分项'
          "
        ></el-table-column>
        <el-table-column align="center" prop="rate" label="权重">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.rate }} %</div>
            <div v-else-if="row.isEdit">
              <el-input-number v-model="tempRow.rate" size="mini">
              </el-input-number>
              %
            </div>
          </template>
        </el-table-column>
        <el-table-column align="center" prop="operation" label="操作">
          <template slot-scope="{row}">
            <el-tooltip v-show="!row.isEdit" content="编辑" :enterable="false">
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
                :icon="updateLoading ? 'el-icon-loading' : 'el-icon-check'"
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
            <el-tooltip v-show="!row.isEdit" content="删除" :enterable="false">
              <el-button
                type="danger"
                :icon="row.removeLoading ? 'el-icon-loading' : 'el-icon-delete'"
                :disabled="row.removeLoading"
                circle
                size="mini"
                @click="removeRow(row)"
              >
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column align="center" prop="add" label="操作">
          <template>
            <el-tooltip content="新增" :enterable="false">
              <el-button type="success" icon="el-icon-plus" circle size="mini">
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog
      title="新建配置"
      :visible.sync="addConfigurationVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
      :before-close="resetConfig"
    >
      <el-form
        ref="configForm"
        :model="newConfig"
        :rules="configRules"
        label-position="right"
        label-width="120px"
      >
        <el-form-item label="工分项" prop="work">
          <el-select
            v-model="newConfig.work"
            clearable
            filterable
            style="width: 100%"
            size="mini"
          >
            <el-option
              v-for="work in workList"
              :key="work.id"
              :label="work.name"
              :value="work.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="考核员工" prop="member">
          <el-select
            v-model="newConfig.member"
            clearable
            filterable
            multiple
            style="width: 100%"
            size="mini"
          >
            <el-option
              v-for="m in memberList"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item style="width: 100%" label="分配分值" prop="score">
          <el-input-number
            v-model="newConfig.score"
            size="mini"
          ></el-input-number>
        </el-form-item>
        <el-form-item style="width: 100%" label="权重系数" prop="rate">
          <el-input-number
            v-model="newConfig.rate"
            style="width: 100px"
            size="mini"
          ></el-input-number>
          <span>&nbsp;&nbsp;%</span>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetConfig()">取 消</el-button>
        <el-button v-loading="submitLoading" type="primary" @click="submit()">
          确 定
        </el-button>
      </div>
    </el-dialog>
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
      newConfig: {
        work: '',
        scoreType: '',
        member: [],
        score: 0,
        rate: 100
      },
      addConfigurationVisible: false,
      configRules: {
        work: [{required: true, message: '选择工分项', trigger: 'change'}],
        member: [{required: true, message: '选择考核员工', trigger: 'change'}],
        score: [{required: true, message: '输入分值', trigger: 'change'}],
        rate: [{required: true, message: '输入权重系数', trigger: 'change'}]
      },
      tempRow: '',
      HisWorkMethod: Object.keys(HisWorkMethod).map(it => ({
        value: HisWorkMethod[it],
        key: it
      })),
      HisWorkScoreType: HisWorkScoreType,
      submitLoading: false,
      updateLoading: false,
      removeLoading: false,
      currentTarget: HisWorkScoreType.WORK_ITEM //默认以工作量维度
    };
  },
  computed: {
    tableData() {
      let data = [];
      let targetData = [];
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
      //平铺每条绑定的数据
      data.forEach(data => {
        data.subs.forEach(row => {
          targetData.push({
            ...data,
            mappingId: row.id,
            staffId: row.staff, //工分项维度时用到的员工变量
            staffName: row.name, //工分项维度时用到的员工变量
            itemId: row.item, //员工维度时用到的工分变量
            itemName: row.name, //员工维度时用到的工分名变量
            rate: row.rate * 100
          });
        });
      });
      return targetData.map(d => ({
        ...d,
        isEdit: false,
        removeLoading: false
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
    async submit() {
      try {
        const valid = await this.$refs['configForm'].validate();
        if (valid) {
          this.submitLoading = true;
          await this.$api.HisWorkItem.upsertStaffWorkItemMapping(
            this.newConfig.work,
            {
              insert: {
                staffs: this.newConfig.member,
                score: this.newConfig.score,
                rate: this.newConfig.rate / 100
              },
              update: {ids: [], score: null, rate: null},
              delete: []
            }
          );
          this.resetConfig();
          this.$asyncComputed.serverData.update();
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      } finally {
        this.submitLoading = false;
      }
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
      row.isEdit = !row.isEdit;
      this.tempRow = '';
    },
    async submitEdit(row) {
      this.updateLoading = true;
      try {
        await this.$api.HisWorkItem.upsertStaffWorkItemMapping(
          row.mappingId,
          row.itemId,
          row.staff,
          row.rate / 100
        );
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
    },
    resetConfig() {
      this.$refs['configForm'].resetFields();
      this.addConfigurationVisible = false;
    },
    toBreak(content) {
      let contentStr = '';
      for (let index in content) {
        if (index !== '0' && index % 20 === 0) contentStr += '<br/>';
        contentStr += content[index];
      }
      return contentStr;
    }
  }
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
}

.cell-long-span {
  width: 100%;
  display: block;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>
