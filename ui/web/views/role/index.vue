<template>
  <div>
    <el-button type="primary" @click="handleAddRole">New Role</el-button>
    <el-table :data="rolesList" style="width: 100%;margin-top:30px;" border>
      <el-table-column align="center" label="Role Key" width="220">
        <template slot-scope="scope">
          {{ scope.row.key }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="Role Name" width="220">
        <template slot-scope="scope">
          {{ scope.row.name }}
        </template>
      </el-table-column>
      <el-table-column align="header-center" label="Description">
        <template slot-scope="scope">
          {{ scope.row.description }}
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
            :data="routesData"
            :props="defaultProps"
            show-checkbox
            node-key="id"
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
  </div>
</template>

<script>
const defaultRole = {
  key: '',
  name: '',
  description: '',
  routes: []
};

export default {
  name: 'role',
  data() {
    return {
      rolesList: [],
      role: Object.assign({}, defaultRole),
      dialogVisible: false,
      dialogType: 'new',
      checkStrictly: false,
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      routesData: [
        {
          id: 1,
          label: '一级 1',
          children: [
            {
              id: 11,
              label: '二级 1-1',
              children: [
                {
                  id: 111,
                  label: '三级 1-1-1'
                }
              ]
            }
          ]
        },
        {
          id: 2,
          label: '一级 2',
          children: [
            {
              id: 21,
              label: '二级 2-1',
              children: [
                {
                  id: 211,
                  label: '三级 2-1-1'
                }
              ]
            },
            {
              id: 22,
              label: '二级 2-2',
              children: [
                {
                  id: 221,
                  label: '三级 2-2-1'
                }
              ]
            }
          ]
        },
        {
          id: 3,
          label: '一级 3',
          children: [
            {
              id: 31,
              label: '二级 3-1',
              children: [
                {
                  id: 311,
                  label: '三级 3-1-1'
                }
              ]
            },
            {
              id: 32,
              label: '二级 3-2',
              children: [
                {
                  id: 321,
                  label: '三级 3-2-1'
                }
              ]
            }
          ]
        }
      ]
    };
  },
  created() {
    this.rolesList = [
      {
        description: 'Super Administrator. Have access to view all pages.',
        key: 'admin',
        name: '管理员'
      },
      {
        description: 'Normal Editor. Can see all pages except permission page',
        key: 'editor',
        name: '编辑'
      },
      {
        description:
          'Just a visitor. Can only see the home page and the document page',
        key: 'visitor',
        name: '游客'
      }
    ];
  },
  methods: {
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
      console.log(scope);
      this.dialogType = 'edit';
      this.dialogVisible = true;
      this.$nextTick(() => {
        this.$refs.tree.setCheckedNodes([
          {
            id: 21,
            label: '二级 2-1'
          },
          {
            id: 311,
            label: '三级 1-1-1'
          }
        ]);
        // set checked state of a node not affects its father and child nodes
        this.checkStrictly = false;
      });
    },
    handleDelete({$index, row}) {
      console.log($index, row);
    },
    confirmRole() {
      console.log('confirmRole');
    }
  }
};
</script>

<style scoped></style>
