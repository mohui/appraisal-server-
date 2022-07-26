<template>
  <div class="flex-column-layout">
    <div slot="header" class="jx-header">
      <span class="header-title">工分项设置</span>
      <div>
        <el-button size="small" type="warning" @click="itemTypeVisible = true"
          >新增分类</el-button
        >
        <el-button size="small" type="primary" @click="addWorkVisible = true"
          >新增工分项</el-button
        >
      </div>
    </div>
    <el-card
      class="box-card"
      style="height: 100%;flex: 1"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 1px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '0'
      }"
    >
      <el-table
        v-loading="tableLoading"
        v-hidden-scroll
        ref="workTable"
        :row-class-name="rowClassName"
        :key="symbolKey"
        class="work-table-expand"
        size="small"
        :data="reduceTableData"
        height="100%"
        row-key="id"
        style="flex-grow: 1;"
        lazy
        :load="loadTree"
        :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
        @cell-mouse-enter="mouseEnter"
        @cell-mouse-leave="mouseLeave"
        :span-method="spanMethod"
      >
        <el-table-column prop="work" label="工分项">
          <template slot-scope="{row}">
            {{ row.work }}
            <i
              v-show="row.itemTypeId && showDragIcon(row.itemTypeId)"
              class="el-icon-sort"
            ></i>
          </template>
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
          width="100"
        >
          <template slot-scope="{row}">
            <div v-if="!row.staffMappings"></div>
            <el-tooltip
              v-else-if="$widthCompute([row.staffMappings.join(',')]) >= 100"
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
                  row.staffMethod === HisStaffMethod.DYNAMIC && row.scope
                    ? `-${row.scope}`
                    : ''
                }`
              }}
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="scoreMethod"
          label="打分方式"
          align="center"
          width="80"
        >
        </el-table-column>
        <el-table-column prop="remark" align="center" label="备注" width="100">
          <template slot-scope="{row}">
            <el-tooltip
              v-if="$widthCompute([row.remark]) >= 100"
              effect="dark"
              placement="top"
              :content="row.remark"
            >
              <div slot="content" v-html="toBreak(row.remark)"></div>
              <span class="cell-long-span">{{ row.remark }}</span>
            </el-tooltip>
            <div v-else>{{ row.remark }}</div>
          </template>
        </el-table-column>
        <el-table-column
          prop="operation"
          label="操作"
          align="center"
          min-width="150"
        >
          <template slot-scope="{row}">
            <el-tooltip
              v-if="!row.itemTypeId"
              content="移动到"
              :enterable="false"
            >
              <el-button
                type="warning"
                icon="el-icon-folder-add"
                circle
                size="mini"
                @click="moveRow(row)"
              >
              </el-button>
            </el-tooltip>
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
      v-hidden-scroll
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
                  size="small"
                >
                  本人
                </el-button>
                <el-button
                  :disabled="onlyHospital"
                  @click="newWork.scope = HisStaffDeptType.DEPT"
                  :type="
                    newWork.scope === HisStaffDeptType.DEPT ? 'primary' : ''
                  "
                  size="small"
                >
                  本人所在科室
                </el-button>
                <el-button
                  @click="newWork.scope = HisStaffDeptType.HOSPITAL"
                  :type="
                    newWork.scope === HisStaffDeptType.HOSPITAL ? 'primary' : ''
                  "
                  size="small"
                >
                  机构全体员工
                </el-button>
                <el-button
                  @click="
                    () => {
                      newWork.scope = null;
                      newWork.staffMethod = HisStaffMethod.STATIC;
                    }
                  "
                  :disabled="onlyHospital"
                  :type="
                    newWork.staffMethod === HisStaffMethod.STATIC &&
                    !newWork.scope
                      ? 'primary'
                      : ''
                  "
                  size="small"
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
            <el-form-item
              v-if="
                newWork.staffMethod === HisStaffMethod.STATIC && !newWork.scope
              "
              label="固定来源"
              prop="staffs"
            >
              <el-input
                v-model="staffFilterText"
                clearable
                size="mini"
                placeholder="输入关键字进行过滤"
              ></el-input>
              <div v-hidden-scroll class="long-tree">
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
              <div v-hidden-scroll class="long-tree">
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
            <el-form-item
              class="score-method-item"
              label="工分项计算方式"
              prop="scoreMethod"
            >
              <el-button-group>
                <el-button
                  :class="{
                    'el-button--primary':
                      newWork.scoreMethod === HisWorkMethod.SUM,
                    'work-method-btn': true
                  }"
                  plain
                  size="small"
                  @click="newWork.scoreMethod = HisWorkMethod.SUM"
                >
                  {{ HisWorkMethod.SUM }}
                </el-button>
                <el-button
                  :class="{
                    'el-button--primary':
                      newWork.scoreMethod === HisWorkMethod.AMOUNT,
                    'work-method-btn': true
                  }"
                  plain
                  size="small"
                  @click="newWork.scoreMethod = HisWorkMethod.AMOUNT"
                >
                  {{ HisWorkMethod.AMOUNT }}
                </el-button>
              </el-button-group>
              <el-popover placement="right-end" width="400" trigger="hover">
                <i
                  style="font-size: 18px;margin-left: 10px"
                  class="el-icon-warning"
                  slot="reference"
                ></i>
                <div class="example">总和：工分项取值项目来源的总和</div>
                <div class="example">计数：工分项取值项目来源的次数</div>
                <div>
                  例如：门诊的B超项目，一共做了500次，总费用是30000，按照总和取值为30000，按照计数取值为500
                </div>
              </el-popover>
              <span style="float: right">单个工分项标准工作量得分</span>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item prop="score">
              <work-gradient-view
                ref="gradientView"
                :gradient="newWork.gradient"
              ></work-gradient-view>
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
        <el-button
          size="small"
          type="warning"
          @click="isPreView = !isPreView"
          >{{ isPreView ? '取消预览' : '预览' }}</el-button
        >
        <el-button
          v-show="!isPreView"
          size="small"
          @click="resetConfig('workForm')"
          >取 消</el-button
        >
        <el-button
          v-show="!isPreView"
          v-loading="addBtnLoading"
          class="work-submit-loading"
          size="small"
          type="primary"
          @click="submit()"
        >
          确 定
        </el-button>
      </div>
    </el-dialog>
    <work-type-dialog
      :visible="itemTypeVisible"
      :itemType="itemType"
    ></work-type-dialog>
    <el-dialog title="选择分类" :visible.sync="moveRowVisible" width="30%">
      <el-select v-model="newWork.itemType" clearable filterable size="mini">
        <el-option
          v-for="data of itemTypeData"
          :label="data.name"
          :key="data.id"
          :value="data.id"
        ></el-option>
      </el-select>
      <div slot="footer" class="dialog-footer">
        <el-button size="small" @click="resetConfig('workForm')"
          >取 消</el-button
        >
        <el-button
          v-loading="addBtnLoading"
          class="work-submit-loading"
          size="small"
          type="primary"
          @click="submitMove()"
        >
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
import WorkPreview from './component/work-preview';
import WorkTypeDialog from './component/work-type-dialog';
import WorkGradientView from './component/work-gradient-view';
import Sortable from 'sortablejs';

export default {
  name: 'Work',
  components: {WorkPreview, WorkTypeDialog, WorkGradientView},
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
        itemType: '',
        gradient: []
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
            (data.scope === HisStaffDeptType.HOSPITAL && this.isStaffSource) || //不能选机构类型的工分
            data.id === '公卫数据' ||
            data.id === '手工数据' ||
            data.id === '其他'
          );
        }
      },
      filterText: '',
      staffFilterText: '',
      isPreView: false,
      itemTypeVisible: false,
      itemType: {
        id: '',
        name: '',
        sort: 1
      },
      moveRowVisible: false,
      symbolKey: Symbol(this.$dayjs().toString()),
      mouseEnterId: ''
    };
  },
  computed: {
    reduceTableData() {
      const result = this.tableData
        .reduce(
          (pre, next) => {
            //将已有绑定类型的工分项聚合起来
            const itemType = this.itemTypeData.find(
              i => i.id === next.itemType
            );
            if (itemType) {
              const items = pre.find(p => p.id === itemType.id);
              if (items) items.children.push(next);
              if (!items)
                pre.push({
                  id: itemType.id,
                  itemTypeId: itemType.id,
                  name: itemType.name,
                  work: itemType.name,
                  sort: itemType.sort,
                  children: [next],
                  hasChildren: true
                });
            } else {
              //没有类型的工分项单独一列
              pre.push({...next, hasChildren: false});
            }
            return pre;
          },
          //起始数组
          this.itemTypeData.map(it => ({
            ...it,
            itemTypeId: it.id,
            work: it.name,
            sort: it.sort,
            children: [],
            hasChildren: true
          }))
        )
        .map(it => ({
          ...it,
          work: it.children ? `${it.work} (${it.children.length})项` : it.work
        }))
        .sort((a, b) => {
          return a.sort ? (b.sort ? a.sort - b.sort : -1) : 1;
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
        remark: d.remark,
        itemType: d.itemType,
        itemTypeName: d.itemTypeName,
        steps: d.steps
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
    isStaffSource() {
      return this.newWork.scope !== this.HisStaffDeptType.HOSPITAL;
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
      let checkedNodes = this.$refs.tree
        .getCheckedNodes()
        .filter(it => !['其他', '手工数据', '公卫数据'].includes(it.id));
      // 按照长度排序, 父级的id比子集的id短,所以父级会排在前面
      const mappingSorts = checkedNodes.sort(
        (a, b) => a.id.length - b.id.length
      );
      // 定义一个新数组
      const newMappings = [];
      // 排查当父类和子类都在数组中的时候, 过滤掉子类
      for (const sourceIt of mappingSorts) {
        // 是否以(新数组中的元素 + . )开头, 说明其父级已经在新数组中
        const index = newMappings.find(newIt =>
          sourceIt.id.startsWith(`${newIt.id}.`)
        );
        // 如果没有, push进去
        if (!index) {
          newMappings.push(sourceIt);
        }
      }
      //配置好的梯度数据
      const preview_gradient = this.$refs.gradientView.$data.gradientData.map(
        it => ({
          start: it.min,
          end: it.max,
          unit: it.score
        })
      );
      config = {
        name: this.newWork.work,
        method: this.newWork.scoreMethod,
        mappings: newMappings,
        staffMethod: staffMethod,
        staffs: checkedStaffs,
        scope: this.newWork.scope,
        gradient: preview_gradient
      };
      return config;
    }
  },
  mounted() {
    this.setSort();
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
          //获取配置的梯度设置数据
          const newWorkGradient = this.$refs.gradientView.$data.gradientData.map(
            it => ({
              start: it.min,
              end: it.max,
              unit: it.score
            })
          );
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
            this.newWork.projectsSelected.map(it => ({
              id: it.id,
              scope: it.scope
            })), //被选中的项目id
            this.newWork.staffMethod,
            this.newWork.staffMethod === HisStaffMethod.STATIC
              ? this.newWork.staffs.map(it => ({
                  code: it.value,
                  type: it.type
                }))
              : [],
            newWorkGradient,
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
          //更新列表渲染
          this.symbolKey = Symbol(this.$dayjs().toString());
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
      //类型的修改
      if (row.itemTypeId) {
        this.itemType = JSON.parse(
          JSON.stringify({
            id: row.itemTypeId,
            name: row.name,
            sort: row.sort
          })
        );
        this.itemTypeVisible = true;
        return;
      }
      //工分项的修改
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
          remark: row.remark,
          itemType: row.itemType,
          gradient:
            row?.steps?.map(it => ({
              min: it.start,
              max: it.end,
              score: it.unit
            })) || []
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
        if (row.itemTypeId)
          await this.$api.HisWorkItem.workItemTypeDelete(row.id);
        if (!row.itemTypeId) await this.$api.HisWorkItem.delete(row.id);
        this.$message.success('删除成功');
        this.$asyncComputed.serverData.update();
        this.$asyncComputed.itemTypeData.update();
        //更新列表渲染
        this.symbolKey = Symbol(this.$dayjs().toString());
      } catch (e) {
        e !== 'cancel' ? this.$message.error(e?.message) : '';
      } finally {
        row.removeLoading = false;
      }
    },
    resetConfig(ref) {
      this.$refs[ref] && this.$refs[ref].resetFields();
      if (this.$refs.tree) {
        this.$refs.tree.setCheckedKeys([]);
        //将树形结构全部折叠
        for (let i = 0; i < this.workTreeData.length; i++) {
          this.$refs.tree.store.nodesMap[
            this.workTreeData[i].id
          ].expanded = false;
        }
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
        itemType: '',
        gradient: []
      };
      //重置搜索关键词
      this.filterText = '';
      this.staffFilterText = '';
      this.addWorkVisible = false;
      this.isPreView = false;
      this.moveRowVisible = false;
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
      if (data.scope === HisStaffDeptType.HOSPITAL) {
        return `工分项取值来源非"机构全体员工"时不可选`;
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
      // 按照长度排序, 父级的id比子集的id短,所以父级会排在前面
      const mappingSorts = checkedNodes.sort(
        (a, b) => a.id.length - b.id.length
      );
      // 定义一个新数组
      const newMappings = [];
      // 排查当父类和子类都在数组中的时候, 过滤掉子类
      for (const sourceIt of mappingSorts) {
        // 是否以(新数组中的元素 + . )开头, 说明其父级已经在新数组中
        const index = newMappings.find(newIt =>
          sourceIt.id.startsWith(`${newIt.id}.`)
        );
        // 如果没有, push进去
        if (!index) {
          newMappings.push(sourceIt);
        }
      }
      this.newWork.projectsSelected = newMappings;
    },
    //列表树load方法
    loadTree(tree, treeNode, resolve) {
      resolve(tree.children);
    },
    resetItemType() {
      this.itemTypeVisible = false;
      //重置分类数据
      this.itemType = {id: '', name: '', sort: 1};
    },
    resetGradient() {
      //重置分类数据
      this.newWork.gradient = [];
    },
    //移动工分项类型
    moveRow(row) {
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
          remark: row.remark,
          itemType: row.itemType
        })
      );
      this.moveRowVisible = true;
    },
    //提交移动
    async submitMove() {
      try {
        await this.$api.HisWorkItem.updateItemType(
          this.newWork.id,
          this.newWork.itemType || null
        );
        this.$message.success('操作成功');
        this.symbolKey = Symbol(this.$dayjs().toString());
        this.$asyncComputed.serverData.update();
        this.resetConfig('workForm');
      } catch (e) {
        this.$message.error(e.message);
        console.log(e.message);
      }
    },
    rowClassName({row}) {
      return row.itemTypeId ? 'drag-row' : '';
    },
    //拖拽方法
    setSort() {
      const el = this.$refs.workTable.$el.querySelectorAll(
        '.el-table__body-wrapper > table > tbody'
      )[0];
      this.sortable = Sortable.create(el, {
        ghostClass: 'sortable-ghost',
        animation: 200,
        draggable: '.drag-row',
        setData: function(dataTransfer) {
          dataTransfer.setData('Text', '');
        },
        onEnd: async evt => {
          const newIndex = evt.newIndex;
          const oldIndex = evt.oldIndex;
          if (newIndex !== oldIndex) {
            //最新的分类排序元素
            const newSortData = [...el.getElementsByClassName('drag-row')].map(
              (it, index) => {
                //抽出分类的名字
                const typeName = it.textContent.split('(')[0].trim();
                //根据名字找他们的分类信息
                const type = this.itemTypeData.find(it => it.name === typeName);
                return {...type, sort: index + 1};
              }
            );
            //排序被修改的数据
            const needSort = newSortData.filter(
              it =>
                this.itemTypeData.find(item => item.id === it.id)?.sort !==
                it.sort
            );
            //批量更新一下排序
            for (let it of needSort) {
              await this.$api.HisWorkItem.workItemTypeUpsert(
                it.id,
                it.name,
                it.sort
              );
            }
            this.$asyncComputed.itemTypeData.update();
            this.symbolKey = Symbol(this.$dayjs().toString());
            this.$nextTick(() => {
              this.setSort();
            });
            this.$message.success('排序成功');
          }
        }
      });
    },
    //是否显示拖拽icon
    showDragIcon(id) {
      return id === this.mouseEnterId;
    },
    //鼠标进出单元格
    mouseEnter(row) {
      this.mouseEnterId = row.id;
    },
    mouseLeave() {
      this.mouseEnterId = null;
    },
    //spanMethod
    spanMethod({row, column}) {
      if (row.itemTypeId) {
        if (column.property === 'work' || column.property === 'operation') {
          return [1, 1];
        }
        if (column.property === 'remark') {
          return [1, 4];
        }
        return [1, 0];
      }
      return [1, 1];
    }
  }
};
</script>

<style lang="scss" scoped>
@import '../../styles/vars';

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
  padding: 0 10px;
}
.work-method-btn {
  border-radius: 4px;
}
.example {
  font-weight: bold;
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
.sortable-ghost {
  opacity: 0.8;
  color: #fff !important;
  background: #42b983 !important;
}
.drag-row:hover {
  cursor: move;
}
.score-method-item {
  &.el-form-item {
    margin-bottom: 0;
  }
}
</style>
