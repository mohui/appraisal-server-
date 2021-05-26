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
        </el-table-column>
        <el-table-column prop="scoreMethod" label="打分方式" align="center">
        </el-table-column>
        <el-table-column
          prop="project"
          label="关联项目"
          align="center"
          width="300"
        >
          <template slot-scope="{row}">
            <el-tooltip
              v-if="$widthCompute([row.projects.join(',')]) >= 300"
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
          </template>
        </el-table-column>
        <el-table-column prop="" label="操作" align="center">
          <template slot-scope="{row}">
            <el-tooltip content="编辑" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click="editRow(row)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" :enterable="false">
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
      title="配置弹窗"
      :visible.sync="addWorkVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
      :before-close="() => resetConfig('workForm')"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
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
              v-for="s of HisWorkSource"
              :key="s.key"
              size="mini"
              :class="{
                'el-button--primary': newWork.source === s.value
              }"
              @click="newWork.source = s.value"
            >
              {{ s.value }}
            </el-button>
          </el-button-group>
        </el-form-item>
        <el-form-item label="关联项目" prop="projects">
          <el-select
            v-model="newWork.projects"
            :loading="searchLoading"
            style="width: 100%"
            clearable
            filterable
            remote
            :remote-method="remoteSearch"
            multiple
          >
            <el-option
              v-for="p in projectList"
              :key="p.id"
              :label="p.name"
              :value="p.id"
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
        <el-form-item
          v-show="newWork.oldProjects.length > 0"
          label="已有工分项"
          prop="oldProjects"
        >
          <el-tag
            v-for="old in newWork.oldProjects"
            :key="old.id"
            closable
            style="margin: 0 5px"
            @close="closeTag(old)"
            >{{ old.name }}</el-tag
          >
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
      if (value?.length < 1 && this.newWork.oldProjects.length < 1) {
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
        source: HisWorkSource.CHECK,
        scoreMethod: HisWorkMethod.SUM,
        projects: [],
        oldProjects: []
      },
      addWorkVisible: false,
      workRules: {
        work: [{required: true, message: '填写工分项', trigger: 'change'}],
        scoreMethod: [
          {required: true, message: '选择打分方式', trigger: 'change'}
        ],
        projects: [{validator: validaProjects, trigger: 'change'}]
      },
      tableLoading: false,
      addBtnLoading: false,
      searchLoading: false,
      HisWorkMethod: HisWorkMethod,
      HisWorkSource: Object.keys(HisWorkSource).map(it => ({
        value: HisWorkSource[it],
        key: it
      }))
    };
  },
  computed: {
    tableData() {
      return this.serverData.map(d => ({
        id: d.id,
        work: d.name,
        scoreMethod: d.method,
        projects: d.mappings.map(it => it.name),
        mappings: d.mappings
      }));
    },
    projectList() {
      return this.serverProjectData.map(it => ({
        ...it,
        id: it.id + '-' + this.newWork.source
      }));
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
        try {
          this.searchLoading = true;
          const {source} = this.newWork;
          return await this.$api.HisWorkItem.searchSource(source);
        } catch (e) {
          console.error(e);
        } finally {
          this.searchLoading = false;
        }
      },
      default: []
    }
  },
  methods: {
    async submit() {
      try {
        const valid = await this.$refs['workForm'].validate();
        if (valid) {
          let allProjects = Array.from(
            new Set(
              this.newWork.oldProjects
                .map(o => o.id)
                .concat(this.newWork.projects) //合并新老his工分项
            )
          );
          const mappings = allProjects
            .map(it => {
              //分别获取工分项id和所属来源
              const [source, type] = it.split('-');
              return {source, type};
            })
            .reduce((res, next) => {
              //工分项按来源归类
              const current = res.find(i => i.type === next.type);
              if (current) current.source.push(next.source);
              else res.push({type: next.type, source: [next.source]});
              return res;
            }, []);
          this.addBtnLoading = true;
          const paramsArr = [
            this.newWork.work,
            this.newWork.scoreMethod,
            mappings
          ];
          if (this.newWork.id) {
            paramsArr.splice(0, 0, this.newWork.id);
            await this.$api.HisWorkItem.update(...paramsArr);
          } else {
            await this.$api.HisWorkItem.add(...paramsArr);
          }
          this.$message.success('操作成功');
          this.$asyncComputed.serverData.update();
          this.resetConfig('workForm');
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      } finally {
        this.addBtnLoading = false;
      }
    },
    editRow(row) {
      this.newWork = JSON.parse(
        JSON.stringify({
          id: row.id,
          work: row.work,
          source: HisWorkSource.CHECK,
          scoreMethod: row.scoreMethod,
          oldProjects: row.mappings.map(m => ({
            name: m.name,
            id: m.id + '-' + m.source
          })),
          projects: []
        })
      );
      this.addWorkVisible = true;
    },
    async removeRow(row) {
      try {
        await this.$confirm('此操作将永久删除该工分项, 是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        await this.$api.HisWorkItem.delete(row.id);
        this.$message.success('删除成功');
        this.$asyncComputed.serverData.update();
      } catch (e) {
        console.log(e);
      }
    },
    resetConfig(ref) {
      this.$refs[ref].resetFields();
      this.newWork = {
        work: '',
        source: HisWorkSource.CHECK,
        scoreMethod: HisWorkMethod.SUM,
        projects: [],
        oldProjects: []
      };
      this.addWorkVisible = false;
    },
    toBreak(content) {
      let contentStr = '';
      for (let index in content) {
        if (index !== '0' && index % 20 === 0) contentStr += '<br/>';
        contentStr += content[index];
      }
      return contentStr;
    },
    async remoteSearch(query) {
      try {
        this.searchLoading = true;
        this.serverProjectData = await this.$api.HisWorkItem.searchSource(
          this.newWork.source,
          query || undefined
        );
      } catch (e) {
        console.error(e);
      } finally {
        this.searchLoading = false;
      }
    },
    closeTag(tag) {
      this.newWork.oldProjects.splice(
        this.newWork.oldProjects.findIndex(o => o.id === tag.id),
        1
      );
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
