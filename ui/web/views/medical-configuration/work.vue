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
        <span>工分项设置</span>
        <div>
          <el-button size="mini" type="warning" @click="itemTypeVisible = true"
            >新增分类</el-button
          >
          <el-button size="mini" type="primary" @click="addWorkVisible = true"
            >新增工分项</el-button
          >
        </div>
      </div>
      <el-table
        v-loading="tableLoading"
        border
        class="work-table-expand"
        size="small"
        :data="reduceTableData"
        height="100%"
        row-key="id"
        style="flex-grow: 1;"
        lazy
        :load="loadTree"
        :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
      >
        <el-table-column prop="work" align="center" label="工分项">
        </el-table-column>
        <el-table-column
          prop="project"
          label="关联项目"
          align="center"
          width="300"
        >
          <template slot-scope="{row}">
            <div v-if="!row.projects"></div>
            <el-tooltip
              v-else-if="$widthCompute([row.projects.join(',')]) >= 300"
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
            <div v-if="!row.staffMappings"></div>
            <el-tooltip
              v-else-if="$widthCompute([row.staffMappings.join(',')]) >= 300"
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
            <div v-else>
              {{
                `${row.staffMappings.join(',')}${
                  row.staffMethod === HisStaffMethod.DYNAMIC
                    ? `-${row.scope}`
                    : ''
                }`
              }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="scoreMethod" label="打分方式" align="center">
        </el-table-column>
        <el-table-column prop="score" align="center" label="单位量得分">
        </el-table-column>
        <el-table-column prop="remark" align="center" label="备注">
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
      :width="$settings.isMobile ? '99%' : isPreView ? '60%' : '40%'"
      :before-close="() => resetConfig('workForm')"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
    >
      <el-form
        ref="workForm"
        class="dialog-form"
        :model="newWork"
        :rules="workRules"
        label-position="left"
        label-width="160px"
      >
        <el-row v-show="!isPreView">
          <el-col :span="24">
            <el-form-item label="工分项名称" prop="work">
              <el-input v-model="newWork.work" size="mini"> </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="工分项类型">
              <el-select
                v-model="newWork.itemType"
                clearable
                filterable
                size="mini"
              >
                <el-option
                  v-for="data of itemTypeData"
                  :label="data.name"
                  :key="data.id"
                  :value="data.id"
                ></el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="工分项取值员工来源" prop="staffMethod">
              <el-button-group>
                <el-button
                  :disabled="onlyHospital"
                  @click="newWork.scope = HisStaffDeptType.Staff"
                  :type="
                    newWork.scope === HisStaffDeptType.Staff ? 'primary' : ''
                  "
                  size="mini"
                >
                  本人
                </el-button>
                <el-button
                  :disabled="onlyHospital"
                  @click="newWork.scope = HisStaffDeptType.DEPT"
                  :type="
                    newWork.scope === HisStaffDeptType.DEPT ? 'primary' : ''
                  "
                  size="mini"
                >
                  本人所在科室
                </el-button>
                <el-button
                  @click="newWork.scope = HisStaffDeptType.HOSPITAL"
                  :type="
                    newWork.scope === HisStaffDeptType.HOSPITAL ? 'primary' : ''
                  "
                  size="mini"
                >
                  机构全体员工
                </el-button>
                <el-button
                  @click="newWork.scope = null"
                  :disabled="onlyHospital"
                  :type="!newWork.scope ? 'primary' : ''"
                  size="mini"
                >
                  其他固定配置
                </el-button>
              </el-button-group>
              <div v-show="onlyHospital" style="color: #CC3300;font-size: 14px">
                所选工分项仅适用于机构范围
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item v-if="!newWork.scope" label="固定来源" prop="staffs">
              <el-input
                v-model="staffFilterText"
                clearable
                size="mini"
                placeholder="输入关键字进行过滤"
              ></el-input>
              <div class="long-tree">
                <el-tree
                  ref="staffTree"
                  :data="staffTree"
                  :default-checked-keys="newWork.staffs"
                  node-key="value"
                  show-checkbox
                  :filter-node-method="
                    (query, data) => filterNode(query, data, this.staffTree)
                  "
                  @check="staffCheck"
                ></el-tree>
              </div>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="工分项取值项目来源" prop="projectsSelected">
              <el-input
                v-model="filterText"
                clearable
                size="mini"
                placeholder="输入关键字进行过滤"
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
                  node-key="id"
                  show-checkbox
                  :filter-node-method="
                    (query, node) => filterNode(query, node, this.treeData)
                  "
                  @check="treeCheck"
                >
                  <span slot-scope="{node, data}">
                    <span style="font-size: 14px; color: #606266">{{
                      `${data.name}`
                    }}</span>
                    <span
                      v-show="
                        node.disabled &&
                          !['其他', '手工数据', '公卫数据'].includes(data.name)
                      "
                    >
                      <el-popover
                        placement="right"
                        width="200"
                        trigger="hover"
                        :content="disabledContent(data)"
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
          <el-col :span="24">
            <el-form-item label="工分项计算方式" prop="scoreMethod">
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
            <el-form-item label="单个工分项标准工作量" prop="score">
              <el-input-number
                size="mini"
                v-model="newWork.score"
              ></el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注" props="remark">
              <el-input
                v-model="newWork.remark"
                type="textarea"
                size="mini"
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        <work-preview :config="previewConfig" v-if="isPreView"></work-preview>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button size="mini" type="warning" @click="isPreView = !isPreView">{{
          isPreView ? '取消预览' : '预览'
        }}</el-button>
        <el-button
          v-show="!isPreView"
          size="mini"
          @click="resetConfig('workForm')"
          >取 消</el-button
        >
        <el-button
          v-show="!isPreView"
          v-loading="addBtnLoading"
          class="work-submit-loading"
          size="mini"
          type="primary"
          @click="submit()"
        >
          确 定
        </el-button>
      </div>
    </el-dialog>
    <work-type-dialog :visible="itemTypeVisible"></work-type-dialog>
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
import WorkPreview from './component/work-preview';
import WorkTypeDialog from './component/work-type-dialog';

export default {
  name: 'Work',
  components: {WorkPreview, WorkTypeDialog},
  data() {
    const validaProjects = (rule, value, callback) => {
      if (this.newWork.projectsSelected.length < 1) {
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
        scope: HisStaffDeptType.Staff,
        remark: '',
        itemType: ''
      },
      addWorkVisible: false,
      workRules: {
        work: [{required: true, message: '填写工分项', trigger: 'change'}],
        projectsSelected: [{validator: validaProjects, trigger: 'blur'}]
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
        label: 'name',
        disabled: data => {
          return (
            (data.scope === HisStaffDeptType.Staff && this.onlyHospital) || //机构工分选中后禁用个人工分
            (data.scope === HisStaffDeptType.HOSPITAL && this.onlyPerson) || //个人工分项选中后禁用机构工分
            data.id === '公卫数据' ||
            data.id === '手工数据' ||
            data.id === '其他'
          );
        }
      },
      filterText: '',
      staffFilterText: '',
      isPreView: false,
      itemTypeVisible: false
    };
  },
  computed: {
    reduceTableData() {
      const result = this.tableData
        .reduce((pre, next) => {
          const itemType = this.itemTypeData.find(i => i.id === next.itemType);
          if (itemType) {
            const items = pre.find(p => p.id === itemType.id);
            if (items) items.children.push(next);
            if (!items)
              pre.push({
                id: itemType.id,
                itemTypeId: itemType.id,
                work: itemType.name,
                sort: itemType.sort,
                children: [next],
                hasChildren: true
              });
          } else {
            pre.push({...next, hasChildren: false});
          }
          return pre;
        }, [])
        .sort((a, b) => {
          return a.sort ? (b.sort ? b.sort - a.sort : -1) : 1;
        });
      return result;
    },
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
        scope: d.scope,
        score: d.score || 0,
        remark: d.remark,
        itemType: d.itemType,
        itemTypeName: d.itemTypeName
      }));
    },
    treeData() {
      return this.workTreeData;
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
    },
    //预览的参数预处理
    previewConfig() {
      let config = {};
      //没有配置取值范围则员工方法是"固定",否则为"动态"
      const staffMethod = !this.newWork.scope
        ? HisStaffMethod.STATIC
        : HisStaffMethod.DYNAMIC;
      let checkedStaffs = [];
      if (staffMethod === HisStaffMethod.STATIC) {
        //来源员工换成对象格式
        checkedStaffs = this.$refs.staffTree.getCheckedNodes();
        for (let c of checkedStaffs) {
          if (c?.children?.length > 0) {
            //children内的元素一定都是选上的,所以只保留它们共同的父项
            checkedStaffs = checkedStaffs.filter(
              it => !c.children.some(child => it.value === child.value)
            );
          }
        }
      }
      config = {
        name: this.newWork.work,
        method: this.newWork.scoreMethod,
        mappings: this.newWork.projectsSelected,
        staffMethod: staffMethod,
        staffs: checkedStaffs,
        score: this.newWork.score,
        scope: this.newWork.scope
      };
      return config;
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
        return this.addPinyin(await this.$api.HisWorkItem.sources(null, null));
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
    },
    itemTypeData: {
      async get() {
        try {
          return await this.$api.HisWorkItem.workItemTypeList();
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
          //没有配置取值范围则员工方法是"固定",否则为"动态"
          this.newWork.staffMethod = !this.newWork.scope
            ? HisStaffMethod.STATIC
            : HisStaffMethod.DYNAMIC;
          //提交前过滤一下树节点,保证被选节点是对象数据
          if (this.newWork.staffMethod === HisStaffMethod.STATIC)
            this.staffCheck();
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
            this.newWork.scope,
            this.newWork.remark || null,
            this.newWork.itemType || null
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
      if (row.itemTypeId) {
        return;
      }
      this.newWork = JSON.parse(
        JSON.stringify({
          id: row.id,
          work: row.work,
          scoreMethod: row.scoreMethod,
          projectsSelected: row.mappings
            .map(m => ({
              name: m.name,
              id: m.id,
              scope: this.findItem(m.id, this.workTreeData)?.scope
            }))
            .filter(it => it.scope), //过滤掉可能不存在的树节点
          projects: [],
          staffMethod: row.staffMethod,
          staffs: row.staffIdMappings,
          scope: row.scope,
          score: row.score,
          remark: row.remark,
          itemType: row.itemType
        })
      );
      this.addWorkVisible = true;
    },
    findItem(id, arr) {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].id && arr[i].id === id) return arr[i];
        if (arr[i].value && arr[i].value === id) return arr[i];
        const ret = this.findItem(id, arr[i]?.children ?? []);
        if (ret) return ret;
      }
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
        staffs: [],
        projects: [],
        projectsSelected: [],
        score: 0,
        scope: HisStaffDeptType.Staff,
        itemType: ''
      };
      //重置搜索关键词
      this.filterText = '';
      this.staffFilterText = '';
      this.addWorkVisible = false;
      this.isPreView = false;
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
      for (let current of arr) {
        if (current?.children?.length > 0) {
          current.children = this.addPinyin(current.children);
        }
      }
      return arr;
    },
    filterNode(query, data, sourceTree) {
      try {
        if (!query) return true;

        //模糊匹配字符
        if (data.name.indexOf(query) > -1) return true;
        //模糊匹配拼音首字母
        if (data.pinyin.indexOf(query.toLowerCase()) > -1) return true;
        //检查当前节点的父节点是否满足条件
        if (data.parent) {
          const parent = this.findItem(data.parent, sourceTree);
          return this.filterNode(query, parent, sourceTree);
        }
        return false;
      } catch (e) {
        console.error(e);
      } finally {
        this.searchLoading = false;
      }
    },
    disabledContent(data) {
      if (data.scope === HisStaffDeptType.Staff) {
        return `不能与${HisStaffDeptType.HOSPITAL}工分同时选`;
      }
      if (data.scope === HisStaffDeptType.HOSPITAL) {
        return `不能与${HisStaffDeptType.Staff}工分同时选`;
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
      checkedNodes = checkedNodes.filter(
        it => !['其他', '手工数据', '公卫数据'].includes(it.id)
      );
      for (let c of checkedNodes) {
        if (c?.children?.length > 0) {
          //children内的元素一定都是选上的,所以只保留它们共同的父项
          checkedNodes = checkedNodes.filter(it => it.parent !== c.id);
        }
      }
      this.newWork.projectsSelected = checkedNodes;
    },
    //列表树load方法
    loadTree(tree, treeNode, resolve) {
      resolve(tree.children);
    },
    resetItemType() {
      this.itemTypeVisible = false;
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
  max-height: 20vh;
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
.dialog-form {
  max-height: 60vh;
  padding: 0 30px;
}
</style>
<style lang="scss">
.work-submit-loading {
  .el-loading-mask {
    .el-loading-spinner {
      margin-top: -10px;
      .circular {
        width: 20px;
        height: 20px;
      }
    }
  }
}
.work-table-expand {
  .el-table__row--level-1 {
    background: #f8f8ff;
  }
}
</style>
