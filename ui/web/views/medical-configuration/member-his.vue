<template>
  <div class="flex-column-layout">
    <div class="jx-header">
      <span class="header-title">HIS员工绑定列表</span>
      <div>
        <el-button size="small" type="primary" @click="openAddUserDialog"
          >绑定员工
        </el-button>
        <el-button
          size="small"
          type="warning"
          @click="addDepartmentVisible = true"
          >新增科室
        </el-button>
      </div>
    </div>
    <el-card
      class="box-card"
      style="height: 100%;flex:1"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 10px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '10px 0 0 0'
      }"
    >
      <kn-collapse
        :is-show="$settings.isMobile"
        :is-collapsed="isCollapsed"
        @toggle="is => (isCollapsed = is)"
      >
        <el-form :model="searchForm" label-width="100px" size="mini">
          <el-row>
            <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
              <el-form-item label="登录名:">
                <el-input
                  v-model="searchForm.account"
                  size="mini"
                  clearable
                ></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
              <el-form-item label="姓名:">
                <el-input
                  v-model="searchForm.name"
                  size="mini"
                  clearable
                ></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="5" :xs="24" :sm="24" :md="12" :lg="6" :xl="6">
              <el-form-item label="">
                <el-button
                  type="primary"
                  size="small"
                  @click="$asyncComputed.listMember.update()"
                  >查询</el-button
                >
                <el-button type="primary" size="small" @click="reset">
                  重置
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </kn-collapse>
      <el-table
        v-hidden-scroll
        :key="symbolKey"
        v-loading="tableLoading"
        class="table-staff-department"
        size="small"
        :data="userList"
        height="100%"
        style="flex-grow: 1;"
        row-key="id"
        lazy
        :load="loadTree"
        :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
        @cell-mouse-enter="mouseEnter"
        @cell-mouse-leave="mouseLeave"
      >
        <el-table-column
          align="center"
          prop="departmentText"
          label="科室"
          min-width="180"
        >
          <template slot-scope="{row}">
            <span v-if="row.departmentId">{{ row.departmentText }}</span>
            <div
              v-if="!row.departmentId && !row.department"
              class="no-department-cell"
            >
              ---
            </div>
            <el-link
              v-if="row.departmentId && showEditIcon(row.departmentId)"
              style="padding: 0 0 0 10px"
              class="el-icon-edit"
              @click="editUser(row)"
              type="primary"
            ></el-link>
            <el-link
              v-if="row.departmentId && showEditIcon(row.departmentId)"
              style="padding: 0"
              class="el-icon-close"
              @click="delUser(row)"
              type="danger"
            ></el-link>
          </template>
        </el-table-column>
        <el-table-column
          align="center"
          prop="account"
          label="登录名"
          min-width="100"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="name"
          label="姓名"
          min-width="80"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="gender"
          label="性别"
          min-width="100"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="phone"
          label="电话"
          min-width="100"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="staffName"
          label="HIS用户"
          min-width="80"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="phStaffName"
          label="公卫用户"
          min-width="80"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="major"
          label="专业"
          min-width="120"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="title"
          label="职称名称"
          min-width="100"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="education"
          label="学历"
          min-width="80"
        ></el-table-column>
        <el-table-column
          align="center"
          prop="remark"
          label="备注"
          min-width="100"
        ></el-table-column>
        <el-table-column align="center" label="操作" min-width="260">
          <template slot-scope="{row}">
            <div v-if="!row.departmentId">
              <el-button type="primary" size="small" @click="editUser(row)">
                修改
              </el-button>
              <!--              <el-button-->
              <!--                :disabled="row.removeLoading"-->
              <!--                :icon="row.removeLoading ? 'el-icon-loading' : ''"-->
              <!--                size="small"-->
              <!--                type="danger"-->
              <!--                @click="delUser(row)"-->
              <!--              >-->
              <!--                删除-->
              <!--              </el-button>-->
              <el-button type="primary" size="mini" @click="QRImage(row)">
                绑定码
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog
      title="修改用户"
      :visible.sync="dialogFormEditUsersVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
      :close-on-click-modal="false"
      :before-close="beforeClose"
    >
      <el-form
        class="staff-form"
        ref="userFormAdd"
        :model="userForm"
        :rules="rulesAdd"
        label-position="top"
      >
        <el-row>
          <el-col :span="24">
            <el-form-item
              ><span style="font-weight: bold">账户关联</span></el-form-item
            >
          </el-col>
          <el-col :span="12" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
            <el-form-item
              label="HIS用户"
              prop="his"
              :label-width="formLabelWidth"
            >
              <el-select
                v-model="userForm.his"
                style="width:100%"
                clearable
                filterable
                multiple
                size="mini"
              >
                <el-option
                  v-for="h in hisList"
                  :key="h.id"
                  :label="h.name"
                  :value="h.id"
                  :disabled="!h.usable"
                ></el-option>
              </el-select> </el-form-item
          ></el-col>
          <el-col :span="12" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
            <el-form-item
              label="公卫用户"
              prop="phStaff"
              :label-width="formLabelWidth"
            >
              <el-select
                v-model="userForm.phStaff"
                style="width:100%"
                clearable
                filterable
                multiple
                size="mini"
              >
                <el-option
                  v-for="h in phStaffList"
                  :key="h.id"
                  :label="h.username"
                  :value="h.id"
                  :disabled="!h.usable"
                ></el-option>
              </el-select> </el-form-item
          ></el-col>
          <el-col :span="12" :xs="12" :sm="8" :md="8" :lg="8" :xl="8">
            <el-form-item
              label="科室"
              prop="department"
              :label-width="formLabelWidth"
            >
              <el-select
                v-model="userForm.department"
                style="width:100%"
                clearable
                filterable
                size="mini"
              >
                <el-option
                  v-for="h in departmentList"
                  :key="h.id"
                  :label="h.name"
                  :value="h.id"
                ></el-option>
              </el-select> </el-form-item
          ></el-col>
          <el-col :span="24">
            <el-form-item
              label="备注"
              prop="remark"
              :label-width="formLabelWidth"
            >
              <el-input
                v-model="userForm.remark"
                type="textarea"
                autocomplete="off"
              ></el-input>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormEditUsersVisible = false">取 消</el-button>
        <el-button v-loading="addBtnLoading" type="primary" @click="updateUser">
          确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog title="绑定码" :visible.sync="QRDialogVisible" width="30%">
      <div>
        <img
          style="width: 245px;margin: 0 auto;display: block;"
          :src="QRCode"
          alt=""
        />
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button type="primary" @click="QRDialogVisible = false"
          >关 闭</el-button
        >
      </span>
    </el-dialog>
    <el-dialog title="科室" :visible.sync="addDepartmentVisible" width="30%">
      <el-form ref="departmentForm" :model="departmentForm">
        <el-form-item
          label="科室名称"
          prop="name"
          :rules="[{required: true, message: '科室名不能为空'}]"
          :label-width="formLabelWidth"
        >
          <el-input
            v-model="departmentForm.name"
            size="mini"
            autocomplete="off"
          ></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button size="small" @click="resetDepartmentForm()">取 消</el-button>
        <el-button
          size="small"
          type="primary"
          :disabled="!departmentForm.name"
          @click="submitDepartment()"
          >确 定</el-button
        >
      </div>
    </el-dialog>
    <el-dialog
      title="选择员工"
      :visible.sync="dialogSelectUsersVisible"
      v-hidden-scroll
      :before-close="cleanSelected"
    >
      <div
        style="display: flex;
        flex-direction: column;height: 60vh;overflow-y: scroll"
      >
        <div style="margin:0 0 20px 0">员工列表:</div>
        <el-table
          v-hidden-scroll
          class="extend-staff-table"
          :data="extendStaffList"
          style="flex:1"
          ref="extendStaffList"
          border
          stripe
          size="mini"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" align="center" width="55">
          </el-table-column>
          <el-table-column type="index" align="center" width="50">
          </el-table-column>
          <el-table-column align="center" label="姓名" prop="name">
            <template slot="header">
              <el-input
                v-model="keyword"
                size="mini"
                placeholder="输入名字搜索"
              />
            </template>
          </el-table-column>
          <el-table-column
            align="center"
            label="性别"
            prop="gender"
          ></el-table-column>
          <el-table-column
            align="center"
            label="职业"
            prop="major"
          ></el-table-column>
          <el-table-column
            align="center"
            label="教育经历"
            prop="education"
          ></el-table-column>
          <el-table-column align="center" label="是否全科医生" prop="isGap">
            <template slot-scope="{row}">{{
              row.isGap ? '是' : '否'
            }}</template>
          </el-table-column>
        </el-table>
        <div style="margin: 20px 0 5px 0">分配科室</div>
        <el-select
          style="width:100%"
          v-model="selectedDepartment"
          clearable
          filterable
          size="mini"
        >
          <el-option
            v-for="h in departmentList"
            :key="h.id"
            :label="h.name"
            :value="h.id"
          ></el-option>
        </el-select>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button size="small" @click="cleanSelected">取 消</el-button>
        <el-button
          size="small"
          type="primary"
          v-loading="addBtnLoading"
          :disabled="selectedStaff.length < 1"
          @click="addUser()"
          >确 定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'User',
  data() {
    return {
      isCollapsed: !!this.$settings.isMobile,
      inputType: 'password',
      dialogFormEditUsersVisible: false,
      dialogSelectUsersVisible: false,
      formLabelWidth: '100px',
      userForm: {
        his: [],
        phStaff: [],
        department: ''
      },
      searchForm: {
        account: '',
        name: '',
        pageSize: 20,
        pageNo: 1
      },
      rulesAdd: {
        account: [{required: true, message: '请输入登录名', trigger: 'change'}],
        name: [{required: true, message: '请输入姓名', trigger: 'change'}],
        password: [{required: true, message: '请输入密码', trigger: 'change'}],
        major: [{required: true, message: '请选择专业类别', trigger: 'change'}],
        gender: [{required: true, message: '请选择性别', trigger: 'change'}],
        education: [{required: true, message: '请选择学历', trigger: 'change'}],
        title: [{required: true, message: '请选择职称名称', trigger: 'change'}]
      },
      tableLoading: false,
      addBtnLoading: false,
      addDepartmentVisible: false,
      // 绑定码窗口
      QRDialogVisible: false,
      departmentForm: {
        id: null,
        name: null
      },
      mouseEnterId: '',
      symbolKey: Symbol(this.$dayjs().toString()),
      // 绑定码变量
      QRCode: '',
      //选中的员工
      selectedStaff: [],
      //选中员工的机构
      selectedDepartment: '',
      keyword: ''
    };
  },
  computed: {
    userList() {
      return this.listMember
        .map(it => ({
          ...it,
          his: it.staff,
          removeLoading: false,
          staffName: it.hisStaff.map(it => it.name).join(','),
          phStaffName: it.phStaff.map(it => it.name).join(','),
          created_at: it.created_at?.$format() || '',
          updated_at: it.updated_at?.$format() || ''
        }))
        .reduce(
          (pre, next) => {
            const department = pre.find(
              p => p.departmentId === next.department
            );
            if (department) department.children.push(next);
            if (!department) pre.push(next);
            return pre;
          },
          //起始的科室分类数据
          this.serverDepartment.map(it => ({
            id: it.id,
            depName: it.name,
            departmentId: it.id,
            children: [],
            created_at: it.created_at?.$format() || '',
            hasChildren: true
          }))
        )
        .map(it => ({
          ...it,
          departmentText: it.children
            ? `${it.depName}(${it.children.length}人)`
            : ''
        }));
    },
    // 科室列表
    departmentList() {
      return this.serverDepartment;
    },
    //非本机构的外部员工
    extendStaffList() {
      return this.serverExtendStaff
        .map(it => ({
          ...it,
          username: `${it.username}${it.states ? '' : ' (禁用)'}`
        }))
        .filter(it => !this.keyword || it.name.indexOf(this.keyword) > -1);
    },
    hisList() {
      return this.serverHisData;
    },
    // 公卫医生列表
    phStaffList() {
      return this.serverPhStaffData.map(it => ({
        ...it,
        username: `${it.username}${it.states ? '' : ' (禁用)'}`
      }));
    },
    //当前机构的id
    hospitalId() {
      return this.$settings.user.hospitals[0]?.id;
    }
  },
  watch: {
    ['searchForm.account']: {
      handler() {
        this.searchForm.pageNo = 1;
      },
      deep: true
    },
    ['searchForm.name']: {
      handler() {
        this.searchForm.pageNo = 1;
      },
      deep: true
    }
  },
  asyncComputed: {
    listMember: {
      async get() {
        this.tableLoading = true;
        const {account, name} = this.searchForm;
        try {
          return await this.$api.HisStaff.list(account || null, name || null);
        } catch (e) {
          this.$message.error(e.message);
          console.error(e.message);
          return [];
        } finally {
          this.tableLoading = false;
        }
      },
      default() {
        return [];
      }
    },
    serverDepartment: {
      async get() {
        try {
          return await this.$api.HisDepartment.list();
        } catch (e) {
          this.$message.error(e.message);
          return [];
        }
      },
      default: []
    },
    serverHisData: {
      async get() {
        try {
          return await this.$api.HisStaff.listHisStaffs(this.hospitalId);
        } catch (e) {
          this.$message.error(e.message);
          return [];
        }
      },
      default: []
    },
    serverExtendStaff: {
      async get() {
        try {
          return await this.$api.HisStaff.staffList();
        } catch (e) {
          this.$message.error(e.message);
          return [];
        }
      },
      default: []
    },
    serverPhStaffData: {
      async get() {
        try {
          return await this.$api.HisStaff.listPhStaffs(this.hospitalId);
        } catch (e) {
          this.$message.error(e.message);
          return [];
        }
      },
      default: []
    }
  },
  methods: {
    //勾选非本机构人员
    handleSelectionChange(selected) {
      this.selectedStaff = selected.map(it => it.id);
    },
    cleanSelected(done) {
      this.selectedStaff = [];
      this.$refs.extendStaffList.clearSelection();
      this.dialogSelectUsersVisible = false;
      this.selectedDepartment = '';
      done || done();
    },
    beforeClose() {
      this.userForm = {
        his: [],
        phStaff: [],
        department: ''
      };
      this.dialogFormEditUsersVisible = false;
      this.$refs.userFormAdd.resetFields();
    },
    isShowPwd() {
      this.inputType = this.inputType === 'password' ? '' : 'password';
    },
    //重置查询条件
    reset() {
      this.searchForm = {
        account: '',
        name: '',
        his: '',
        pageSize: 20,
        pageNo: 1
      };
    },
    //打开新建用户对话框
    openAddUserDialog() {
      this.dialogSelectUsersVisible = true;
    },
    //保存新建用户
    async addUser() {
      try {
        const params = this.selectedStaff.map(it => ({
          id: it,
          hospital: this.hospitalId,
          department: this.selectedDepartment || null
        }));
        await this.$api.HisStaff.addAreaMapping(params);
        this.$asyncComputed.listMember.update(); //刷新系统员工列表
        this.$asyncComputed.serverExtendStaff.update(); //刷新非本机构员工列表
        this.dialogSelectUsersVisible = false;
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.addBtnLoading = false;
      }
    },
    //设置用户编辑状态，并打开对话框
    editUser(row) {
      if (row.departmentId) {
        this.departmentForm = JSON.parse(
          JSON.stringify({
            id: row.id,
            name: row.depName
          })
        );
        this.addDepartmentVisible = true;
        return;
      }
      this.userForm = Object.assign(
        {},
        {
          id: row.id,
          his: row.hisStaff.map(it => it.id),
          phStaff: row.phStaff.map(it => it.id),
          department: row.department,
          remark: row.remark
        }
      );
      this.dialogFormEditUsersVisible = true;
    },
    //更新保存用户信息
    async updateUser() {
      try {
        await this.$api.HisStaff.updateStaffMapping({
          id: this.userForm.id,
          hospital: this.hospitalId,
          hisStaffs: this.userForm.his,
          phStaffs: this.userForm.phStaff,
          department: this.userForm.department,
          remark: this.userForm.remark || null
        });
        this.$message({
          type: 'success',
          message: '保存成功!'
        });
        this.$asyncComputed.listMember.update();
        this.$asyncComputed.serverExtendStaff.update(); //刷新公卫员工列表
        this.symbolKey = Symbol(this.$dayjs().toString());
        this.dialogFormEditUsersVisible = false;
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //删除用户
    async delUser(row) {
      try {
        await this.$confirm('此操作将永久删除, 是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        row.removeLoading = true;
        if (row.departmentId)
          await this.$api.HisDepartment.delete(row.departmentId);
        if (!row.departmentId)
          await this.$api.HisStaff.delete(row.id, this.hospitalId);
        this.$message({
          type: 'success',
          message: '删除成功!'
        });
        this.$asyncComputed.listMember.update();
        this.$asyncComputed.serverDepartment.update();
        this.symbolKey = Symbol(this.$dayjs().toString());
      } catch (e) {
        e !== 'cancel' ? this.$message.error(e?.message) : '';
      } finally {
        row.removeLoading = false;
      }
    },
    //列表树load方法
    loadTree(tree, treeNode, resolve) {
      resolve(tree.children);
    },
    resetDepartmentForm() {
      this.departmentForm.id = null;
      this.departmentForm.name = null;
      this.addDepartmentVisible = false;
    },
    async submitDepartment() {
      try {
        if (this.departmentForm.id) {
          await this.$api.HisDepartment.update(
            this.departmentForm.id,
            this.departmentForm.name
          );
        } else {
          await this.$api.HisDepartment.add(this.departmentForm.name);
        }
        this.$message.success('操作成功');
        this.$asyncComputed.serverDepartment.update();
        this.symbolKey = Symbol(this.$dayjs().toString());
        this.resetDepartmentForm();
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      } finally {
        this.addDepartmentVisible = false;
      }
    },
    //是否显示icon
    showEditIcon(id) {
      return id === this.mouseEnterId;
    },
    //鼠标进出单元格
    mouseEnter(row) {
      this.mouseEnterId = row.id;
    },
    mouseLeave() {
      this.mouseEnterId = null;
    },
    async QRImage(row) {
      const loading = this.$loading({
        lock: true,
        text: '正在生成二维码',
        spinner: 'el-icon-loading',
        background: 'rgba(0, 0, 0, 0.7)'
      });
      try {
        // 打开弹窗
        this.QRCode = (await this.$api.User.getQRCode(row.id)).image;
        this.QRDialogVisible = true;
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        loading.close();
      }
    }
  }
};
</script>
<style lang="scss">
.extend-staff-table {
  display: flex;
  flex-direction: column;

  .el-table__body-wrapper {
    flex: 1;
    overflow-y: scroll;
  }
  .el-table__header-wrapper .el-checkbox {
    display: none;
  }
}
.table-staff-department {
  .el-table__row--level-1 {
    background: #f8f8ff;
  }
}

.staff-form {
  .el-col {
    padding: 0 8px;
  }
  .el-form-item {
    margin-bottom: 0;
  }
}
</style>
<style lang="scss" scoped>
.no-department-cell {
  text-align: center;
  width: 100%;
}
::v-deep .staff-form {
  .el-form-item__label {
    margin-bottom: -10px;
    padding: 0;
    line-height: 25px;
  }
}
.el-textarea {
  margin: 10px 0;
}
</style>
