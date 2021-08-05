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
        <span>工分项管理</span>
        <div>
          <el-button size="mini" type="primary" @click="addWorkVisible = true"
            >新增工分项</el-button
          >
        </div>
      </div>
      <el-table
        v-loading="tableLoading"
        stripe
        border
        size="small"
        :data="tableData"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column type="index" label="序号"></el-table-column>
        <el-table-column prop="work" align="center" label="工分项">
        </el-table-column>
        <el-table-column prop="score" align="center" label="得分">
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
        <el-table-column
          prop="project"
          label="关联员工"
          align="center"
          width="300"
        >
          <template slot-scope="{row}">
            <el-tooltip
              v-if="$widthCompute([row.staffMappings.join(',')]) >= 300"
              effect="dark"
              placement="top"
              :content="row.projects.join(',')"
            >
              <div
                slot="content"
                v-html="toBreak(row.staffMappings.join(','))"
              ></div>
              <span class="cell-long-span">{{
                row.staffMappings.join(',')
              }}</span>
            </el-tooltip>
            <div v-else>{{ row.staffMappings.join(',') }}</div>
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
                :disabled="row.removeLoading"
                circle
                :icon="row.removeLoading ? 'el-icon-loading' : 'el-icon-delete'"
                size="mini"
                @click="removeRow(row)"
              >
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog
      :visible.sync="addWorkVisible"
      :width="$settings.isMobile ? '99%' : '60%'"
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
        <el-row>
          <el-col :span="24">
            <el-form-item label="工分项" prop="work">
              <el-input v-model="newWork.work" size="mini"> </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="打分方式" prop="scoreMethod">
              <el-button-group>
                <el-button
                  :class="{
                    'el-button--primary':
                      newWork.scoreMethod === HisWorkMethod.SUM
                  }"
                  size="mini"
                  @click="newWork.scoreMethod = HisWorkMethod.SUM"
                >
                  {{ HisWorkMethod.SUM }}
                </el-button>
                <el-button
                  :class="{
                    'el-button--primary':
                      newWork.scoreMethod === HisWorkMethod.AMOUNT
                  }"
                  size="mini"
                  @click="newWork.scoreMethod = HisWorkMethod.AMOUNT"
                >
                  {{ HisWorkMethod.AMOUNT }}
                </el-button>
              </el-button-group>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="得分" prop="score">
              <el-input-number
                size="mini"
                v-model="newWork.score"
              ></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联项目" prop="projectsSelected">
              <el-input
                size="mini"
                placeholder="输入关键字进行过滤"
                v-model="filterText"
              >
              </el-input>
              <div class="long-tree">
                <el-tree
                  ref="tree"
                  :data="treeData"
                  :props="treeProps"
                  :default-checked-keys="
                    newWork.projectsSelected.map(it => it.id)
                  "
                  :default-expanded-keys="
                    newWork.projectsSelected.map(it => it.id)
                  "
                  node-key="id"
                  :filter-node-method="filterNode"
                  show-checkbox
                  @check-change="treeCheck"
                >
                  <span slot-scope="{node, data}">
                    <span style="font-size: 14px; color: #606266">{{
                      `${data.name}`
                    }}</span>
                    <span v-show="data.disabled">
                      <el-popover
                        placement="right"
                        width="200"
                        trigger="hover"
                        :content="`此节点固定不可选`"
                      >
                        <i
                          style="color: #CC3300"
                          slot="reference"
                          class="el-icon-warning-outline"
                        >
                        </i>
                      </el-popover>
                    </span>
                  </span>
                </el-tree>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="关联员工" prop="staffMethod">
              <el-button-group>
                <el-button
                  :type="
                    newWork.staffMethod === HisStaffMethod.DYNAMIC
                      ? 'primary'
                      : 'default'
                  "
                  size="mini"
                  @click="newWork.staffMethod = HisStaffMethod.DYNAMIC"
                >
                  {{ HisStaffMethod.DYNAMIC }}
                </el-button>
                <el-button
                  :disabled="onlyHospital"
                  :type="
                    newWork.staffMethod === HisStaffMethod.STATIC
                      ? 'primary'
                      : 'default'
                  "
                  size="mini"
                  @click="newWork.staffMethod = HisStaffMethod.STATIC"
                >
                  {{ HisStaffMethod.STATIC }}
                </el-button>
              </el-button-group>
            </el-form-item>
            <el-form-item
              v-if="newWork.staffMethod === HisStaffMethod.STATIC"
              label="员工"
              prop="staffs"
            >
              <el-input
                size="mini"
                placeholder="输入关键字进行过滤"
                v-model="staffFilterText"
              ></el-input>
              <div class="long-tree">
                <el-tree
                  ref="staffTree"
                  :data="staffTree"
                  :default-checked-keys="newWork.staffs"
                  node-key="value"
                  :filter-node-method="filterNode"
                  show-checkbox
                  @check-change="staffCheck"
                ></el-tree>
              </div>
            </el-form-item>
            <el-form-item v-else label="范围" props="scope">
              <el-button-group>
                <el-button
                  :disabled="onlyHospital"
                  @click="newWork.scope = HisStaffDeptType.Staff"
                  :type="
                    newWork.scope === HisStaffDeptType.Staff ? 'primary' : ''
                  "
                  size="mini"
                >
                  {{ HisStaffDeptType.Staff }}
                </el-button>
                <el-button
                  :disabled="onlyHospital"
                  @click="newWork.scope = HisStaffDeptType.DEPT"
                  :type="
                    newWork.scope === HisStaffDeptType.DEPT ? 'primary' : ''
                  "
                  size="mini"
                >
                  {{ HisStaffDeptType.DEPT }}
                </el-button>
                <el-button
                  @click="newWork.scope = HisStaffDeptType.HOSPITAL"
                  :type="
                    newWork.scope === HisStaffDeptType.HOSPITAL ? 'primary' : ''
                  "
                  size="mini"
                >
                  {{ HisStaffDeptType.HOSPITAL }}
                </el-button>
              </el-button-group>
              <div v-show="onlyHospital" style="color: #CC3300;font-size: 14px">
                所选工分项仅适用于机构范围
              </div>
            </el-form-item>
          </el-col>
        </el-row>
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
import {
  HisWorkMethod,
  HisWorkSource,
  HisStaffMethod,
  HisStaffDeptType
} from '../../../../common/his.ts';
import {strToPinyin} from '../../utils/pinyin';

