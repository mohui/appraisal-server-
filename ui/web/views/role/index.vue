<template>
  <div style="height: 100%">
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
        <span>角色列表</span>
        <el-button
          style=" float: right; margin: -5px 0 0 20px;"
          size="small"
          type="primary"
          @click="handleAddRole"
          >新增角色
        </el-button>
      </div>
      <el-table
        :data="tableData"
        v-loading="$asyncComputed.serverData.updating"
        style="width: 100%; flex-grow: 1 "
        height="100%"
        border
      >
        <el-table-column align="center" fixed width="80" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column
          v-for="(it, index) of tableFields"
          :key="index"
          :prop="it.prop"
          :label="it.label"
          :min-width="it.width + 40"
          align="center"
        >
          <template slot-scope="scope">
            <div v-if="scope.column.property === 'users'">
              {{ scope.row[it.prop].length }}
            </div>
            <a
              v-else-if="scope.column.property === 'permissions'"
              @click="
                (dialogPermissionsListTableViewVisible = true),
                  (role = scope.row)
              "
            >
              {{ scope.row[it.prop].length }}
            </a>
            <div v-else>{{ scope.row[it.prop] }}</div>
          </template>
        </el-table-column>
        <el-table-column align="center" width="250" label="操作">
          <template slot-scope="scope">
            <div
              v-if="
                $settings.permissions.includes(permission.SUPER_ADMIN) ||
                  scope.row.creator === $settings.user.id
              "
            >
              <el-button type="primary" size="mini" @click="handleEdit(scope)"
                >编辑
              </el-button>
              <el-button
                type="danger"
                size="mini"
                @click="handleDelete(scope.row.id)"
                >删除
              </el-button>
            </div>
            <div v-else style="color: #e6a23c">
              无权限
            </div>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        background
        :current-page="pageNo"
        :page-sizes="[10, 20, 30, 50, 100]"
        :page-size="pageSize"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px 0;"
        :total="serverData.count"
        @size-change="
          size => {
            pageSize = size;
            pageNo = 1;
          }
        "
        @current-change="
          no => {
            pageNo = no;
          }
        "
      >
      </el-pagination>
      <el-dialog
        title="拥有的权限"
        :visible.sync="dialogPermissionsListTableViewVisible"
        :width="$settings.isMobile ? '99%' : '50%'"
      >
        <el-tag
          style="margin: 8px 10px"
          type=""
          v-for="(item, index) in role.permissions"
          :key="item.key"
        >
          {{ index + 1 }}. {{ item.name }}
        </el-tag>
      </el-dialog>
      <el-dialog
        :visible.sync="dialogVisible"
        :title="dialogType === 'edit' ? '编辑角色' : '新增角色'"
        :width="$settings.isMobile ? '99%' : '50%'"
      >
        <el-form
          ref="ruleForm"
          :model="role"
          :rules="rules"
          label-width="80px"
          label-position="left"
        >
          <el-form-item label="名称" prop="name">
            <el-input v-model="role.name" placeholder="角色名称" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model="role.description"
              :autosize="{minRows: 2, maxRows: 4}"
              type="textarea"
              placeholder="角色描述"
            />
          </el-form-item>
          <el-form-item label="权限">
            <el-tree
              ref="tree"
              :check-strictly="checkStrictly"
              :data="permissionsList"
              :props="defaultProps"
              show-checkbox
              node-key="key"
              @check="handleCheck"
            />
          </el-form-item>
          <el-form-item>
            <div style="text-align:right;">
              <el-button type="danger" @click="dialogVisible = false"
                >取消
              </el-button>
              <el-button
                type="primary"
                :loading="submitting"
                @click="submitForm('ruleForm')"
              >
                {{ submitting ? '提交中...' : '确定' }}
              </el-button>
            </div>
          </el-form-item>
        </el-form>
      </el-dialog>
    </el-card>
  </div>
</template>

