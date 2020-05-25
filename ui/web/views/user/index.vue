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
        <span>用户列表</span>
        <el-button
          style="float: right;margin: -9px;"
          type="primary"
          @click="openAddUserDialog"
          >新建用户
        </el-button>
      </div>
      <el-form
        ref="ruleForm"
        :model="searchForm"
        label-width="100px"
        size="mini"
      >
        <el-row>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="登录名：">
              <el-input v-model="searchForm.account" size="mini"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="用户名：">
              <el-input v-model="searchForm.name" size="mini"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="角色：">
              <el-select
                clearable
                v-model="searchForm.roleId"
                placeholder="请选择"
                style="width: 100%;"
              >
                <el-option
                  v-for="item in roleList"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                >
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="5" :xs="24" :sm="24" :md="12" :lg="6" :xl="6">
            <el-form-item label="">
              <el-button type="primary" size="mini">查询</el-button>
              <el-button type="primary" size="mini">重置条件</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        stripe
        size="small"
        :data="userList"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column align="center" width="50" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="account" label="登录名"></el-table-column>
        <el-table-column prop="name" label="用户名"></el-table-column>
        <el-table-column label="角色">
          <template slot-scope="scope">
            <el-tag
              :key="role"
              v-for="role in scope.row.rolesName"
              style="margin-right: 10px;"
            >
              {{ role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间"></el-table-column>
        <el-table-column prop="updated_at" label="更新时间"></el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button type="primary" size="small" @click="editUser(scope)">
              修改
            </el-button>
            <el-button type="danger" size="small" @click="delUser(scope)">
              删除
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
        :total="listUser.count"
      >
      </el-pagination>
    </el-card>
    <el-dialog title="新建用户" :visible.sync="dialogFormAddUsersVisible">
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
        <el-form-item label="用户名" prop="name" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="roles" :label-width="formLabelWidth">
          <el-select
            v-model="userForm.roles"
            multiple
            placeholder="请选择"
            style="width: 100%;"
          >
            <el-option
              v-for="item in roleList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            >
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormAddUsersVisible = false">取 消</el-button>
        <el-button type="primary" @click="addUser">
          确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog title="修改用户" :visible.sync="dialogFormEditUsersVisible">
      <el-form ref="userFormEdit" :model="userForm" :rules="rulesEdit">
        <el-form-item label="登录名" :label-width="formLabelWidth">
          <el-input
            v-model="userForm.account"
            autocomplete="off"
            disabled
          ></el-input>
        </el-form-item>
        <el-form-item label="用户名" prop="name" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="roles" :label-width="formLabelWidth">
          <el-select
            v-model="userForm.roles"
            multiple
            placeholder="请选择"
            style="width: 100%;"
          >
            <el-option
              v-for="item in roleList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            >
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="dialogFormEditUsersVisible = false">取 消</el-button>
        <el-button type="primary" @click="updateUser">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'user',
  data() {
    return {
      dialogFormAddUsersVisible: false,
      dialogFormEditUsersVisible: false,
      formLabelWidth: '100px',
      userForm: {
        account: '',
        password: '',
        name: '',
        roles: []
      },
      searchForm: {
        account: '',
        name: '',
        roleId: '',
        pageSize: 20,
        pageNo: 1
      },
      rulesAdd: {
        account: [{required: true, message: '请输入登录名', trigger: 'blur'}],
        name: [{required: true, message: '请输入用户名', trigger: 'blur'}],
        password: [{required: true, message: '请输入密码', trigger: 'blur'}],
        roles: [{required: true, message: '请输入角色', trigger: 'change'}]
      },
      rulesEdit: {
        name: [{required: true, message: '请输入用户名', trigger: 'blur'}],
        roles: [{required: true, message: '请输入角色', trigger: 'change'}]
      }
    };
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
    },
    ['searchForm.roleId']: {
      handler() {
        this.searchForm.pageNo = 1;
      },
      deep: true
    }
  },
  computed: {
    userList() {
      return this.listUser.rows.map(it => ({
        ...it,
        roles: it.roles.map(it => it.id),
        rolesName: it.roles.map(it => it.name),
        created_at: it.created_at.$format('YYYY-MM-DD'),
        updated_at: it.updated_at.$format('YYYY-MM-DD')
      }));
    },
    roleList() {
      return this.listRole.rows.map(it => ({
        ...it,
        created_at: it.created_at.$format('YYYY-MM-DD'),
        updated_at: it.updated_at.$format('YYYY-MM-DD')
      }));
    }
  },
  asyncComputed: {
    listUser: {
      async get() {
        const {account, name, roleId, pageSize, pageNo} = this.searchForm;
        return await this.$api.User.list({
          account,
          name,
          roleId,
          pageSize,
          pageNo
        });
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    },
    listRole: {
      async get() {
        return await this.$api.User.listRole();
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
    openAddUserDialog() {
      this.dialogFormAddUsersVisible = true;
      this.userForm = {
        account: '',
        password: '',
        name: '',
        roles: []
      };
    },
    async addUser() {
      this.$refs.userFormAdd.validate(async valid => {
        if (valid) {
          try {
            await this.$api.User.addUser(this.userForm);
            this.$asyncComputed.listUser.update();
          } catch (e) {
            this.$message.error(e.message);
          } finally {
            this.dialogFormAddUsersVisible = false;
          }
        } else {
          return false;
        }
      });
    },
    editUser(item) {
      this.userForm = Object.assign({}, item.row);
      this.dialogFormEditUsersVisible = true;
    },
    updateUser() {
      this.$refs.userFormEdit.validate(async valid => {
        if (valid) {
          try {
            let {id, name, roles} = this.userForm;
            await this.$api.User.update({id, name, roles});
            this.$asyncComputed.listUser.update();
          } catch (e) {
            this.$message.error(e.message);
          } finally {
            this.dialogFormEditUsersVisible = false;
          }
        } else {
          return false;
        }
      });
    },
    delUser({$index, row}) {
      this.$confirm('此操作将永久删除该用户, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.User.remove(row.id);
            this.userList.splice($index, 1);
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
