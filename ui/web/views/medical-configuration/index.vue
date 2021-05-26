<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '20px'
      }"
    >
      <div slot="header" class="header">
        <span>配置列表</span>
        <div>
          <el-button
            size="mini"
            type="primary"
            @click="addConfigurationVisible = true"
            >新增配置</el-button
          >
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
            <el-form-item label="得分方式:">
              <el-select v-model="searchForm.scoreType" size="mini" clearable>
                <el-option
                  v-for="m in HisWorkMethod"
                  :key="m.key"
                  :value="m.value"
                  :label="m.value"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="工分项:">
              <el-input
                v-model="searchForm.work"
                size="mini"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
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
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column
          align="center"
          type="index"
          label="序号"
        ></el-table-column>
        <el-table-column align="center" prop="work" label="工分项">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.work }}</div>
            <div v-else>
              <el-select v-model="tempRow.work" size="mini">
                <el-option
                  v-for="work in workList"
                  :key="work.value"
                  :label="work.name"
                  :value="work.value"
                ></el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          align="center"
          prop="scoreType"
          label="得分方式"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="scoreMember"
          label="考核员工"
          width="200"
        >
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">
              <el-tooltip
                v-if="$widthCompute([row.scoreMember.join(',')]) >= 200"
                effect="dark"
                placement="top"
                :content="row.scoreMember.join(',')"
              >
                <div
                  slot="content"
                  v-html="toBreak(row.scoreMember.join(','))"
                ></div>
                <span class="cell-long-span">{{
                  row.scoreMember.join(',')
                }}</span>
              </el-tooltip>
              <div v-else>{{ row.scoreMember.join(',') }}</div>
            </div>
            <div v-else-if="row.isEdit">
              <el-select
                v-model="tempRow.scoreMember"
                size="mini"
                multiple
                collapse-tags
              >
                <el-option
                  v-for="work in memberList"
                  :key="work.value"
                  :label="work.name"
                  :value="work.value"
                ></el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column align="center" prop="score" label="配置得分">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.score }}</div>
            <div v-else>
              <el-input-number v-model="tempRow.score" size="mini">
              </el-input-number>
            </div>
          </template>
        </el-table-column>
        <el-table-column align="center" prop="" label="操作">
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
                icon="el-icon-check"
                circle
                size="mini"
                @click="submitEdit(row.index, tempRow)"
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
                icon="el-icon-delete"
                circle
                size="mini"
                @click="removeRow(row)"
              >
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        background
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :total="serverData.counts"
        @size-change="
          size => {
            searchForm.pageSize = size;
            searchForm.pageNo = 1;
          }
        "
        @current-change="
          no => {
            searchForm.pageNo = no;
          }
        "
      >
      </el-pagination>
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
          <el-select v-model="newConfig.work" style="width: 100%">
            <el-option
              v-for="work in workList"
              :key="work.id"
              :label="work.name"
              :value="work.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="考核员工" prop="member">
          <el-select v-model="newConfig.member" style="width: 100%" multiple>
            <el-option
              v-for="m in memberList"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item style="width: 100%" label="分配分值" prop="score">
          <el-input-number v-model="newConfig.score"> </el-input-number>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetConfig()">取 消</el-button>
        <el-button type="primary" @click="submit()">
          确 定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';
import {HisWorkMethod} from '../../../../common/his.ts';

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
        score: 0
      },
      addConfigurationVisible: false,
      configRules: {
        work: [{required: true, message: '选择工分项', trigger: 'change'}],
        member: [{required: true, message: '选择考核员工', trigger: 'change'}],
        score: [{required: true, message: '输入分值', trigger: 'change'}]
      },
      tempRow: '',
      HisWorkMethod: Object.keys(HisWorkMethod).map(it => ({
        value: HisWorkMethod[it],
        key: it
      }))
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows.map(d => ({
        ...d,
        work: d.name,
        scoreType: d.method || '',
        scoreMember: d.staffs.map(m => m.name),
        isEdit: false
      }));
    },
    workList() {
      return this.serverWorkData;
    },
    memberList() {
      return this.serverMemberData;
    }
  },
  watch: {},
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
          return {
            counts: data.length,
            rows: data
          };
        } catch (e) {
          console.error(e.message);
        }
      },
      default: {counts: 0, rows: []}
    },
    serverWorkData: {
      async get() {
        return await this.$api.HisWorkItem.list();
      },
      default: []
    },
    serverMemberData: {
      async get() {
        return await this.$api.HisStaff.list();
      },
      default: []
    }
  },
  methods: {
    async submit() {
      try {
        const valid = await this.$refs['configForm'].validate();
        if (valid) {
          const item = this.newConfig.work;
          const staffs = [
            {staffs: this.newConfig.member, score: this.newConfig.score}
          ];
          this.$api.HisWorkItem.upsertStaffWorkItemMapping(item, staffs);
          this.resetConfig();
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      }
    },
    editRow(row) {
      if (this.tempRow) {
        this.$message.warning('已有其他数据正在编辑');
        return;
      }
      row.isEdit = !row.isEdit;
      this.tempRow = Object.assign({}, row);
    },
    cancelEdit(row) {
      row.isEdit = !row.isEdit;
      this.tempRow = '';
    },
    async submitEdit(index, tempRow) {
      if (tempRow?.scoreMember.length < 1) {
        this.$message.warning('考核员工不能为空');
        return;
      }
      tempRow.isEdit = !tempRow.isEdit;
      this.$set(this.serverData.rows, index - 1, tempRow);
      this.$message.success('修改成功');
      this.tempRow = '';
    },
    async removeRow(row) {
      this.tableData.splice(
        this.tableData.findIndex(d => d.index === row.index),
        1
      );
      this.$message.success('删除成功');
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
