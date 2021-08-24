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
        <span>His员工绑定列表</span>
        <div>
          <el-button size="mini" type="primary" @click="openAddUserDialog"
            >新建用户
          </el-button>
          <el-button
            size="mini"
            type="warning"
            @click="addDepartmentVisible = true"
            >新增科室
          </el-button>
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
                  size="mini"
                  @click="$asyncComputed.listMember.update()"
                  >查询</el-button
                >
                <el-button type="primary" size="mini" @click="reset">
                  重置
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </kn-collapse>
      <el-table
        :key="symbolKey"
        v-loading="tableLoading"
        stripe
        border
        size="small"
        :data="userList"
        height="100%"
        style="flex-grow: 1;"
        row-key="id"
        lazy
        :load="loadTree"
        :tree-props="{children: 'children', hasChildren: 'hasChildren'}"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column
          prop="departmentText"
          label="科室"
          min-width="80"
        ></el-table-column>
        <el-table-column
          prop="account"
          label="登录名"
          min-width="80"
        ></el-table-column>
        <el-table-column
          prop="name"
          label="姓名"
          min-width="80"
        ></el-table-column>
        <el-table-column
          prop="staffName"
          label="His用户"
          min-width="80"
        ></el-table-column>
        <el-table-column
          prop="remark"
          label="备注"
          min-width="100"
        ></el-table-column>
        <el-table-column
          prop="created_at"
          label="创建时间"
          min-width="120"
        ></el-table-column>
        <el-table-column
          prop="updated_at"
          label="修改时间"
          min-width="120"
        ></el-table-column>
        <el-table-column label="操作" min-width="160">
          <template slot-scope="{row}">
            <el-button type="primary" size="mini" @click="editUser(row)">
              修改
            </el-button>
            <el-button
              :disabled="row.removeLoading"
              :icon="row.removeLoading ? 'el-icon-loading' : ''"
              size="mini"
              type="danger"
              @click="delUser(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog
      title="新建用户"
      :visible.sync="dialogFormAddUsersVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
    >
      <el-form ref="userFormAdd" :model="userForm" :rules="rulesAdd">
        <el-form-item
          label="登录名"
          prop="account"
          :label-width="formLabelWidth"
        >
          <el-input v-model="userForm.account" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item
          label="密码"
          prop="password"
          :label-width="formLabelWidth"
        >
          <el-input v-model="userForm.password" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item :label-width="formLabelWidth" label="姓名" prop="name">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="remark" :label-width="formLabelWidth">
          <el-input
            v-model="userForm.remark"
            type="textarea"
            autocomplete="off"
          ></el-input>
        </el-form-item>
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
          >
            <el-option
              v-for="h in departmentList"
              :key="h.id"
              :label="h.name"
              :value="h.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="his用户" prop="his" :label-width="formLabelWidth">
          <el-select
            v-model="userForm.his"
            style="width:100%"
            clearable
            filterable
          >
            <el-option
              v-for="h in hisList"
              :key="h.id"
              :label="h.name"
              :value="h.id"
              :disabled="!h.usable"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormAddUsersVisible = false">取 消</el-button>
        <el-button v-loading="addBtnLoading" type="primary" @click="addUser">
          确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="修改用户"
      :visible.sync="dialogFormEditUsersVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
    >
      <el-form ref="userFormEdit" :model="userForm" :rules="rulesEdit">
        <el-form-item label="登录名" :label-width="formLabelWidth">
          <el-input
            v-model="userForm.account"
            autocomplete="off"
            disabled
          ></el-input>
        </el-form-item>
        <el-form-item
          label="密码"
          prop="password"
          :label-width="formLabelWidth"
        >
          <el-input
            v-model="userForm.password"
            :type="inputType"
            autocomplete="off"
            style="width: auto"
            ><i
              slot="suffix"
              style="cursor: pointer;"
              class="el-icon-view"
              @click="isShowPwd()"
            ></i
          ></el-input>
        </el-form-item>
        <el-form-item :label-width="formLabelWidth" label="姓名" prop="name">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="备注" prop="remark" :label-width="formLabelWidth">
          <el-input
            v-model="userForm.remark"
            type="textarea"
            autocomplete="off"
          ></el-input>
        </el-form-item>
        <el-form-item
          label="科室"
          prop="department"
          :label-width="formLabelWidth"
        >
          <el-select
            v-model="userForm.department"
            style="width: 100%"
            clearable
            filterable
          >
            <el-option
              v-for="h in departmentList"
              :key="h.id"
              :label="h.name"
              :value="h.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="his用户" prop="his" :label-width="formLabelWidth">
          <el-select
            v-model="userForm.his"
            style="width: 100%"
            size="mini"
            clearable
            filterable
          >
            <el-option
              v-for="h in hisList"
              :key="h.id"
              :label="h.name"
              :value="h.id"
              :disabled="!h.usable"
            ></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button size="mini" @click="dialogFormEditUsersVisible = false"
          >取 消</el-button
        >
        <el-button
          v-loading="updateLoading"
          size="mini"
          type="primary"
          @click="updateUser"
          >确 定</el-button
        >
      </div>
    </el-dialog>
    <el-dialog title="科室" :visible.sync="addDepartmentVisible" width="30%">
      <el-form ref="departmentForm" :model="departmentForm" :rules="rulesAdd">
        <el-form-item
          label="科室名称"
          prop="name"
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
        <el-button size="mini" @click="resetDepartmentForm()">取 消</el-button>
        <el-button
          size="mini"
          type="primary"
          :disabled="!departmentForm.name"
          @click="submitDepartment()"
          >确 定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';

