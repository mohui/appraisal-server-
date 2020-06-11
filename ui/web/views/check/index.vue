<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>规则列表</span>
        <el-button
          v-permission="{permission: permission.CHECK_ADD, type: 'disabled'}"
          style="float: right;margin: -9px;"
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
        @row-click="handleCellClick"
        :cell-class-name="cellClassHover"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column align="center" width="50" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          prop="checkName"
          min-width="60"
          label="考核名称"
        ></el-table-column>
        <el-table-column
          prop="created_at"
          min-width="40"
          label="创建时间"
        ></el-table-column>
        <el-table-column min-width="14" label="状态">
          <template slot-scope="scope">
            {{ scope.row.status ? '启用' : '停用' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="autoScore"
          min-width="30"
          label="打分状态"
        ></el-table-column>
        <el-table-column min-width="20" label="适用机构">
          <template slot-scope="scope">
            {{ scope.row.hospitalCount }}
            <el-button
              circle
              plain
              v-permission="{
                permission: permission.CHECK_SELECT_HOSPITAL,
                type: 'disabled'
              }"
              type="primary"
              size="mini"
              icon="el-icon-plus"
              @click.stop="openSelectDialog(scope.row)"
            ></el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button
              plain
              v-permission="{
                permission: permission.CHECK_UPDATE,
                type: 'disabled'
              }"
              type="primary"
              size="small"
              @click.stop="openEditCheckDialog(scope.row)"
            >
              修改
            </el-button>
            <el-button
              plain
              v-permission="{
                permission: permission.CHECK_CLONE,
                type: 'disabled'
              }"
              type="warning"
              size="small"
              @click.stop="openCloneCheckDialog(scope.row)"
            >
              快速复制
            </el-button>
            <el-button
              plain
              v-permission="{
                permission: permission.CHECK_IMPORT,
                type: 'disabled'
              }"
              v-show="scope.row.status"
              type="info"
              size="small"
              @click.stop="openUploadCheckDialog(scope.row)"
            >
              批量导入细则
            </el-button>
            <el-button
              plain
              v-permission="{
                permission: permission.CHECK_REMOVE,
                type: 'disabled'
              }"
              type="danger"
              size="small"
              @click.stop="delCheck(scope)"
            >
              删除
            </el-button>
            <el-button
              plain
              v-permission="{
                permission: permission.CHECK_OPEN_GRADE,
                type: 'disabled'
              }"
              v-show="scope.row.isOpen"
              type="success"
              size="small"
              @click.stop="openCheck(scope.row)"
            >
              全部开启打分
            </el-button>
            <el-button
              plain
              v-permission="{
                permission: permission.CHECK_CLOSE_GRADE,
                type: 'disabled'
              }"
              v-show="scope.row.isClose"
              size="small"
              @click.stop="closeCheck(scope.row)"
            >
              全部关闭打分
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        background
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
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :total="listCheck.count"
      >
      </el-pagination>
    </el-card>
    <el-dialog
      :title="checkForm.id ? '修改规则' : '新建规则'"
      :visible.sync="dialogFormAddChecksVisible"
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
    <el-dialog title="快速复制" :visible.sync="dialogFormCloneChecksVisible">
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
        <el-button type="primary" @click="cloneCheck" :loading="submitting">
          {{ submitting ? '提交中...' : '确 定' }}
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="批量导入细则"
      :visible.sync="dialogUploadFormVisible"
      :before-close="handleClose"
      width="30%"
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
            class="upload-demo"
            ref="uploadForm"
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
          @click="saveUploadRules"
          :loading="uploadLoading"
          >确 定</el-button
        >
      </div>
    </el-dialog>
    <el-dialog title="选择机构" :visible.sync="dialogSelectVisible">
      <div class="hos-box">
        <div v-for="(item, i) of hospitalList" :key="i">
          <div class="center-title">
            <el-checkbox
              :indeterminate="item.isIndeterminate"
              v-model="item.selected"
              @change="toggleChange($event, item)"
            >
              <span>[{{ item.name }}]</span>
            </el-checkbox>
          </div>
          <el-row :gutter="20">
            <el-col
              :xs="24"
              :sm="24"
              :md="12"
              :lg="12"
              :xl="8"
              v-for="(it, index) of item.child"
              :key="index"
              class="el-cols"
            >
              <el-checkbox
                v-model="it.selected"
                @change="() => childToggleChange(item)"
              >
                {{ index + 1 }} {{ it.name }}
              </el-checkbox>
            </el-col>
          </el-row>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogSelectVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveHospital">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';
export default {
  name: 'check',
  data() {
    return {
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
        status: true
      },
      searchForm: {
        pageSize: 20,
        pageNo: 1
      },
      hospitalList: [],
      fileList: [],
      importUrl: 'uploadUrl',
      headers: {token: "getCookie('account')"}
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
        updated_at: it.updated_at.$format('YYYY-MM-DD')
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
    }
  },
  asyncComputed: {
    listCheck: {
      async get() {
        return await this.$api.CheckSystem.list();
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    }
  },
  methods: {
    //下属机构未全选状态切换
    childToggleChange(item) {
      const checkedCount = item.child.filter(it => it.selected).length;
      item.selected = checkedCount === item.child.length;
      item.isIndeterminate =
        checkedCount > 0 && checkedCount < item.child.length;
    },
    //中心下属机构全选切换
    toggleChange(event, item) {
      item.isIndeterminate = false;
      item.child.forEach(it => (it.selected = event));
    },
    //获取机构列表
    async getHospitalList(checkId) {
      const result = await this.$api.CheckSystem.listHospitals(checkId);
      let arr = result
        .filter(it => it.name.indexOf('中心') !== -1)
        .map(it => ({
          ...it,
          isIndeterminate: false,
          child: result.filter(
            item => item.parent === it.id || item.id === it.id
          )
        }));

      let cur = arr.map(it => it.child).flat();

      let other = {
        name: '其它',
        id: 'other',
        child: result.filter(it => cur.indexOf(it) === -1)
      };

      if (other.child.length) {
        arr.push(other);
      }

      this.hospitalList = arr.map(it => ({
        ...it,
        selected: !it.child.some(it => !it.selected),
        isIndeterminate: it.child.some(it => !it.selected)
      }));
    },
    //打开机构对话框
    openSelectDialog(item) {
      this.checkForm = Object.assign({}, item);
      this.getHospitalList(item.checkId);
      this.dialogSelectVisible = true;
    },
    //保存选取的机构
    async saveHospital() {
      const {checkId} = this.checkForm;
      const hospitals = this.hospitalList
        .map(it => it.child)
        .flat()
        .filter(it => it.selected)
        .map(it => it.id);
      try {
        await this.$api.CheckSystem.setHospitals({checkId, hospitals});
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
            checkName: encodeURIComponent(row.checkName)
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
        await this.$api.CheckSystem.updateName({checkId, checkName, status});
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
        await this.$api.CheckSystem.setAllRuleAuto(item.checkId, false);
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
.hos-box {
  height: 50vh;
  overflow-y: auto;
  overflow-x: hidden;
  margin-top: -20px;
  .center-title {
    margin: 20px 0 10px 0;
    span {
      font-size: 16px;
    }
  }
  .el-cols {
    margin-bottom: 10px;
    padding-left: 38px !important;
    &:last-child {
      margin-bottom: 0;
    }
  }
}
</style>
