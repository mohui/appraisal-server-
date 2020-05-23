<template>
  <div style="height: 100%; display: flex; flex-direction: column">
    <el-button style="width: 100px" type="primary" @click="handleAddRole"
      >新增角色</el-button
    >
    <el-table
      :data="tableData"
      style="width: 100%; margin-top:30px; flex-grow: 1 "
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
        :min-width="it.width"
        align="center"
      >
        <template slot-scope="scope">
          <div v-if="scope.column.property === 'users'">
            {{ scope.row[it.prop].length }}
          </div>
          <a
            v-else-if="scope.column.property === 'permissions'"
            @click="
              (dialogPermissionsListTableViewVisible = true), (role = scope.row)
            "
          >
            {{ scope.row[it.prop].length }}
          </a>
          <div v-else>{{ scope.row[it.prop] }}</div>
        </template>
      </el-table-column>
      <el-table-column align="center" width="250" label="操作">
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope)"
            >编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="handleDelete(scope.row.id)"
            >删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      background
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
      :current-page="pageNo"
      :page-sizes="[2, 10, 20, 30, 50]"
      :page-size="pageSize"
      layout="total, sizes, prev, pager, next, jumper"
      :total="serverData.count"
    >
    </el-pagination>
    <el-dialog
      title="拥有的权限"
      :visible.sync="dialogPermissionsListTableViewVisible"
    >
      <div
        style="margin-bottom: 5px"
        v-for="item of role.permissions"
        :key="item.key"
      >
        {{ item.name }}
      </div>
    </el-dialog>
    <el-dialog
      :visible.sync="dialogVisible"
      :title="dialogType === 'edit' ? '编辑角色' : '新增角色'"
    >
      <el-form :model="role" label-width="80px" label-position="left">
        <el-form-item label="Name">
          <el-input v-model="role.name" placeholder="角色名称" />
        </el-form-item>
        <el-form-item label="Desc">
          <el-input
            v-model="role.description"
            :autosize="{minRows: 2, maxRows: 4}"
            type="textarea"
            placeholder="角色描述"
          />
        </el-form-item>
        <el-form-item label="Menus">
          <el-tree
            ref="tree"
            :check-strictly="checkStrictly"
            :data="permissionsList"
            :props="defaultProps"
            show-checkbox
            node-key="key"
          />
        </el-form-item>
      </el-form>
      <div style="text-align:right;">
        <el-button type="danger" @click="dialogVisible = false"
          >取消
        </el-button>
        <el-button type="primary" @click="confirmRole" :loading="submitting">
          {{ submitting ? '提交' : '确定' }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
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
      role: Object.assign({}, defaultRole),
      dialogVisible: false,
      dialogPermissionsListTableViewVisible: false,
      dialogType: 'new',
      checkStrictly: false,
      submitting: false,
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      pageSize: 2, // 每页数量
      pageNo: 1, // 当前第几页
      permissionsList: [
        {
          key: 'home',
          label: '首页'
        },
        {
          key: 'user-index',
          label: '用户管理',
          children: [
            {
              key: 'user-add',
              label: '用户添加'
            },
            {
              key: 'user-update',
              label: '用户更新'
            },
            {
              key: 'user-remove',
              label: '用户删除'
            }
          ]
        },
        {
          key: 'role-index',
          label: '角色管理'
        }
      ]
    };
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
        this.$refs.tree.setCheckedNodes(scope.row.permissions);
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
    async confirmRole() {
      const isEdit = this.dialogType === 'edit';
      this.submitting = true;
      //被选中的节点的 key 所组成的数组
      const permissionsKey = this.$refs.tree.getCheckedKeys(true);
      if (isEdit) {
        //更新角色
        const updateRole = {
          id: this.role.id,
          name: this.role.name,
          permissions: permissionsKey
        };
        await this.$api.User.updateRole(updateRole);
      } else {
        //新增角色
        await this.$api.User.addRole(this.role.name, permissionsKey);
      }
      this.$asyncComputed.serverData.update();
      this.dialogVisible = false;
      this.submitting = false;
    }
  }
};
</script>

<style scoped>
.el-table .el-table__row .cell a {
  color: #409eff;
  cursor: pointer;
}
</style>
