<template>
  <div class="flex-column-layout">
    <div class="jx-header">
      <span class="header-title">手工数据维护</span>
      <el-button
        style="float: right;margin: -4px 0 0 20px;"
        size="small"
        type="primary"
        @click="addManual"
        >添加项目
      </el-button>
    </div>
    <el-table
      v-loading="$asyncComputed.serverData.updating"
      :data="manual"
      empty-text="没有筛选到符合条件的数据"
      height="100%"
      style="flex-grow: 1;"
      :cell-class-name="cellClassHover"
      @row-click="handleCellClick"
    >
      <el-table-column
        type="index"
        align="center"
        label="序号"
      ></el-table-column>
      <el-table-column prop="name" label="手工工分项名称"> </el-table-column>
      <el-table-column prop="input" label="数据类型" align="center">
      </el-table-column>
      <el-table-column
        prop="createdAt"
        label="时间"
        align="center"
      ></el-table-column>
      <el-table-column label="操作" align="center">
        <template slot-scope="scope">
          <el-tooltip
            v-if="scope.row.id && !scope.row.EDIT"
            content="修改"
            :enterable="false"
          >
            <el-button
              type="primary"
              icon="el-icon-edit"
              circle
              size="mini"
              @click="editManual(scope)"
            >
            </el-button>
          </el-tooltip>
          <el-tooltip
            v-if="scope.row.id && !scope.row.EDIT"
            content="删除"
            :enterable="false"
          >
            <el-button
              type="danger"
              icon="el-icon-delete"
              circle
              size="mini"
              @click="delManual(scope)"
            >
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog
      :title="newManual.id ? '修改项目' : '添加项目'"
      :visible.sync="addManualVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
    >
      <el-form
        ref="manualForm"
        :model="newManual"
        :rules="manualRules"
        label-position="right"
        label-width="140px"
      >
        <el-form-item label="手工工分项名称" prop="name">
          <el-input
            v-model="newManual.name"
            size="mini"
            placeholder="请输入手工工分项名称"
          ></el-input>
        </el-form-item>
        <el-form-item label="数据类型" prop="input">
          <el-radio-group v-model="newManual.input">
            <el-radio :label="MD.PROP">{{ MD.PROP }}型</el-radio>
            <el-radio :label="MD.LOG">{{ MD.LOG }}型</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetForm">取 消</el-button>
        <el-button type="primary" @click="submitForm()">
          确 定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {HisManualDataInput as MD} from '../../../../common/his.ts';
export default {
  name: 'Manual',
  data() {
    return {
      MD: MD,
      addManualVisible: false,
      newManual: {
        id: '',
        name: '',
        input: MD.PROP
      },
      manualRules: {
        name: [
          {required: true, message: '请输入手工工分项名称', trigger: 'change'}
        ]
      }
    };
  },
  computed: {
    manual() {
      return this.serverData.map(it => ({
        ...it,
        createdAt: it.created_at.$format()
      }));
    }
  },
  created() {},
  asyncComputed: {
    serverData: {
      async get() {
        try {
          return this.$api.HisManualData.list();
        } catch (e) {
          console.error(e.message);
        }
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    resetForm() {
      this.addManualVisible = false;
      this.newManual = {id: '', name: '', input: MD.PROP};
    },
    async submitForm() {
      try {
        const valid = await this.$refs['manualForm'].validate();
        if (valid) {
          const {id, name, input} = this.newManual;
          if (!id) {
            await this.$api.HisManualData.add(name, input);
            this.$asyncComputed.serverData.update();
            this.$message.success('添加成功');
          } else {
            await this.$api.HisManualData.update(id, name, input);
            this.$asyncComputed.serverData.update();
            this.$message.success('更新成功');
          }
          this.resetForm();
        }
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'manual-name';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name')
        return this.$router.push({
          name: 'manual-update',
          query: {
            id: row.id
          }
        });
    },
    addManual() {
      this.addManualVisible = true;
    },
    editManual(item) {
      this.newManual = item.row;
      this.addManualVisible = true;
    },
    delManual({$index, row}) {
      this.$confirm('确定要删除此手工工分项?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.HisManualData.del(row.id);
            this.manual.splice($index, 1);
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

<style lang="scss">
@import '../../styles/vars';
.manual-name {
  cursor: pointer;

  :hover {
    color: $color-primary;
  }
}
</style>
