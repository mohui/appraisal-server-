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
            <el-form-item label="打分方式:">
              <el-select v-model="searchForm.scoreType" size="mini" clearable>
                <el-option value="manual" label="手动打分"></el-option>
                <el-option value="auto" label="自动打分"></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="打分标准:">
              <el-select
                v-model="searchForm.score"
                size="mini"
                clearable
              ></el-select>
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
        </el-form>
      </kn-collapse>
      <el-table
        v-loading="tableLoading"
        stripe
        size="small"
        :data="tableData"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column prop="index" label="序号"></el-table-column>
        <el-table-column prop="work" label="工分项">
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
        <el-table-column prop="scoreType" label="打分类型">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.scoreType }}</div>
            <div v-else>
              <el-select v-model="tempRow.scoreType" size="mini">
                <el-option label="手动打分" value="手动打分"></el-option>
                <el-option label="自动打分" value="自动打分"></el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="scoreMember" label="考核员工">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.scoreMember }}</div>
            <div v-else>
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
        <el-table-column prop="score" label="配置得分">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.score }}</div>
            <div v-else>
              <el-input-number v-model="tempRow.score" size="mini">
              </el-input-number>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间"></el-table-column>
        <el-table-column prop="" label="操作">
          <template slot-scope="{row}">
            <el-tooltip v-show="!row.isEdit" content="编辑" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click="editRow(row.index)"
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
                @click="cancelEdit(row.index)"
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
          <el-select v-model="newConfig.work">
            <el-option
              v-for="work in workList"
              :key="work.value"
              :label="work.name"
              :value="work.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="打分方式" prop="scoreType">
          <el-radio v-model="newConfig.scoreType" label="自动打分"
            >自动打分</el-radio
          >
          <el-radio v-model="newConfig.scoreType" label="手动打分"
            >手动打分</el-radio
          >
        </el-form-item>
        <el-form-item label="考核员工" prop="member">
          <el-select v-model="newConfig.member" multiple>
            <el-option
              v-for="m in memberList"
              :key="m.value"
              :label="m.name"
              :value="m.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="分配分值" prop="score">
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
import dayjs from 'dayjs';

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
      tableLoading: false,
      addConfigurationVisible: false,
      configRules: {
        work: [{required: true, message: '选择工分项', trigger: 'change'}],
        scoreType: [
          {required: true, message: '选择打分方式', trigger: 'change'}
        ],
        member: [{required: true, message: '选择考核员工', trigger: 'change'}],
        score: [{required: true, message: '输入分值', trigger: 'change'}]
      },
      tempRow: ''
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows.map(d => ({...d, isEdit: false}));
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
        this.tableLoading = true;
        const {scoreType, score, work} = this.searchForm;
        console.log(scoreType, score, work);
        try {
          await new Promise(resolve =>
            setTimeout(() => {
              for (let i = 0; i < 10; i++) {
                data.push({
                  index: i + 1,
                  work: '工分项1',
                  scoreType: '自动打分',
                  scoreMember: [`员工${i + 1}`],
                  score: 30,
                  createdAt: '2021-05-18 11:23:21'
                });
              }
              resolve();
            }, 1000)
          );
          return {
            counts: 10,
            rows: data
          };
        } catch (e) {
          console.error(e.message);
        } finally {
          this.tableLoading = false;
        }
      },
      default: {counts: 0, rows: []}
    },
    serverWorkData: {
      async get() {
        await new Promise(resolve => setTimeout(() => resolve(), 600));
        let i = 0;
        let data = [];
        for (; i < 10; i++) {
          data.push({name: `工分项${i}`, value: `工分项${i}`});
        }
        return data;
      },
      default: []
    },
    serverMemberData: {
      async get() {
        await new Promise(resolve => setTimeout(() => resolve(), 600));
        let i = 0;
        let data = [];
        for (; i < 10; i++) {
          data.push({name: `员工${i}`, value: `员工${i}`});
        }
        return data;
      },
      default: []
    }
  },
  methods: {
    goto(router) {
      this.$router.push(`${router}`);
    },
    async submit() {
      try {
        const valid = await this.$refs['configForm'].validate();
        if (valid) {
          this.$set(this.serverData.rows, this.tableData.length, {
            index: this.tableData.length + 1,
            work: this.newConfig.work,
            scoreType: this.newConfig.scoreType,
            scoreMember: this.newConfig.member,
            score: this.newConfig.score,
            row: false,
            createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
          });
          this.resetConfig();
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      }
    },
    editRow(index) {
      if (this.tempRow) {
        this.$message.warning('已有其他数据正在编辑');
        return;
      }
      this.tableData[index - 1].isEdit = !this.tableData[index - 1].isEdit;
      this.tempRow = Object.assign({}, this.tableData[index - 1]);
    },
    cancelEdit(index) {
      this.tableData[index - 1].isEdit = !this.tableData[index - 1].isEdit;
      this.tempRow = '';
    },
    async submitEdit(index, tempRow) {
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
