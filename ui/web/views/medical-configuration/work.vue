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
      <div slot="header" class="work-header">
        <span>工分项配置</span>
        <div>
          <el-button size="mini" type="primary" @click="addWorkVisible = true"
            >新增工分项</el-button
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
          <el-row>
            <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
              <el-form-item label="打分方式：">
                <el-select
                  v-model="searchForm.account"
                  size="mini"
                  clearable
                ></el-select>
              </el-form-item>
            </el-col>
          </el-row>
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
              <el-input v-model="tempRow.work" size="mini"> </el-input>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="scoreType" label="打分类型"></el-table-column>
        <el-table-column prop="scoreStyle" label="打分方式">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.scoreStyle }}</div>
            <div v-else>
              <el-select
                v-model="tempRow.scoreStyle"
                style="width: 100%"
                size="mini"
              >
                <el-option
                  value="按服务单位打分"
                  label="按服务单位打分"
                ></el-option>
                <el-option
                  value="按金额单位打分"
                  label="按金额单位打分"
                ></el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="project" label="关联项目" width="160">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">
              <el-tooltip
                v-if="$widthCompute([row.projects.join(',')]) >= 200"
                effect="dark"
                placement="top"
                :content="row.projects.join(',')"
              >
                <div
                  slot="content"
                  v-html="toBreak(row.projects.join(','))"
                ></div>
                <span class="cell-long-span">{{ row.projects.join(',') }}</span>
              </el-tooltip>
              <div v-else>{{ row.projects.join(',') }}</div>
            </div>
            <div v-if="row.isEdit && row.scoreType === '自动打分'">
              <el-select
                v-model="tempRow.projects"
                size="mini"
                multiple
                collapse-tags
              >
                <el-option
                  v-for="work in projectList"
                  :key="work.value"
                  :label="work.name"
                  :value="work.value"
                ></el-option>
              </el-select>
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
        :total="0"
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
      :visible.sync="addWorkVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
      :before-close="resetConfig"
    >
      <el-form
        ref="workForm"
        :model="newWork"
        :rules="workRules"
        label-position="right"
        label-width="120px"
      >
        <el-form-item label="工分项" prop="work">
          <el-input v-model="newWork.work"> </el-input>
        </el-form-item>
        <el-form-item label="打分方式" prop="scoreType">
          <el-button-group>
            <el-button
              size="small"
              :class="{'el-button--primary': newWork.scoreType === '手动打分'}"
              @click="newWork.scoreType = '手动打分'"
            >
              手动打分
            </el-button>
            <el-button
              size="small"
              :class="{'el-button--primary': newWork.scoreType === '自动打分'}"
              @click="newWork.scoreType = '自动打分'"
            >
              自动打分
            </el-button>
          </el-button-group>
        </el-form-item>
        <el-form-item
          v-show="newWork.scoreType === '自动打分'"
          label="关联项目"
          prop="projects"
        >
          <el-select v-model="newWork.projects" multiple>
            <el-option
              v-for="p in projectList"
              :key="p.value"
              :label="p.name"
              :value="p.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item
          v-show="newWork.scoreType === '自动打分'"
          label="打分方式"
          prop="scoreStyle"
        >
          <el-button-group>
            <el-button
              size="small"
              :class="{
                'el-button--primary': newWork.scoreStyle === '按服务单位打分'
              }"
              @click="newWork.scoreStyle = '按服务单位打分'"
            >
              按服务单位打分
            </el-button>
            <el-button
              size="small"
              :class="{
                'el-button--primary': newWork.scoreStyle === '按金额单位打分'
              }"
              @click="newWork.scoreStyle = '按金额单位打分'"
            >
              按金额单位打分
            </el-button>
          </el-button-group>
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
  name: 'Work',
  data() {
    const validaProjects = (rule, value, callback) => {
      if (this.newWork.scoreType === '自动打分' && value?.length < 1) {
        callback(new Error('选择关联项目!'));
      }
      callback();
    };
    const validaScoreStyle = (rule, value, callback) => {
      if (this.newWork.scoreType === '自动打分' && value?.length < 1) {
        callback(new Error('选择打分类型!'));
      }
      callback();
    };
    return {
      isCollapsed: !!this.$settings.isMobile,
      permission: Permission,
      searchForm: {
        work: '',
        scoreType: '',
        projects: [],
        pageSize: 20,
        pageNo: 1
      },
      newWork: {
        work: '',
        scoreType: '自动打分',
        scoreStyle: '按服务单位打分',
        projects: []
      },
      addWorkVisible: false,
      tempRow: '',
      workRules: {
        work: [{required: true, message: '填写工分项', trigger: 'change'}],
        scoreType: [
          {required: true, message: '选择打分方式', trigger: 'change'}
        ],
        projects: [{validator: validaProjects, trigger: 'change'}],
        scoreStyle: [{validator: validaScoreStyle, trigger: 'change'}]
      },
      tableLoading: false
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows.map(d => ({...d, isEdit: false}));
    },
    projectList() {
      return this.serverProjectData;
    }
  },
  watch: {},
  asyncComputed: {
    serverData: {
      async get() {
        let data = [];
        this.tableLoading = true;
        const {scoreType} = this.searchForm;
        console.log(scoreType);
        try {
          await new Promise(resolve =>
            setTimeout(() => {
              for (let i = 0; i < 10; i++) {
                data.push({
                  index: i + 1,
                  work: `工分项${i}`,
                  scoreType: '自动打分',
                  scoreStyle: '按服务单位打分',
                  projects: [`项目${i + 1}`],
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
    serverProjectData: {
      async get() {
        await new Promise(resolve => setTimeout(() => resolve(), 600));
        let i = 0;
        let data = [];
        for (; i < 10; i++) {
          data.push({name: `项目${i}`, value: `项目${i}`});
        }
        return data;
      },
      default: []
    }
  },
  methods: {
    async submit() {
      try {
        const valid = await this.$refs['workForm'].validate();
        if (valid) {
          this.$set(this.serverData.rows, this.tableData.length, {
            index: this.tableData.length + 1,
            work: this.newWork.work,
            scoreType: this.newWork.scoreType,
            scoreStyle: this.newWork.scoreStyle,
            projects: this.newWork.projects,
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
      if (!tempRow.work) {
        this.$message.warning('工分项不能为空');
        return;
      }
      if (tempRow.scoreType === '自动打分' && tempRow.projects?.length < 1) {
        this.$message.warning('关联项目不能为空');
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
      this.$refs['workForm'].resetFields();
      this.addWorkVisible = false;
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
.work-header {
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
