<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: $settings.isMobile ? 'calc(100% - 80px)' : 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0 0' : '20px'
      }"
    >
      <div slot="header" class="header">
        <span>科室列表</span>
        <div>
          <el-button
            size="mini"
            type="primary"
            @click="addDepartmentVisible = true"
            >新增科室
          </el-button>
        </div>
      </div>
      <el-table :data="tableData" style="width: 100%">
        <el-table-column type="index" label="序号" width="180">
        </el-table-column>
        <el-table-column prop="name" label="科室名称" width="180">
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间"></el-table-column>
        <el-table-column prop="" label="操作" align="center">
          <template slot-scope="{row}">
            <el-tooltip content="编辑" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click="editRow(row)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" :enterable="false">
              <el-button
                type="danger"
                :icon="row.removeLoading ? 'el-icon-loading' : 'el-icon-delete'"
                :disabled="row.removeLoading"
                round
                size="mini"
                @click="delRow(row)"
              >
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog title="科室弹窗" :visible.sync="addDepartmentVisible">
      <el-form ref="departmentForm" :model="addForm" :rules="rulesAdd">
        <el-form-item
          label="科室名称"
          prop="name"
          :label-width="formLabelWidth"
        >
          <el-input v-model="addForm.name" autocomplete="off"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetForm()">取 消</el-button>
        <el-button type="primary" @click="submit()">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>
<script>
export default {
  name: 'Department',
  data() {
    return {
      addForm: {
        id: null,
        name: null
      },
      formLabelWidth: '120px',
      addDepartmentVisible: false,
      rulesAdd: {
        name: [{required: true, message: '请输入科室名称', trigger: 'blur'}]
      }
    };
  },
  computed: {
    tableData() {
      return this.deptListService?.map(it => ({
        ...it,
        removeLoading: false,
        created_at: it.created_at?.$format()
      }));
    }
  },
  asyncComputed: {
    deptListService: {
      async get() {
        return await this.$api.HisDepartment.list();
      },
      default: []
    }
  },
  methods: {
    async submit() {
      this.$refs.departmentForm.validate(async valid => {
        if (valid) {
          try {
            if (this.addForm.id) {
              await this.$api.HisDepartment.update(
                this.addForm.id,
                this.addForm.name
              );
            } else {
              await this.$api.HisDepartment.add(this.addForm.name);
            }
            this.$message.success('操作成功');
            this.$asyncComputed.deptListService.update();
            this.resetForm();
          } catch (e) {
            console.error(e);
            if (e) this.$message.error(e.message);
          } finally {
            this.addDepartmentVisible = false;
          }
        } else {
          return false;
        }
      });
    },
    async editRow(row) {
      this.addForm = JSON.parse(
        JSON.stringify({
          id: row.id,
          name: row.name
        })
      );
      this.addDepartmentVisible = true;
    },
    async delRow(row) {
      try {
        await this.$confirm('确定删除该科室?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        row.removeLoading = true;
        await this.$api.HisDepartment.delete(row.id);
        this.$message.success('删除成功');
        this.$asyncComputed.deptListService.update();
      } catch (e) {
        console.log(e);
      } finally {
        row.removeLoading = false;
      }
    },
    resetForm() {
      this.addForm.id = null;
      this.addForm.name = null;
      this.addDepartmentVisible = false;
    }
  }
};
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
}

.cell-long-span {
  width: 100%;
  display: block;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>