<script>
import {PermissionTree, Permission} from '../../../../common/permission.ts';

const defaultRole = {
  name: '',
  description: '',
  permissions: []
};

const fieldsMapping = [
  {prop: 'name', label: '角色名称'},
  {prop: 'permissions', label: '权限数量'},
  {prop: 'users', label: '用户数量'}
];

export default {
  name: 'role',
  data() {
    return {
      permission: Permission,
      role: Object.assign({}, defaultRole),
      dialogVisible: false,
      dialogPermissionsListTableViewVisible: false,
      checkStrictly: false,
      submitting: false,
      pageSize: 20, // 每页数量
      pageNo: 1, // 当前第几页
      dialogType: 'new',
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      rules: {
        name: [{required: true, message: '请输入角色名称', trigger: 'blur'}]
      },
      permissionsList: [],
      dimensionReductionPermissionsList: []
    };
  },
  created() {
    //如果没有"超级管理"权限则需要进行权限过滤
    if (!this.$settings.permissions.includes(Permission.SUPER_ADMIN)) {
      this.filterPermission(this.permissionsList, PermissionTree);
      this.filterEmpty(this.permissionsList);
    } else {
      this.permissionsList = PermissionTree;
      //"超级管理"权限有一键勾选所有权限的操作
      //平铺树形数据的所有叶子节点
      this.dimensionReductionTree(PermissionTree);
    }
  },
  computed: {
    tableData() {
      return this.serverData.rows.map(it => ({
        ...it,
        created_at: it.created_at.$format('YYYY-MM-DD'),
        updated_at: it.updated_at.$format('YYYY-MM-DD')
      }));
    },
    tableFields() {
      return fieldsMapping.map(it => ({
        ...it,
        width:
          it.prop === 'users' || it.prop === 'permissions'
            ? 50
            : this.$widthCompute([
                it.label,
                ...this.tableData.map(data => data[it.prop])
              ])
      }));
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        return await this.$api.User.listRole({
          pageNo: this.pageNo,
          pageSize: this.pageSize
        });
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
    //降维：树形数据平铺
    dimensionReductionTree(arr) {
      for (let i = 0; i < arr.length; i++) {
        // 递归判断children数组存不存在, 存在的话就递归处理
        if (arr[i].children) {
          this.dimensionReductionTree(arr[i].children);
        } else {
          //只添加叶子节点
          this.dimensionReductionPermissionsList.push(arr[i]);
        }
      }
    },
    //arr:需要组装的数据, tree:需要进行过滤的数据
    filterPermission(arr, tree) {
      //遍历树的节点
      for (let a of tree) {
        if (!a.children) {
          //当前树节点没有子节点了,则判断用户是否有该节点的权限
          if (this.$settings.permissions.includes(a.key))
            //有权限则push进组装数据的children[]
            arr.push(a);
        } else {
          //当前树节点还有子节点,则往组装数据添加一个新节点
          let newTree = {key: a.key, label: a.label, children: []};
          arr.push(newTree);
          //递归子节点
          this.filterPermission(newTree.children, a.children);
        }
      }
    },
    //递归清理children为空的父节点
    filterEmpty(data) {
      for (let d of data) {
        if (d?.children?.length === 0) data.splice(data.indexOf(d), 1);
        else if (d.children) this.filterEmpty(d.children);
      }
    },
    //tree组件：复选框被点击的时候触发
    handleCheck(data, checked) {
      if (!this.$settings.permissions.includes(this.permission.SUPER_ADMIN))
        return;
      if (data.key === this.permission.SUPER_ADMIN) {
        if (checked.checkedKeys.includes(this.permission.SUPER_ADMIN)) {
          this.$refs.tree.setCheckedNodes(
            this.dimensionReductionPermissionsList
          );
        } else {
          this.$refs.tree.setCheckedNodes([]);
        }
      } else {
        console.log(
          'dimensionReductionPermissionsList',
          this.dimensionReductionPermissionsList
        );
        console.log('checked.checkedKeys', checked.checkedKeys);
        if (
          this.isContain(
            checked.checkedKeys,
            this.dimensionReductionPermissionsList
          )
        ) {
          console.log('true');
          this.$refs.tree.setChecked(this.permission.SUPER_ADMIN, true);
        } else {
          console.log('false');
          this.$refs.tree.setChecked(this.permission.SUPER_ADMIN, false);
        }
      }
    },
    //arr1包含arr2判断
    isContain(arr1, arr2) {
      for (let i = arr2.length - 1; i >= 0; i--) {
        if (
          //super-admin除外，特殊处理
          arr2[i].key !== this.permission.SUPER_ADMIN &&
          !arr1.includes(arr2[i].key)
        ) {
          return false;
        }
      }
      return true;
    },
    deepClone(source) {
      if (!source && typeof source !== 'object') {
        throw new Error('error arguments', 'deepClone');
      }
      const targetObj = source.constructor === Array ? [] : {};
      Object.keys(source).forEach(keys => {
        if (source[keys] && typeof source[keys] === 'object') {
          targetObj[keys] = this.deepClone(source[keys]);
        } else {
          targetObj[keys] = source[keys];
        }
      });
      return targetObj;
    },
    handleAddRole() {
      this.role = Object.assign({}, defaultRole);
      this.dialogType = 'new';
      this.dialogVisible = true;
      if (this.$refs.tree) {
        this.$refs.tree.setCheckedNodes([]);
      }
    },
    handleEdit(scope) {
      this.dialogType = 'edit';
      this.dialogVisible = true;
      this.role = this.deepClone(scope.row);
      this.$nextTick(() => {
        console.log(scope.row.permissions);
        if (
          scope.row.permissions.some(
            it => it.key === this.permission.SUPER_ADMIN
          )
        ) {
          this.$refs.tree.setCheckedNodes(
            this.dimensionReductionPermissionsList
          );
        } else {
          this.$refs.tree.setCheckedNodes(scope.row.permissions);
        }
        // set checked state of a node not affects its father and child nodes
        this.checkStrictly = false;
      });
    },
    handleDelete(id) {
      this.$confirm('确定要删除该角色吗', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          await this.$api.User.removeRole(id);
          this.$message({
            type: 'success',
            message: 'Delete succed!'
          });
          this.$asyncComputed.serverData.update();
        })
        .catch(err => {
          if (err.message) {
            this.$message({
              type: 'error',
              message: err.message
            });
          }
        });
    },
    async submitForm(formName) {
      console.log(formName);
      try {
        //校验表单是否通过
        await this.$refs[formName].validate();
        //表单校验通过之后执行以下代码
        const isEdit = this.dialogType === 'edit';
        this.submitting = true;
        //被选中的节点的 key 所组成的数组
        let permissionsKey = this.$refs.tree.getCheckedKeys(true);
        if (permissionsKey.includes(this.permission.SUPER_ADMIN)) {
          permissionsKey = [this.permission.SUPER_ADMIN];
        }
        try {
          if (isEdit) {
            //更新角色
            const updateRole = {
              id: this.role.id,
              name: this.role.name,
              permissions: permissionsKey
            };
            await this.$api.User.updateRole(updateRole);
            this.$message.success('更新角色成功');
          } else {
            //新增角色
            await this.$api.User.addRole(this.role.name, permissionsKey);
            this.$message.success('新增角色成功');
          }
          this.$asyncComputed.serverData.update();
          this.dialogVisible = false;
        } catch (e) {
          this.$message.error(e.message);
        } finally {
          this.submitting = false;
        }
      } catch (e) {
        console.log(e);
      }
    }
  }
};
</script>

<style scoped lang="scss">
@import '../../styles/vars.scss';

.el-table .el-table__row .cell a {
  color: $color-primary;
  cursor: pointer;
}
</style>
