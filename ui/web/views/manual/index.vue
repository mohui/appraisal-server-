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
        <span>手工数据维护</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          plain
          @click="addManual"
          >添加项目
        </el-button>
      </div>
      <el-table
        v-loading="$asyncComputed.serverData.updating"
        :data="manual"
        empty-text="没有筛选到符合条件的数据"
        stripe
        border
        size="small"
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
        <el-table-column prop="name" label="手工工公项名称">
          <template slot-scope="scope">
            <div v-if="!scope.row.EDIT">
              {{ scope.row.name }}
            </div>
            <el-input
              v-if="scope.row.EDIT"
              v-model="scope.row.name"
              size="mini"
              placeholder="请输入手工工公项名称"
            ></el-input>
          </template>
        </el-table-column>
        <el-table-column prop="members" label="考核员工"></el-table-column>
        <el-table-column
          prop="value"
          label="数值"
          align="center"
        ></el-table-column>
        <el-table-column
          prop="createdAt"
          label="时间"
          align="center"
        ></el-table-column>
        <el-table-column label="操作" align="center">
          <template slot-scope="scope">
            <el-button
              v-if="!scope.row.id"
              type="primary"
              size="mini"
              :disabled="!scope.row.name"
              @click="addManual(scope)"
            >
              添加
            </el-button>
            <el-button
              v-if="scope.row.id && scope.row.EDIT"
              type="primary"
              size="mini"
              :disabled="!scope.row.name"
              @click="saveManual(scope)"
            >
              保存
            </el-button>
            <el-button
              v-if="scope.row.id && !scope.row.EDIT"
              type="primary"
              size="mini"
              @click="editManual(scope)"
            >
              修改
            </el-button>
            <el-button
              v-if="scope.row.id && !scope.row.EDIT"
              type="danger"
              size="mini"
              @click="delManual(scope)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
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
        <el-form-item label="手工工公项名称" prop="name">
          <el-input
            v-model="newManual.name"
            size="mini"
            placeholder="请输入手工工公项名称"
          ></el-input>
        </el-form-item>
        <el-form-item label="数据类型" prop="type">
          <el-radio-group v-model="newManual.type">
            <el-radio label="attr">属性型</el-radio>
            <el-radio label="log">日志型</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="addManualVisible = false">取 消</el-button>
        <el-button type="primary" @click="submitForm()">
          确 定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Manual',
  data() {
    return {
      addManualVisible: false,
      newManual: {
        id: '',
        name: '',
        type: 'attr' //log
      },
      manualRules: {
        name: [
          {required: true, message: '请输入手工工分项名称', trigger: 'change'}
        ]
      },
      manual0: [
        {
          type: 'attr', //log
          id: '',
          name: '',
          value: '',
          members: [],
          createdAt: new Date().$format()
        }
      ]
    };
  },
  computed: {
    manual() {
      return this.serverData.rows;
    }
  },
  created() {},
  asyncComputed: {
    serverData: {
      async get() {
        // return this.$api.Person.list();
        let data = [];
        try {
          await new Promise(resolve =>
            setTimeout(() => {
              for (let i = 0; i < 10; i++) {
                data.push({
                  type: 'attr', //log
                  id: new Date().getTime(),
                  name: '手工工分项' + (i + 1),
                  value: Math.floor(Math.random() * (i + 1) * 1000),
                  members:
                    [
                      '赵',
                      '钱',
                      '孙',
                      '李',
                      '周',
                      '吴',
                      '郑',
                      '王',
                      '冯',
                      '陈'
                    ][Math.floor(Math.random() * 10)] + '医生',
                  createdAt: new Date().$format()
                });
              }
              resolve();
            }, 1000)
          );
          return {
            counts: 10,
            rows: data
          };
        } catch (e) {
          console.error(e.message);
        }
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
    resetForm() {
      this.$refs['manualForm'].resetFields();
      this.addManualVisible = false;
      this.newManual = {id: '', name: '', type: 'attr'};
    },
    async submitForm() {
      try {
        const valid = await this.$refs['manualForm'].validate();
        if (valid) {
          if (!this.newManual.id) {
            this.$set(this.serverData.rows, this.manual.length, {
              type: this.newManual.type, //log
              id: new Date().getTime(),
              name: this.newManual.name,
              value: Math.floor(Math.random() * 1000),
              members: '',
              createdAt: new Date().$format()
            });
            this.$message.success('添加成功');
          } else {
            const index = this.serverData.rows.findIndex(
              it => it.id === this.newManual.id
            );
            this.$set(this.serverData.rows, index, {
              type: this.newManual.type, //log
              id: new Date().getTime(),
              name: this.newManual.name,
              value: Math.floor(Math.random() * 1000),
              members: this.serverData.rows[index].members,
              createdAt: new Date().$format()
            });
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
            id: row.id,
            name: row.name,
            type: row.type
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
    delManual({$index}) {
      this.$confirm('确定要删除此手工工公项名称?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            // await this.$api.xxx.remove(row.id);
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
.manual-name {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}
</style>
