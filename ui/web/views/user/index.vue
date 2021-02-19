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
        <span>用户列表</span>
        <el-button
          v-if="$settings.permissions.includes(permission.USER_ADD)"
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
              <el-form-item label="登录名：">
                <el-input
                  v-model="searchForm.account"
                  size="mini"
                  clearable
                ></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
              <el-form-item label="用户名：">
                <el-input
                  v-model="searchForm.name"
                  size="mini"
                  clearable
                ></el-input>
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
                <el-button
                  type="primary"
                  size="mini"
                  @click="$asyncComputed.listUser.update()"
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
        <el-table-column label="角色" min-width="180">
          <template slot-scope="scope">
            <el-tag
              v-for="role in scope.row.rolesName"
              :key="role"
              style="margin-right: 10px;"
            >
              {{ role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="creatorName"
          label="创建人"
          min-width="100"
        ></el-table-column>
        <el-table-column
          prop="editorName"
          label="修改人"
          min-width="100"
        ></el-table-column>
        <el-table-column
          label="操作"
          min-width="160"
          v-if="
            $settings.permissions.includes(permission.USER_UPDATE) ||
              $settings.permissions.includes(permission.USER_REMOVE) ||
              $settings.permissions.includes(permission.SUPER_ADMIN)
          "
        >
          <template slot-scope="scope">
            <el-button
              v-if="
                $settings.permissions.includes(permission.USER_UPDATE) ||
                  $settings.permissions.includes(permission.SUPER_ADMIN)
              "
              type="primary"
              size="mini"
              @click="editUser(scope)"
            >
              修改
            </el-button>
            <el-button
              v-if="
                $settings.permissions.includes(permission.USER_REMOVE) ||
                  $settings.permissions.includes(permission.SUPER_ADMIN)
              "
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
        :total="listUser.count"
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
        <el-form-item
          label="所属权限"
          prop="areaCode"
          :label-width="formLabelWidth"
        >
          <el-cascader
            v-model="userForm.areaCode"
            :placeholder="userForm.region.name || '请选择地区'"
            style="width: 100%"
            :props="regionList"
            collapse-tags
            filterable
          ></el-cascader>
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
        <el-form-item
          label="所属权限"
          prop="areaCode"
          :label-width="formLabelWidth"
        >
          <el-cascader
            v-model="userForm.areaCode"
            :placeholder="userForm.region.name || '请选择地区'"
            style="width: 100%"
            :props="regionList"
            collapse-tags
            filterable
          ></el-cascader>
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

export default {
  name: 'user',
  data() {
    const that = this;
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
        roles: [],
        isRegion: true,
        region: {name: ''},
        areaCode: '',
        hospital: {name: ''},
        hospitals: []
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
        password: [{required: true, message: '请输入密码', trigger: 'blur'}]
      },
      rulesEdit: {
        name: [{required: true, message: '请输入用户名', trigger: 'blur'}]
      },
      regionList: {
        lazy: true,
        checkStrictly: true,
        emitPath: false,
        async lazyLoad(node, resolve) {
          const {level, value = null} = node;
          const region = (await that.region(value)).map(it => ({
            value: it.code,
            label: it.name,
            leaf: level >= 4
          }));
          resolve(region);
        }
      }
    };
  },
  computed: {
    userList() {
      return this.listUser.rows.map(it => ({
        ...it,
        roles: it.roles.map(it => it.id),
        rolesName: it.roles.map(it => it.name)
      }));
    },
    roleList() {
      return this.listRole.rows;
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
    },
    ['searchForm.roleId']: {
      handler() {
        this.searchForm.pageNo = 1;
      },
      deep: true
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
    async resetPassword() {
      try {
        await this.$api.User.resetPassword(this.userForm.id);
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
        roleId: '',
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
        roles: [],
        isRegion: true,
        region: {name: ''},
        areaCode: '',
        hospital: {name: ''},
        hospitals: []
      };
    },
    //保存新建用户
    async addUser() {
      this.$refs.userFormAdd.validate(async valid => {
        if (valid) {
          let {account, password, name, roles, areaCode} = this.userForm;
          try {
            await this.$api.User.addUser({
              account,
              password,
              name,
              roles,
              areaCode
            });
            this.$message({
              type: 'success',
              message: '新建用户成功!'
            });
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
            let {id, name, roles, areaCode} = this.userForm;
            await this.$api.User.update({id, name, roles, areaCode});
            this.$message({
              type: 'success',
              message: '保存成功!'
            });
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
    //删除用户
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
