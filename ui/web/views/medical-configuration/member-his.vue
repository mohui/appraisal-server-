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
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="openAddUserDialog"
          >新建用户
        </el-button>
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
              <el-form-item label="用户名:">
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
                  重置条件
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </kn-collapse>
      <el-table
        v-loading="tableLoading"
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
        <el-table-column
          prop="name"
          label="用户名"
          min-width="200"
        ></el-table-column>
        <el-table-column
          prop="his"
          label="His账号"
          min-width="100"
        ></el-table-column>
        <el-table-column label="操作" min-width="160">
          <template slot-scope="scope">
            <el-button type="primary" size="mini" @click="editUser(scope)">
              修改
            </el-button>
            <el-button
              v-permission="{
                permission: permission.USER_REMOVE,
                type: 'disabled'
              }"
              type="danger"
              size="mini"
              @click="delUser(scope)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        background
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :total="listMember.count"
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
        <el-form-item label="用户名" prop="name" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="his用户" prop="his" :label-width="formLabelWidth">
          <el-select v-model="userForm.his" clearable filterable>
            <el-option
              v-for="h in hisList"
              :key="h.name"
              :label="h.name"
              :value="h.value"
            ></el-option>
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
          <el-button type="warning" plain @click="resetPassword"
            >重置密码</el-button
          >
        </el-form-item>
        <el-form-item label="用户名" prop="name" :label-width="formLabelWidth">
          <el-input v-model="userForm.name" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="his用户" prop="his" :label-width="formLabelWidth">
          <el-select v-model="userForm.his" clearable filterable>
            <el-option
              v-for="h in hisList"
              :key="h.name"
              :label="h.name"
              :value="h.value"
            ></el-option>
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
import {Permission} from '../../../../common/permission.ts';
import dayjs from 'dayjs';

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
        his: ''
      },
      searchForm: {
        account: '',
        name: '',
        pageSize: 20,
        pageNo: 1
      },
      rulesAdd: {
        account: [{required: true, message: '请输入登录名', trigger: 'blur'}],
        name: [{required: true, message: '请输入用户名', trigger: 'blur'}],
        password: [{required: true, message: '请输入密码', trigger: 'blur'}]
      },
      rulesEdit: {
        name: [{required: true, message: '请输入用户名', trigger: 'blur'}]
      },
      tableLoading: false
    };
  },
  computed: {
    userList() {
      return this.listMember.rows;
    },
    hisList() {
      return this.serverHisData;
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
        let data = [];
        this.tableLoading = true;
        const {account, name, pageSize, pageNo} = this.searchForm;
        console.log(account, name, pageSize, pageNo);
        try {
          await new Promise(resolve =>
            setTimeout(() => {
              for (let i = 0; i < 10; i++) {
                data.push({
                  index: i + 1,
                  name: `员工B${i}`,
                  account: `ABC${i}`,
                  password: '123654',
                  his: `员工A${i}`,
                  createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
                });
              }
              resolve();
            }, 1000)
          );
          return {
            count: 10,
            rows: data
          };
        } catch (e) {
          console.error(e.message);
        } finally {
          this.tableLoading = false;
        }
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    },
    serverHisData: {
      async get() {
        await new Promise(resolve => setTimeout(() => resolve(), 600));
        let i = 0;
        let data = [];
        for (; i < 10; i++) {
          data.push({
            name: `员工A${i}`,
            value: `员工A${i}`
          });
        }
        return data;
      },
      default: []
    }
  },
  methods: {
    async resetPassword() {
      try {
        this.$message({
          type: 'success',
          message: '重置成功!'
        });
      } catch (e) {
        this.$message.error(e.message);
      }
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
    //异步加载地区列表
    async region(code) {
      return await this.$api.Group.children(code);
    },
    //打开新建用户对话框
    openAddUserDialog() {
      this.dialogFormAddUsersVisible = true;
      this.userForm = {
        account: '',
        password: '',
        name: '',
        his: ''
      };
    },
    //保存新建用户
    async addUser() {
      this.$refs.userFormAdd.validate(async valid => {
        if (valid) {
          try {
            this.$set(this.userList, this.userList.length, this.userForm);
            this.$message({
              type: 'success',
              message: '新建用户成功!'
            });
            // this.$asyncComputed.listMember.update();
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
    //设置用户编辑状态，并打开对话框
    editUser(item) {
      this.userForm = Object.assign({}, item.row);
      this.dialogFormEditUsersVisible = true;
    },
    //更新保存用户信息
    updateUser() {
      this.$refs.userFormEdit.validate(async valid => {
        if (valid) {
          try {
            // await this.$api.User.update({id, name});
            this.$message({
              type: 'success',
              message: '保存成功!'
            });
            this.$asyncComputed.listMember.update();
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
    //删除用户
    async delUser({$index}) {
      try {
        await this.$confirm('此操作将永久删除该用户, 是否继续?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        this.userList.splice($index, 1);
        this.$message({
          type: 'success',
          message: '删除成功!'
        });
      } catch (e) {
        console.log(e);
        // this.$message.error(e);
      }
    }
  }
};
</script>

<style scoped></style>
