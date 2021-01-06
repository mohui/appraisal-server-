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
      <div slot="header" class="clearfix">
        <span>规则列表</span>
        <el-button
          v-permission="{permission: permission.CHECK_ADD, type: 'disabled'}"
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="openAddCheckDialog"
          >新建规则
        </el-button>
      </div>
      <el-table
        stripe
        border
        size="mini"
        :data="checkList"
        :cell-class-name="cellClassHover"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{
          background: '#F3F4F7',
          color: '#555',
          textAlign: 'center'
        }"
        @row-click="handleCellClick"
      >
        <el-table-column align="center" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          align="center"
          prop="checkName"
          :min-width="computedColWidth('checkName')"
          label="考核名称"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="checkYear"
          :min-width="50"
          label="考核年度"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="created_at"
          :min-width="computedColWidth('created_at')"
          label="创建时间"
        ></el-table-column>
        <el-table-column
          align="center"
          :min-width="computedColWidth('status')"
          label="状态"
        >
          <template slot-scope="scope">
            {{ scope.row.status ? '启用' : '停用' }}
          </template>
        </el-table-column>
        <el-table-column
          align="center"
          prop="runTime"
          :min-width="computedColWidth('runTime')"
          label="打分时间"
        ></el-table-column>
        <el-table-column align="center" min-width="70" label="适用机构">
          <template slot-scope="scope">
            <el-button
              v-permission="{
                permission: permission.CHECK_SELECT_HOSPITAL,
                type: 'disabled'
              }"
              plain
              type="primary"
              size="mini"
              @click.stop="openSelectDialog(scope.row)"
              >{{ scope.row.hospitalCount }}
            </el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="280">
          <template slot-scope="scope">
            <div v-show="!scope.row.running">
              <el-tooltip content="编辑" :enterable="false">
                <el-button
                  v-permission="{
                    permission: permission.CHECK_UPDATE,
                    type: 'disabled'
                  }"
                  :disabled="
                    scope.row.checkYear !==
                      $dayjs()
                        .year()
                        .toString()
                  "
                  type="primary"
                  icon="el-icon-edit"
                  circle
                  size="mini"
                  @click.stop="openEditCheckDialog(scope.row)"
                >
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除" :enterable="false">
                <el-button
                  v-permission="{
                    permission: permission.CHECK_REMOVE,
                    type: 'disabled'
                  }"
                  :disabled="
                    scope.row.checkYear !==
                      $dayjs()
                        .year()
                        .toString()
                  "
                  icon="el-icon-delete"
                  circle
                  type="danger"
                  size="mini"
                  @click.stop="delCheck(scope)"
                >
                </el-button>
              </el-tooltip>
              <el-tooltip
                :content="scope.row.running ? '正在打分...' : `实时打分`"
                :enterable="false"
              >
                <el-button
                  v-permission="{
                    permission: permission.CHECK_UPDATE,
                    type: 'disabled'
                  }"
                  icon="el-icon-refresh-right"
                  circle
                  size="mini"
                  type="info"
                  @click.stop="tempCheck(scope.row)"
                >
                </el-button>
              </el-tooltip>
              <el-tooltip content="全部开启打分" :enterable="false">
                <el-button
                  v-show="scope.row.isOpen"
                  v-permission="{
                    permission: permission.CHECK_OPEN_GRADE,
                    type: 'disabled'
                  }"
                  icon="el-icon-check"
                  circle
                  type="success"
                  size="mini"
                  @click.stop="openCheck(scope.row)"
                >
                </el-button>
              </el-tooltip>
              <el-tooltip content="全部关闭打分" :enterable="false">
                <el-button
                  v-show="scope.row.isClose"
                  v-permission="{
                    permission: permission.CHECK_CLOSE_GRADE,
                    type: 'disabled'
                  }"
                  icon="el-icon-close"
                  circle
                  size="mini"
                  @click.stop="closeCheck(scope.row)"
                >
                </el-button>
              </el-tooltip>
            </div>
            <div v-show="scope.row.running">
              <i class="el-icon-loading"></i> 正在打分 (预计5分钟完成)
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        background
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :total="listCheck.count"
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
      :title="checkForm.checkId ? '修改规则' : '新建规则'"
      :visible.sync="dialogFormAddChecksVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
    >
      <el-form :model="checkForm" label-position="right" label-width="120px">
        <el-form-item label="考核名称：">
          <el-input v-model="checkForm.checkName"></el-input>
        </el-form-item>
        <el-form-item label="状态：">
          <el-radio v-model="checkForm.status" :label="true">启用</el-radio>
          <el-radio v-model="checkForm.status" :label="false">禁用</el-radio>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormAddChecksVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveCheck">
          确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="快速复制"
      :visible.sync="dialogFormCloneChecksVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
    >
      <el-form :model="checkForm" label-position="right" label-width="120px">
        <el-form-item label="复制考核名称：">
          {{ checkForm.checkName }}
        </el-form-item>
        <el-form-item label="考核名称：">
          <el-input v-model="checkForm.cloneName"></el-input>
        </el-form-item>
        <el-form-item label="状态：">
          <el-radio v-model="checkForm.status" :label="true">启用</el-radio>
          <el-radio v-model="checkForm.status" :label="false">禁用</el-radio>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormCloneChecksVisible = false">
          取 消
        </el-button>
        <el-button type="primary" :loading="submitting" @click="cloneCheck">
          {{ submitting ? '提交中...' : '确 定' }}
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="批量导入细则"
      :visible.sync="dialogUploadFormVisible"
      :before-close="handleClose"
      :width="$settings.isMobile ? '99%' : '50%'"
    >
      <el-form :model="checkForm" label-position="right" label-width="120px">
        <el-form-item label="考核名称：">
          {{ checkForm.checkName }}
        </el-form-item>
        <el-form-item label="状态：">
          <el-radio v-model="checkForm.status" :label="true">
            覆盖原有考核细则
          </el-radio>
          <el-radio v-model="checkForm.status" :label="false">
            增量更新考核细则
          </el-radio>
        </el-form-item>
        <el-form-item label="上传文件：">
          <el-upload
            ref="uploadForm"
            class="upload-demo"
            :multiple="false"
            :action="importUrl"
            :headers="headers"
            :data="uploadData"
            :before-upload="handleBeforeUpload"
            :on-progress="handleProgress"
            :on-success="uploadSuccess"
            :on-error="uploadError"
            :on-exceed="handleExceed"
            :limit="1"
            :file-list="fileList"
            :auto-upload="false"
          >
            <el-button plain size="small" type="primary">点击上传</el-button>
            <span class="el-alert--warning is-light">只能上传xls文件</span>
          </el-upload>
        </el-form-item>
        <el-form-item label="模板下载：">
          <span class="el-alert--error is-light">
            请按照模板要求及格式填写上传
          </span>
          <el-button
            plain
            type="primary"
            size="small"
            @click="downloadTemplate"
          >
            模板下载
          </el-button>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button plain @click="dialogUploadFormVisible = false">
          取 消
        </el-button>
        <el-button
          plain
          type="primary"
          :loading="uploadLoading"
          @click="saveUploadRules"
          >确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="选择机构"
      :visible.sync="dialogSelectVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
      @closed="handleCheckOrganizationDialogClose"
    >
      <el-row>
        <el-col :span="24">
          <div class="checked-organization-box">
            <span>
              <el-tag
                v-for="node in checkedNodes"
                :key="node.code"
                style="margin: 5px"
                closable
                @close="handleTagClose(node.code)"
              >
                {{ node.name }}
              </el-tag>
            </span>
          </div>
        </el-col>
      </el-row>
      <el-divider></el-divider>
      <el-row>
        <el-col :span="24">
          <div
            v-loading="$asyncComputed.treeServerData.updating"
            class="organization-box"
          >
            <el-tree
              ref="tree"
              :data="treeData"
              node-key="code"
              :props="props"
              :load="loadNode"
              :default-checked-keys="checkedKeys"
              :default-expanded-keys="expandedKeys"
              lazy
              show-checkbox
              check-strictly
              @check-change="handleCheckChange"
              @node-expand="handleNodeExpand"
              @node-collapse="handleNodeCollapse"
            >
              <span slot-scope="{node, data}" class="custom-tree-node">
                <span style="font-size: 14px; color: #606266">{{
                  node.label
                }}</span>
                <span v-if="!data.usable">
                  <el-popover
                    placement="right"
                    width="200"
                    trigger="hover"
                    :content="`该组织已被《${data.system}》考核`"
                  >
                    <i slot="reference" class="el-icon-warning-outline"> </i>
                  </el-popover>
                </span>
              </span>
            </el-tree>
          </div>
        </el-col>
      </el-row>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogSelectVisible = false">取 消</el-button>
        <el-button
          type="primary"
          @click="saveOrganization"
          :disabled="
            checkForm.checkYear !==
              $dayjs()
                .year()
                .toString()
          "
          >确 定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';

