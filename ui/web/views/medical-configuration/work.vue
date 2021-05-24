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
          ref="searchForm"
          :model="searchForm"
          label-width="100px"
          size="mini"
        >
          <el-row>
            <el-col :span="6" :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
              <el-form-item label="工分项:" prop="work">
                <el-select
                  v-model="searchForm.work"
                  style="width: 100%"
                  size="mini"
                  clearable
                >
                  <el-option
                    v-for="d in tableData"
                    :key="d.id"
                    :label="d.work"
                    :value="d.id"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
              <el-form-item label="打分方式" prop="scoreMethod">
                <el-select
                  v-model="searchForm.scoreMethod"
                  style="width: 100%"
                  clearable
                  size="mini"
                >
                  <el-option
                    :value="HisWorkMethod.AMOUNT"
                    :label="HisWorkMethod.AMOUNT"
                  ></el-option>
                  <el-option
                    :value="HisWorkMethod.SUM"
                    :label="HisWorkMethod.SUM"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="12" :lg="6" :xl="6">
              <el-form-item prop="dateRange" size="mini" label="创建时间">
                <el-date-picker
                  v-model="searchForm.dateRange"
                  style="width:100%"
                  clearable
                  :default-time="['00:00:00', '23:59:59']"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  size="mini"
                ></el-date-picker>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="12" :lg="8" :xl="6">
              <el-form-item label="">
                <el-button
                  type="primary"
                  size="mini"
                  @click="$asyncComputed.serverData.update()"
                  >查询</el-button
                >
                <el-button
                  type="primary"
                  size="mini"
                  @click="resetConfig('searchForm')"
                >
                  重置
                </el-button>
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
        <el-table-column type="index" label="序号"></el-table-column>
        <el-table-column prop="work" align="center" label="工分项">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.work }}</div>
            <div v-else>
              <el-input v-model="tempRow.work" size="mini"> </el-input>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="scoreMethod" label="打分方式" align="center">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.scoreMethod }}</div>
            <div v-else>
              <el-select
                v-model="tempRow.scoreMethod"
                style="width: 100%"
                size="mini"
              >
                <el-option
                  :value="HisWorkMethod.AMOUNT"
                  :label="HisWorkMethod.AMOUNT"
                ></el-option>
                <el-option
                  :value="HisWorkMethod.SUM"
                  :label="HisWorkMethod.SUM"
                ></el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="project"
          label="关联项目"
          align="center"
          width="200"
        >
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
            <div v-if="row.isEdit">
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
        <el-table-column prop="" label="操作" align="center">
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
      :before-close="() => resetConfig('workForm')"
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
        <el-form-item label="工分项来源" prop="source">
          <el-button-group>
            <el-button
              size="small"
              :class="{'el-button--primary': newWork.source === ''}"
              @click="newWork.source = ''"
            >
              全部
            </el-button>
            <el-button
              size="small"
              :class="{
                'el-button--primary': newWork.source === HisWorkSource.CHECK
              }"
              @click="newWork.source = HisWorkSource.CHECK"
            >
              {{ HisWorkSource.CHECK }}
            </el-button>
            <el-button
              size="small"
              :class="{
                'el-button--primary': newWork.source === HisWorkSource.DRUG
              }"
              @click="newWork.source = HisWorkSource.DRUG"
            >
              {{ HisWorkSource.DRUG }}
            </el-button>
            <el-button
              size="small"
              :class="{
                'el-button--primary': newWork.source === HisWorkSource.MANUAL
              }"
              @click="newWork.source = HisWorkSource.MANUAL"
            >
              {{ HisWorkSource.MANUAL }}
            </el-button>
          </el-button-group>
        </el-form-item>
        <el-form-item label="关联项目" prop="projects">
          <el-select
            v-model="newWork.projects"
            style="width: 100%"
            clearable
            multiple
          >
            <el-option
              v-for="p in projectList"
              :key="p.value"
              :label="p.name"
              :value="p.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="打分方式" prop="scoreMethod">
          <el-button-group>
            <el-button
              size="small"
              :class="{
                'el-button--primary': newWork.scoreMethod === HisWorkMethod.SUM
              }"
              @click="newWork.scoreMethod = HisWorkMethod.SUM"
            >
              {{ HisWorkMethod.SUM }}
            </el-button>
            <el-button
              size="small"
              :class="{
                'el-button--primary':
                  newWork.scoreMethod === HisWorkMethod.AMOUNT
              }"
              @click="newWork.scoreMethod = HisWorkMethod.AMOUNT"
            >
              {{ HisWorkMethod.AMOUNT }}
            </el-button>
          </el-button-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetConfig('workForm')">取 消</el-button>
        <el-button v-loading="addBtnLoading" type="primary" @click="submit()">
          确 定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';
import {HisWorkMethod, HisWorkSource} from '../../../../common/his.ts';

export default {
  name: 'Work',
  data() {
    const validaProjects = (rule, value, callback) => {
      if (value?.length < 1) {
        callback(new Error('选择关联项目!'));
      }
      callback();
    };
    return {
      isCollapsed: !!this.$settings.isMobile,
      permission: Permission,
      searchForm: {
        work: '',
        scoreMethod: '',
        projects: [],
        dateRange: '',
        pageSize: 20,
        pageNo: 1
      },
      newWork: {
        work: '',
        source: '',
        scoreMethod: HisWorkMethod.SUM,
        projects: []
      },
      addWorkVisible: false,
      tempRow: '',
      workRules: {
        work: [{required: true, message: '填写工分项', trigger: 'change'}],
        scoreMethod: [
          {required: true, message: '选择打分方式', trigger: 'change'}
        ],
        projects: [{validator: validaProjects, trigger: 'change'}]
      },
      tableLoading: false,
      addBtnLoading: false,
      HisWorkMethod: HisWorkMethod,
      HisWorkSource: HisWorkSource
    };
  },
  computed: {
    tableData() {
      return this.serverData.map(d => ({
        id: d.id,
        work: d.name,
        scoreMethod: d.method,
        projects: d.mappings.map(it => it.name),
        mappings: d.mappings.map,
        created_at: d.created_at?.$format() || '',
        updated_at: d.updated_at?.$format() || '',
        isEdit: false
      }));
    },
    projectList() {
      return this.serverProjectData;
    }
  },
  watch: {},
  asyncComputed: {
    serverData: {
      async get() {
        this.tableLoading = true;
        const {work, scoreMethod, dateRange} = this.searchForm;
        console.log(work, scoreMethod, dateRange);
        try {
          return await this.$api.HisWorkItem.list();
        } catch (e) {
          console.error(e.message);
        } finally {
          this.tableLoading = false;
        }
      },
      default: []
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
          this.addBtnLoading = true;
          await this.$api.HisWorkItem.add(
            this.newWork.work,
            this.newWork.scoreMethod,
            this.newWork.projects
          );
          this.resetConfig('workForm');
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      } finally {
        this.addBtnLoading = false;
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
      if (tempRow.projects?.length < 1) {
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
    resetConfig(ref) {
      this.$refs[ref].resetFields();
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
