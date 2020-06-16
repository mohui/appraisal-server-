<template>
  <div style="height: 100%; display: flex; flex-direction: column">
    <div>
      <el-button
        style=" float: right; margin: 0px 0 0 20px;"
        size="small"
        type="primary"
        @click="handleAddRole"
        >新增角色</el-button
      >
    </div>
    <el-table
      :data="tableData"
      v-loading="$asyncComputed.serverData.updating"
      style="width: 100%; margin-top:20px; flex-grow: 1 "
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
          <el-button type="primary" size="mini" @click="handleEdit(scope)"
            >编辑
          </el-button>
          <el-button
            type="danger"
            size="mini"
            @click="handleDelete(scope.row.id)"
            >删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      background
      :current-page="pageNo"
      :page-sizes="[10, 20, 30, 50, 100]"
      :page-size="pageSize"
      layout="total, sizes, prev, pager, next, jumper"
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
              key: 'user-index',
              label: '用户首页'
            },
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
        },
        {
          key: 'appraisal',
          label: '绩效考核',
          children: [
            {
              key: 'appraisal-result',
              label: '考核结果'
            },
            {
              key: 'appraisal-configuration-management-group',
              label: '配置管理',
              children: [
                {
                  key: 'appraisal-configuration-management',
                  label: '配置管理首页'
                },
                {
                  key: 'check',
                  label: '规则管理',
                  children: [
                    {
                      key: 'check-add',
                      label: '新建规则'
                    },
                    {
                      key: 'check-update',
                      label: '修改规则'
                    },
                    {
                      key: 'check-select-hospital',
                      label: '配置机构'
                    },
                    {
                      key: 'check-clone',
                      label: '快速复制'
                    },
                    {
                      key: 'check-import',
                      label: '批量导入细则'
                    },
                    {
                      key: 'check-open-grade',
                      label: '全部开启打分'
                    },
                    {
                      key: 'check-close-grade',
                      label: '全部关闭打分'
                    },
                    {
                      key: 'check-remove',
                      label: '删除规则'
                    }
                  ]
                },
                {
                  key: 'rule',
                  label: '细则管理',
                  children: [
                    {
                      key: 'rule-add',
                      label: '新建细则'
                    },
                    {
                      key: 'rule-update',
                      label: '修改规则'
                    },
                    {
                      key: 'rule-remove',
                      label: '删除规则'
                    }
                  ]
                }
              ]
            },
            {
              key: 'appraisal-basic-data',
              label: '基础数据'
            }
          ]
        },
        {
          key: 'profile',
          label: '个人档案'
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
    async submitForm(formName) {
      console.log(formName);
      try {
        //校验表单是否通过
        await this.$refs[formName].validate();
        //表单校验通过之后执行以下代码
        const isEdit = this.dialogType === 'edit';
        this.submitting = true;
        //被选中的节点的 key 所组成的数组
        const permissionsKey = this.$refs.tree.getCheckedKeys(true);
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
