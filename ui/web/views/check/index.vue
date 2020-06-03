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
        <el-table-column
          prop="status"
          min-width="14"
          label="状态"
        ></el-table-column>
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
              type="primary"
              size="small"
              @click.stop="openEditCheckDialog(scope.row)"
            >
              修改
            </el-button>
            <el-button
              plain
              type="warning"
              size="small"
              @click.stop="openCloneCheckDialog(scope.row)"
            >
              快速复制
            </el-button>
            <el-button
              plain
              v-show="scope.row.status === '启用'"
              type="info"
              size="small"
              @click.stop="openUploadCheckDialog(scope.row)"
            >
              批量导入细则
            </el-button>
            <el-button
              plain
              type="danger"
              size="small"
              @click.stop="delCheck(scope)"
            >
              删除
            </el-button>
            <el-button
              plain
              v-show="scope.row.isOpen"
              type="success"
              size="small"
              @click.stop="openCheck(scope.row)"
            >
              全部开启打分
            </el-button>
            <el-button
              plain
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
      <el-form :model="checkForm">
        <el-form-item label="考核名称">
          <el-input v-model="checkForm.checkName"></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio v-model="checkForm.radio" label="1">启用</el-radio>
          <el-radio v-model="checkForm.radio" label="0">禁用</el-radio>
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
      <el-form :model="checkForm">
        <el-form-item label="复制考核名称">
          {{ checkForm.name }}
        </el-form-item>
        <el-form-item label="考核名称">
          <el-input v-model="checkForm.cloneName"></el-input>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio v-model="checkForm.radio" label="1">启用</el-radio>
          <el-radio v-model="checkForm.radio" label="0">禁用</el-radio>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormCloneChecksVisible = false"
          >取 消</el-button
        >
        <el-button type="primary" @click="cloneCheck">确 定</el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="批量导入细则"
      :visible.sync="dialogUploadFormVisible"
      :before-close="handleClose"
      width="30%"
    >
      <el-form :model="checkForm">
        <el-form-item label="考核名称">
          {{ checkForm.name }}
        </el-form-item>
        <el-form-item label="状态">
          <el-radio v-model="checkForm.radio" label="1">
            覆盖原有考核细则
          </el-radio>
          <el-radio v-model="checkForm.radio" label="0">
            增量更新考核细则
          </el-radio>
        </el-form-item>
        <el-form-item label="上传文件">
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
            <div slot="tip" class="el-upload__tip" style="font-size:16px;">
              只能上传xls文件
            </div>
          </el-upload>
        </el-form-item>
        <div style="text-align:center; color:red; font-size:18px;">
          请按照模板要求及格式填写上传&nbsp;&nbsp;
          <el-button plain type="primary" size="small" @click="downloadTemplate"
            >模板下载</el-button
          >
        </div>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button plain @click="dialogUploadFormVisible = false"
          >取 消</el-button
        >
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
      <div v-for="(item, i) of hospitalList" :key="i">
        {{ item.name }}
        <p v-for="(it, index) of item.child" :key="index">
          <el-checkbox v-model="it.selected">
            {{ index + 1 }} {{ it.name }}
          </el-checkbox>
        </p>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogSelectVisible = false">取 消</el-button>
        <el-button type="primary" @click="saveHospital">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'check',
  data() {
    return {
      maxSize: 5,
      progress: 0,
      dialogSelectVisible: false,
      dialogFormAddChecksVisible: false,
      dialogFormCloneChecksVisible: false,
      dialogUploadFormVisible: false,
      formLabelWidth: '100px',
      checkForm: {
        checkId: '',
        checkName: '',
        cloneName: '',
        radio: '1'
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
        isOpen:
          (it.autoScore === '全部关闭打分' ||
            it.autoScore === '部分开启打分') &&
          it.count !== 0 &&
          it.status !== '停用',
        isClose:
          (it.autoScore === '全部开启打分' ||
            it.autoScore === '部分开启打分') &&
          it.count !== 0 &&
          it.status !== '停用',
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
    //获取机构列表
    async getHospitalList(checkId) {
      const result = await this.$api.CheckSystem.listHospitals(checkId);
      this.hospitalList = result
        .map(it => it.parent)
        .filter((it, index, arr) => arr.indexOf(it) === index)
        .map(it => ({
          name: result.filter(item => item.id === it)[0]?.name,
          code: it
        }))
        .filter(it => it.name)
        .map(it => ({
          ...it,
          child: result.filter(
            item => item.parent === it.code || item.id === it.code
          )
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
        .reduce((acc, cur) => acc.concat(cur), [])
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
    //跳转详情
    handleCellClick(row) {
      this.$router.push({
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
        radio: '1'
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
      const {checkId, checkName} = this.checkForm;
      if (!checkName) {
        this.$message.info('考核名称不能为空');
        return;
      }
      try {
        await this.$api.CheckSystem.updateName({checkId, checkName});
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
      try {
        const {checkId, name, cloneName, radio} = this.checkForm;
        if (!name || !cloneName) {
          this.$message.info('考核名称不能为空');
          return;
        }
        await this.$api.CheckSystem.cloneCheck({
          checkId,
          name,
          cloneName,
          radio
        });
        this.$asyncComputed.listCheck.update();
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.dialogFormCloneChecksVisible = false;
      }
    },
    //开启规则
    async openCheck(item) {
      try {
        await this.$api.CheckSystem.openCheck(item.checkId, 'Y');
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
        await this.$api.CheckSystem.closeCheck(item.checkId, 'N');
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
            await this.$api.CheckSystem.remove(row.id);
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

<style scoped></style>