export default {
  name: 'Check',
  data() {
    return {
      timer: null, // 考核体系列表接口调用定时器
      permission: Permission,
      maxSize: 5,
      progress: 0,
      submitting: false,
      dialogSelectVisible: false,
      dialogFormAddChecksVisible: false,
      dialogFormCloneChecksVisible: false,
      dialogUploadFormVisible: false,
      formLabelWidth: '100px',
      checkForm: {
        checkId: '',
        checkName: '',
        cloneName: '',
        checkYear: this.$dayjs().year(),
        status: true
      },
      searchForm: {
        pageSize: 20,
        pageNo: 1
      },
      hospitalList: [],
      fileList: [],
      importUrl: 'uploadUrl',
      headers: {token: "getCookie('account')"},
      code: this.$settings.user.code,
      props: {
        label: 'name',
        children: 'children'
      },
      //选中的节点数组
      checkedNodes: [],
      //默认展开的节点
      expandedKeys: []
    };
  },
  computed: {
    checkList() {
      return this.listCheck.rows.map(it => ({
        ...it,
        autoScore:
          it.auto === 'all'
            ? '全部开启'
            : it.auto === 'part'
            ? '部分开启'
            : it.auto === 'no'
            ? '全部关闭'
            : '',
        isOpen:
          (it.auto === 'no' || it.auto === 'part') &&
          it.hospitalCount !== 0 &&
          it.status,
        isClose:
          (it.auto === 'all' || it.auto === 'part') &&
          it.hospitalCount !== 0 &&
          it.status,
        created_at: it.created_at.$format('YYYY-MM-DD'),
        updated_at: it.updated_at.$format('YYYY-MM-DD'),
        runTime: it?.runTime?.$format('YYYY-MM-DD HH:mm:ss') ?? ''
      }));
    },
    uploadData() {
      return {
        checkId: JSON.stringify(this.checkForm.checkId),
        flag:
          this.checkForm.radio === '1'
            ? JSON.stringify('Y')
            : JSON.stringify('N')
      };
    },
    uploadLoading() {
      return this.progress > 0 && this.progress < 100;
    },
    //树的根节点值
    treeData() {
      return this.treeServerData.map(it => {
        return {
          ...it,
          disabled: !it.usable
        };
      });
    },
    //选中的节点key
    checkedKeys() {
      return this.checkedNodes.map(it => it.code);
    }
  },
  watch: {
    treeServerData() {
      this.treeServerData.forEach(it => {
        //记录选中的节点
        if (it.selected) this.checkedNodes.push({...it, disabled: !it.usable});
        //展开含有选中项的节点
        if (it.childSelected) this.expandedKeys.push(it.code);
      });
    }
  },
  created() {
    this.timer = setInterval(() => {
      this.$asyncComputed.listCheck.update();
    }, 5000);
  },
  destroyed() {
    this.timer && clearInterval(this.timer);
  },
  asyncComputed: {
    listCheck: {
      async get() {
        return await this.$api.Score.checks(this.searchForm);
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    },
    //服务器返回的树的根节点值
    treeServerData: {
      async get() {
        return await this.$api.CheckAreaEdit.list(
          this.code,
          this.checkForm.checkId
        );
      },
      default() {
        return [];
      },
      shouldUpdate() {
        return this.checkForm.checkId !== '';
      }
    }
  },
  methods: {
    //临时考核打分
    async tempCheck(row) {
      if (!row.running) {
        row.running = true;
        this.$api.Score.autoScoreBackJob(row.checkId, false);
        // this.$api.Score.autoScore(row.checkId, false);
        //刷新列表
        this.$asyncComputed.listCheck.update();
      }
    },
    //打开机构对话框
    openSelectDialog(item) {
      this.checkForm = Object.assign({}, item);
      this.dialogSelectVisible = true;
    },
    //保存选取的机构
    async saveOrganization() {
      const codes = this.$refs.tree.getCheckedKeys();
      try {
        await this.$api.CheckAreaEdit.editArea(this.checkForm.checkId, codes);
        this.$asyncComputed.listCheck.update();
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.dialogSelectVisible = false;
      }
    },
    //设置规则标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'check-title';
    },
    //点击规则标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'checkName')
        return this.$router.push({
          name: 'rule',
          query: {
            checkId: row.checkId,
            checkName: encodeURIComponent(row.checkName),
            checkYear: row.checkYear
          }
        });
    },
    //打开添加规则对话框
    openAddCheckDialog() {
      this.dialogFormAddChecksVisible = true;
      this.checkForm = {
        checkId: '',
        checkName: '',
        cloneName: '',
        checkYear: this.$dayjs().year(),
        status: true
      };
    },
    //保存规则
    saveCheck() {
      if (this.checkForm.checkId) {
        this.editCheck();
      } else {
        this.addCheck();
      }
    },
    //添加规则
    async addCheck() {
      const {checkName} = this.checkForm;
      if (!checkName) {
        this.$message.error('考核名称不能为空');
        return;
      }
      try {
        await this.$api.CheckSystem.add({checkName});
        this.$asyncComputed.listCheck.update();
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.dialogFormAddChecksVisible = false;
      }
    },
    //打开编辑规则对话框
    openEditCheckDialog(item) {
      this.checkForm = Object.assign({}, item);
      this.dialogFormAddChecksVisible = true;
    },
    //修改规则
    async editCheck() {
      const {checkId, checkName, status} = this.checkForm;
      if (!checkName) {
        this.$message.info('考核名称不能为空');
        return;
      }
      try {
        await this.$api.CheckSystem.updateName({
          checkId,
          checkName,
          status
        });
        this.$asyncComputed.listCheck.update();
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.dialogFormAddChecksVisible = false;
      }
    },
    //打开克隆规则对话框
    openCloneCheckDialog(item) {
      this.checkForm = Object.assign({}, item);
      this.dialogFormCloneChecksVisible = true;
    },
    //保存克隆规则
    async cloneCheck() {
      if (this.submitting) return;
      this.submitting = true;
      try {
        //获取被克隆的考核ID,及新的考核名称
        const {checkId, cloneName} = this.checkForm;
        if (!cloneName) {
          this.$message.info('考核名称不能为空');
          return;
        }
        //创建新的考核记录
        const result = await this.$api.CheckSystem.add({checkName: cloneName});
        //获得新考核ID
        const newCheckId = result.checkId;

        //查询被克隆的细则列表
        const listRule = await this.$api.CheckSystem.listRule({
          checkId: checkId
        });
        //遍历细则，重新创建
        const newListRule = listRule.rows.map(async it => {
          //重新创建分类
          const newGroup = await this.$api.CheckSystem.addRuleGroup({
            checkId: newCheckId,
            ruleName: it.ruleName
          });

          for (const item of it.group) {
            //重新创建细则
            const {
              ruleName,
              ruleScore,
              checkStandard,
              checkMethod,
              evaluateStandard,
              status,
              ruleTags
            } = item;
            let newRule = await this.$api.CheckSystem.addRule({
              checkId: newCheckId,
              ruleName,
              parentRuleId: newGroup.ruleId,
              ruleScore,
              checkStandard,
              checkMethod,
              status,
              evaluateStandard
            });
            //设置指标
            if (ruleTags?.length) {
              await this.$api.RuleTag.upsert({
                ruleId: newRule.ruleId,
                tags: ruleTags.map(its => {
                  delete its.id;
                  delete its.name;
                  return its;
                })
              });
            }
          }
        });

        Promise.all(newListRule)
          .then(() => {
            this.$message({
              type: 'success',
              message: '快速复制成功！'
            });
          })
          .catch(err => this.$message.error(err.message));
        this.$asyncComputed.listCheck.update();
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.dialogFormCloneChecksVisible = false;
        this.submitting = false;
      }
    },
    //开启规则
    async openCheck(item) {
      try {
        await this.$api.Hospital.setAllRuleAuto(item.checkId, true);
        this.$message({
          type: 'success',
          message: '全部开启成功！'
        });
        this.$asyncComputed.listCheck.update();
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //关闭规则
    async closeCheck(item) {
      try {
        await this.$api.Hospital.setAllRuleAuto(item.checkId, false);
        this.$message({
          type: 'success',
          message: '全部关闭成功！'
        });
        this.$asyncComputed.listCheck.update();
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    handleClose() {
      this.fileList = [];
      this.dialogUploadFormVisible = false;
    },
    handleBeforeUpload(file) {
      const fType = ['xls', 'xlsx'];
      const fName = file.name
        .split('.')
        .pop()
        .toLowerCase();
      const hasType = fType.some(it => it === fName);
      const isLt5M = file.size / 1024 / 1024 < this.maxSize;

      if (!hasType) {
        this.$message.error("仅允许上传'xls','xlsx'格式文件！");
        return false;
      }
      if (!isLt5M) {
        this.$message.error(`文件大小不能超过${this.maxSize}M!`);
        return false;
      }
      return true;
    },
    handleProgress(event) {
      this.progress = Number(event.percent.toFixed(2));
    },
    uploadSuccess(res) {
      try {
        if (res.checkId) {
          this.$message({
            type: 'success',
            message: '批量导入细则成功'
          });
          this.$asyncComputed.listCheck.update();
        }
      } catch (e) {
        this.$message.error(e.message);
      }
      this.fileList = [];
    },
    uploadError(err) {
      this.$message(err);
    },
    handleExceed() {
      this.$message('最多只能上传一个文件!');
    },
    downloadTemplate() {
      window.open('/公卫考核细则导入模板.xls');
    },
    openUploadCheckDialog(item) {
      this.dialogUploadFormVisible = true;
      this.checkForm = Object.assign({}, item);
    },
    async saveUploadRules() {
      await this.$refs.uploadForm.submit();
      this.dialogUploadFormVisible = false;
    },
    //删除规则
    delCheck({$index, row}) {
      this.$confirm('此操作将永久删除此规则, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.CheckSystem.remove(row.checkId);
            this.checkList.splice($index, 1);
            this.$message({
              type: 'success',
              message: '删除成功!'
            });
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消删除'
          });
        });
    },
    computedColWidth(field) {
      if (this.checkList.length > 0) {
        return this.$widthCompute(this.checkList.map(item => item[field]));
      }
    },
    //加载子树数据
    async loadNode(node, resolve) {
      if (node.level === 0) return resolve(this.treeData);
      const checked = node.checked;
      const children = (
        await this.$api.CheckAreaEdit?.list(
          node.data.code,
          this.checkForm.checkId
        )
      ).map(it => {
        const node = {...it, disabled: !it.usable};
        //记录选中的节点,并没有重复添加
        if (it.selected && !this.checkedNodes.some(c => c.code === it.code))
          this.checkedNodes.push(node);
        if (
          it.childSelected &&
          !this.expandedKeys.some(c => c.code === it.code)
        )
          this.expandedKeys.push(it.code);
        return node;
      });
      //如果有叶子节点，设置该节点不可点击
      if (node.data && children.length > 0) node.data.disabled = true;
      //如果没有叶子节点，将该节点的选中状态还原（因为在handleNodeExpand方法中，节点展开时会设置节点的选中状态为false）
      if (node.checked && children.length === 0) node.checked = checked;
      return resolve(children);
    },
    //节点选中状态发生变化时的回调
    handleCheckChange() {
      //获取目前被选中的节点所组成的数组
      this.checkedNodes = this.$refs.tree.getCheckedNodes();
    },
    //节点被展开时触发的事件
    handleNodeExpand(data, node) {
      if (node.childNodes?.length ?? 0 > 0) data.disabled = true;
      node.checked = false;
    },
    //节点被关闭时触发的事件
    handleNodeCollapse(data, node) {
      if (data.usable) data.disabled = false;
      //取消叶子节点的选中
      this.handleUncheck(node);
    },
    //递归该节点下所有页节点并取消选中
    handleUncheck(node) {
      if (node.childNodes?.length > 0) {
        for (const node of node.childNodes) {
          this.handleUncheck(node);
        }
      } else node.checked = false;
    },
    //关闭标签
    handleTagClose(key) {
      const index = this.checkedNodes.findIndex(it => it.code === key);
      if (index !== -1) {
        this.checkedNodes.splice(index, 1);
        //取消该节点的选中
        this.$refs.tree.setChecked(key, false);
      }
    },
    //关闭选择适用机构的dialog
    handleCheckOrganizationDialogClose() {
      //将选中的节点数组清除
      this.checkedNodes = [];
      //默认展开的节点数组清除
      this.expandedKeys = [];
    }
  }
};
</script>

<style lang="scss">
.check-title {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}
</style>
<style scoped lang="scss">
.organization-box {
  height: 50vh;
  overflow-y: auto;
  overflow-x: hidden;
}
.checked-organization-box {
  max-height: 150px;
  overflow-y: auto;
  overflow-x: hidden;
  margin-top: -30px;
}
</style>
