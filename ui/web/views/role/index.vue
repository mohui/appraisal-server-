<template>
  <div>
    <el-button type="primary" @click="handleAddRole">New Role</el-button>
    <el-table :data="roleList" style="width: 100%;margin-top:30px;" border>
      <el-table-column align="center" label="Role Id" width="220">
        <template slot-scope="scope">
          {{ scope.row.id }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Role Name" width="220">
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column align="header-center" label="Updated Date">
        <template slot-scope="scope">
          {{ scope.row.updated_at }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Operations">
        <template slot-scope="scope">
          <el-button type="primary" size="small" @click="handleEdit(scope)"
            >Edit
          </el-button>
          <el-button type="danger" size="small" @click="handleDelete(scope)"
            >Delete
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      :visible.sync="dialogVisible"
      :title="dialogType === 'edit' ? 'Edit Role' : 'New Role'"
    >
      <el-form :model="role" label-width="80px" label-position="left">
        <el-form-item label="Name">
          <el-input v-model="role.name" placeholder="Role Name" />
        </el-form-item>
        <el-form-item label="Desc">
          <el-input
            v-model="role.description"
            :autosize="{minRows: 2, maxRows: 4}"
            type="textarea"
            placeholder="Role Description"
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
          >Cancel
        </el-button>
        <el-button type="primary" @click="confirmRole">Confirm</el-button>
      </div>
    </el-dialog>
    {{ roleList }}
  </div>
</template>

<script>
const defaultRole = {
  id: '',
  name: '',
  description: '',
  permissions: []
};

export default {
  name: 'role',
  data() {
    return {
      role: Object.assign({}, defaultRole),
      dialogVisible: false,
      dialogType: 'new',
      checkStrictly: false,
      defaultProps: {
        children: 'children',
        label: 'label'
      },
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
  async created() {
    const serverData = await this.$api.User.listRole();
    console.log(serverData);
  },
  computed: {
    roleList() {
      return this.listRole.rows.map(it => ({
        ...it,
        created_at: it.created_at.$format('YYYY-MM-DD'),
        updated_at: it.updated_at.$format('YYYY-MM-DD')
      }));
    }
  },
  asyncComputed: {
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
    handleAddRole(scope) {
      console.log(scope);
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
        console.log('per', scope.row.permissions);
        this.$refs.tree.setCheckedNodes(scope.row.permissions);
        // set checked state of a node not affects its father and child nodes
        this.checkStrictly = false;
      });
    },
    handleDelete({$index, row}) {
      console.log($index, row);
      this.$confirm('Confirm to remove the role?', 'Warning', {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
        type: 'warning'
      })
        .then(async () => {
          //TODO: 调用服务器方法，删除数据

          this.roleList.splice($index, 1);
          this.$message({
            type: 'success',
            message: 'Delete succed!'
          });
        })
        .catch(err => {
          console.error(err);
        });
    },
    confirmRole() {
      console.log('confirmRole');
      console.log(this.role);
      console.log(this.roleList);

      const isEdit = this.dialogType === 'edit';
      //被选中的节点所组成的数组, 只含叶子节点
      const checkedNodes = this.$refs.tree.getCheckedNodes(true);
      console.log(checkedNodes);
      if (isEdit) {
        for (let index = 0; index < this.roleList.length; index++) {
          console.log(this.roleList[index].id);
          console.log(this.role);
          if (this.roleList[index].id === this.role.id) {
            this.roleList[index].permissions = checkedNodes;
            break;
          }
        }
      } else {
        //TODO: 新增角色
        const role = this.role;
        role.permissions = checkedNodes;
        //添加的角色数组中
        this.roleList.push(role);
        console.log('add role list', this.roleList);
      }
      this.dialogVisible = false;
    }
  }
};
</script>

<style scoped></style>