export default {
  name: 'User',
  data() {
    return {
      isCollapsed: !!this.$settings.isMobile,
      inputType: 'password',
      permission: Permission,
      dialogFormAddUsersVisible: false,
      dialogFormEditUsersVisible: false,
      formLabelWidth: '100px',
      userForm: {
        account: '',
        password: '',
        name: '',
        his: '',
        remark: null,
        department: null
      },
      searchForm: {
        account: '',
        name: '',
        pageSize: 20,
        pageNo: 1
      },
      rulesAdd: {
        account: [{required: true, message: '请输入登录名', trigger: 'blur'}],
        name: [{required: true, message: '请输入姓名', trigger: 'blur'}],
        password: [{required: true, message: '请输入密码', trigger: 'blur'}]
      },
      rulesEdit: {
        name: [{required: true, message: '请输入姓名', trigger: 'blur'}]
      },
      tableLoading: false,
      addBtnLoading: false,
      updateLoading: false,
      addDepartmentVisible: false,
      departmentForm: {
        id: null,
        name: null
      },
      symbolKey: Symbol(this.$dayjs().toString())
    };
  },
  computed: {
    userList() {
      return this.listMember
        .map(it => ({
          ...it,
          removeLoading: false,
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
    hisList() {
      return this.serverHisData;
    },
    // 科室列表
    departmentList() {
      return this.serverDepartment;
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
    serverHisData: {
      async get() {
        try {
          return await this.$api.HisStaff.listHisStaffs();
        } catch (e) {
          this.$message.error(e.message);
          return [];
        }
      },
      default: []
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
    }
  },
  methods: {
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
      this.dialogFormAddUsersVisible = true;
      this.userForm = {
        account: '',
        password: '',
        name: '',
        his: '',
        remark: null
      };
    },
    //保存新建用户
    async addUser() {
      this.$refs.userFormAdd.validate(async valid => {
        if (valid) {
          try {
            this.addBtnLoading = true;
            await this.$api.HisStaff.add(
              this.userForm.his || null,
              this.userForm.account.trim(),
              this.userForm.password.trim(),
              this.userForm.name.trim(),
              this.userForm.remark?.trim() || null,
              this.userForm.department?.trim() || null
            );
            this.$message({
              type: 'success',
              message: '新建用户成功!'
            });
            this.$asyncComputed.listMember.update(); //刷新系统员工列表
            this.$asyncComputed.serverHisData.update(); //刷新his员工列表
            this.dialogFormAddUsersVisible = false;
          } catch (e) {
            this.$message.error(e.message);
          } finally {
            this.addBtnLoading = false;
          }
        } else {
          return false;
        }
      });
    },
    //设置用户编辑状态，并打开对话框
    editUser(row) {
      if (row.departmentId) {
        this.departmentForm = JSON.parse(
          JSON.stringify({
            id: row.id,
            name: row.name
          })
        );
        this.addDepartmentVisible = true;
        return;
      }
      this.userForm = Object.assign(
        {},
        {
          id: row.id,
          account: row.account,
          password: row.password,
          name: row.name,
          his: row.staff,
          remark: row.remark,
          department: row.department
        }
      );
      this.dialogFormEditUsersVisible = true;
    },
    //更新保存用户信息
    updateUser() {
      this.$refs.userFormEdit.validate(async valid => {
        if (valid) {
          try {
            this.updateLoading = true;
            await this.$api.HisStaff.update(
              this.userForm.id,
              this.userForm.name.trim(),
              this.userForm.password.trim(),
              this.userForm.his || null,
              this.userForm.remark?.trim() || null,
              this.userForm.department?.trim() || null
            );
            this.$message({
              type: 'success',
              message: '保存成功!'
            });
            this.$asyncComputed.listMember.update();
          } catch (e) {
            this.$message.error(e.message);
          } finally {
            this.updateLoading = false;
            this.dialogFormEditUsersVisible = false;
          }
        } else {
          return false;
        }
      });
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
        if (!row.departmentId) await this.$api.HisStaff.delete(row.id);
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
    }
  }
};
</script>

<style scoped>
.clearfix {
  display: flex;
  justify-content: space-between;
}
</style>