export default {
  name: 'Work',
  data() {
    const validaProjects = (rule, value, callback) => {
      if (value?.length < 1 && this.newWork.projectsSelected.length < 1) {
        callback(new Error('选择关联项目!'));
      }
      callback();
    };
    return {
      permission: Permission,
      newWork: {
        work: '',
        source: HisWorkSource.CHECK,
        scoreMethod: HisWorkMethod.SUM,
        staffMethod: HisStaffMethod.DYNAMIC,
        staffs: [],
        projects: [],
        projectsSelected: [],
        score: 0,
        scope: HisStaffDeptType.Staff
      },
      addWorkVisible: false,
      workRules: {
        work: [{required: true, message: '填写工分项', trigger: 'change'}],
        projectsSelected: [{validator: validaProjects, trigger: 'change'}]
      },
      tableLoading: false,
      addBtnLoading: false,
      searchLoading: false,
      HisWorkMethod: HisWorkMethod,
      HisStaffMethod: HisStaffMethod,
      HisStaffDeptType: HisStaffDeptType,
      HisWorkSource: Object.keys(HisWorkSource).map(it => ({
        value: HisWorkSource[it],
        key: it
      })),
      treeProps: {
        label: 'name'
      },
      filterText: '',
      staffFilterText: ''
    };
  },
  computed: {
    tableData() {
      return this.serverData.map(d => ({
        id: d.id,
        work: d.name,
        scoreMethod: d.method,
        projects: d.mappings.map(it => it.name),
        mappings: d.mappings,
        removeLoading: false,
        staffMethod: d.type ? d.type : HisStaffMethod.DYNAMIC, // 默认是动态
        staffIdMappings: d.staffIdMappings,
        staffMappings:
          d.staffMappings?.length > 0
            ? d.staffMappings
            : [HisStaffMethod.DYNAMIC],
        scope: d.scope || HisStaffDeptType.Staff,
        score: d.score || 0
      }));
    },
    treeData() {
      return this.addPinyin(
        this.workTreeData.map(it => ({
          ...it,
          disabled: ['其他', '手工数据', '公卫数据'].includes(it.name)
        }))
      );
    },
    staffTree() {
      return this.addPinyin(this.staffTreeData);
    },
    onlyHospital() {
      return this.newWork.projectsSelected.some(
        p => p.scope === HisStaffDeptType.HOSPITAL
      );
    },
    onlyPerson() {
      return this.newWork.projectsSelected.some(
        p => p.scope === HisStaffDeptType.Staff
      );
    }
  },
  watch: {
    filterText(value) {
      this.$refs.tree.filter(value);
    },
    staffFilterText(value) {
      this.$refs.staffTree.filter(value);
    },
    'newWork.projectsSelected'() {
      if (
        this.newWork.projectsSelected.some(
          p => p.scope === HisStaffDeptType.HOSPITAL
        )
      ) {
        this.newWork.staffMethod = HisStaffMethod.DYNAMIC;
        this.newWork.scope = HisStaffDeptType.HOSPITAL;
      }
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        this.tableLoading = true;
        try {
          return await this.$api.HisWorkItem.list();
        } catch (e) {
          console.error(e.message);
          this.$message.error(e.message);
          return [];
        } finally {
          this.tableLoading = false;
        }
      },
      default: []
    },
    workTreeData: {
      async get() {
        return await this.$api.HisWorkItem.sources(null, null);
      },
      default() {
        return [];
      }
    },
    staffTreeData: {
      async get() {
        try {
          return await this.$api.HisStaff.staffTree();
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
        const valid = await this.$refs['workForm'].validate();
        if (valid) {
          this.addBtnLoading = true;
          const paramsArr = [
            this.newWork.work,
            this.newWork.scoreMethod,
            this.newWork.projectsSelected.map(it => it.id), //被选中的项目id
            this.newWork.staffMethod,
            this.newWork.staffMethod === HisStaffMethod.STATIC
              ? this.newWork.staffs.map(it => ({
                  code: it.value,
                  type: it.type
                }))
              : [],
            this.newWork.score,
            this.newWork.staffMethod === HisStaffMethod.DYNAMIC
              ? this.newWork.scope
              : null
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
    async editRow(row) {
      this.newWork = JSON.parse(
        JSON.stringify({
          id: row.id,
          work: row.work,
          scoreMethod: row.scoreMethod,
          projectsSelected: row.mappings.map(m => ({
            name: m.name,
            id: m.id
          })),
          projects: [],
          staffMethod: row.staffMethod,
          staffs: row.staffIdMappings,
          scope: row.scope || HisStaffDeptType.Staff,
          score: row.score
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
        row.removeLoading = true;
        await this.$api.HisWorkItem.delete(row.id);
        this.$message.success('删除成功');
        this.$asyncComputed.serverData.update();
      } catch (e) {
        e !== 'cancel' ? this.$message.error(e?.message) : '';
      } finally {
        row.removeLoading = false;
      }
    },
    resetConfig(ref) {
      this.$refs[ref].resetFields();
      this.$refs.tree.setCheckedKeys([]);
      //将树形结构全部折叠
      for (let i = 0; i < this.workTreeData.length; i++) {
        this.$refs.tree.store.nodesMap[
          this.workTreeData[i].id
        ].expanded = false;
      }
      //重置默认选中项
      this.newWork = {
        work: '',
        source: HisWorkSource.CHECK,
        scoreMethod: HisWorkMethod.SUM,
        staffMethod: HisStaffMethod.DYNAMIC,
        projects: [],
        projectsSelected: [],
        scope: HisStaffDeptType.Staff,
        score: 0
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
    addPinyin(arr) {
      arr = arr.map(it => ({
        ...it,
        name: it.name || it.label,
        pinyin: strToPinyin(it.name || it.label)
      }));
      arr = arr.map(data => ({
        ...data,
        disabled:
          (data.scope === HisStaffDeptType.Staff && this.onlyHospital) || //机构工分选中后禁用个人工分
          (data.scope === HisStaffDeptType.HOSPITAL && this.onlyPerson) || //个人工分项选中后禁用机构工分
          data.id === '公卫数据' ||
          data.id === '手工数据' ||
          data.id === '其他'
      }));
      for (let current of arr) {
        if (current?.children?.length > 0) {
          current.children = this.addPinyin(current.children);
        }
      }
      return arr;
    },
    filterNode(query, data) {
      try {
        if (!query) return true;
        //模糊匹配字符
        if (data.name.indexOf(query) > -1) return true;
        //模糊匹配拼音首字母
        return data.pinyin.indexOf(query.toLowerCase()) > -1;
      } catch (e) {
        console.error(e);
      } finally {
        this.searchLoading = false;
      }
    },
    staffCheck() {
      let checkedNodes = this.$refs.staffTree.getCheckedNodes();
      for (let c of checkedNodes) {
        if (c?.children?.length > 0) {
          //children内的元素一定都是选上的,所以只保留它们共同的父项
          checkedNodes = checkedNodes.filter(
            it => !c.children.some(child => it.value === child.value)
          );
        }
      }
      this.newWork.staffs = checkedNodes;
    },
    treeCheck() {
      let checkedNodes = this.$refs.tree.getCheckedNodes();
      //先过滤一下不需要传的节点
      checkedNodes = checkedNodes.filter(it => !it.disabled);
      for (let c of checkedNodes) {
        if (c?.children?.length > 0) {
          //children内的元素一定都是选上的,所以只保留它们共同的父项
          checkedNodes = checkedNodes.filter(it => it.parent !== c.id);
        }
      }
      this.newWork.projectsSelected = checkedNodes;
    }
  }
};
</script>

<style scoped>
.work-header {
  display: flex;
  justify-content: space-between;
}
.long-tree {
  max-height: 40vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.cell-long-span {
  width: 100%;
  display: block;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>
