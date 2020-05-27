<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>《{{ checkName }}》 规则详情</span>
        <el-button
          style="float: right;margin: -9px;"
          type="primary"
          @click="
            $router.push({
              name: 'check'
            })
          "
          >返回
        </el-button>
      </div>
      <div v-for="(item, index) in ruleList" :key="item.checkId">
        <div class="check-class-title">
          <span v-if="!!item.isEdit">
            <el-input
              v-model="item.name"
              size="mini"
              placeholder="请输入考核分类名称"
            >
            </el-input>
            <el-button plain type="success" size="mini" @click="saveClass(item)"
              >保存
            </el-button>
            <el-button
              plain
              type="warning"
              size="mini"
              @click="item.isEdit = false"
              >取消
            </el-button>
          </span>
          <span v-else>{{ item.name }} （{{ item.ruleScore }}分）</span>
          <div>
            <el-button
              v-if="index === ruleList.length - 1"
              plain
              type="primary"
              size="mini"
              @click="addClass"
            >
              新增
            </el-button>
            <el-button
              plain
              type="primary"
              size="mini"
              v-show="!item.isEdit"
              @click="editClass(item, index)"
              >修改
            </el-button>
            <el-button
              v-show="!item.isEdit"
              plain
              type="danger"
              size="mini"
              @click="delClass(item)"
              >删除
            </el-button>
          </div>
        </div>
        <el-table :data="item.children">
          <el-table-column
            width="50px"
            type="index"
            align="center"
            label="序号"
          ></el-table-column>
          <el-table-column align="center" label="考核内容">
            <template slot-scope="scope">
              <span v-if="scope.row.isEdit">
                <el-input
                  v-model="scope.row.ruleName"
                  size="mini"
                  type="textarea"
                  :autosize="{minRows: 4, maxRows: 10}"
                  placeholder="请输入考核内容"
                >
                </el-input>
              </span>
              <span v-else>{{ scope.row.ruleName }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="分值">
            <template slot-scope="scope">
              <span v-if="scope.row.isEdit">
                <el-input-number
                  v-model="scope.row.ruleScore"
                  size="mini"
                  :min="0"
                  placeholder="请输入分值"
                >
                </el-input-number>
              </span>
              <span v-else>{{ scope.row.ruleScore }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="考核标准">
            <template slot-scope="scope">
              <span v-if="scope.row.isEdit">
                <el-input
                  v-model="scope.row.checkStandard"
                  size="mini"
                  type="textarea"
                  :autosize="{minRows: 4, maxRows: 10}"
                  placeholder="请输入考核标准"
                >
                </el-input>
              </span>
              <span v-else>{{ scope.row.checkStandard }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="考核方法">
            <template slot-scope="scope">
              <span v-if="scope.row.isEdit">
                <el-input
                  v-model="scope.row.checkMethod"
                  size="mini"
                  type="textarea"
                  :autosize="{minRows: 4, maxRows: 10}"
                  placeholder="请输入考核方法"
                >
                </el-input>
              </span>
              <span v-else>{{ scope.row.checkMethod }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="评分标准">
            <template slot-scope="scope">
              <span v-if="scope.row.isEdit">
                <el-input
                  v-model="scope.row.evaluateStandard"
                  size="mini"
                  type="textarea"
                  :autosize="{minRows: 4, maxRows: 10}"
                  placeholder="请输入评分标准"
                >
                </el-input>
              </span>
              <span v-else>{{ scope.row.evaluateStandard }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="关联关系">
            <template slot-scope="scope">
              <span v-if="scope.row.isEdit">
                <el-input
                  v-model="scope.row.standardName"
                  size="mini"
                  placeholder="请选择关联关系"
                  @focus="
                    openStandardDialog(
                      index,
                      scope.$index,
                      scope.row.standardName
                    )
                  "
                >
                </el-input>
              </span>
              <span v-else>{{ scope.row.standardNames }}</span>
            </template>
          </el-table-column>
          <el-table-column align="center" label="操作">
            <template slot-scope="scope">
              <div v-if="scope.row.isEdit">
                <el-button
                  plain
                  type="success"
                  size="mini"
                  @click="saveRule(scope.row, item.ruleId)"
                  >保存
                </el-button>
              </div>
              <div v-else>
                <el-button
                  plain
                  type="primary"
                  size="mini"
                  @click="editRule(scope.row)"
                  >修改
                </el-button>
                <el-button
                  plain
                  type="danger"
                  size="mini"
                  @click="delRule(scope)"
                  >删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-col :span="24">
          <div class="add-rule" @click="addRule(item)">
            <span>+ 新增考核项</span>
          </div>
        </el-col>
      </div>
    </el-card>
  </div>
</template>

<script>
import Vue from 'vue';

export default {
  name: 'rule',
  data() {
    return {
      checkId: '',
      checkName: '',
      dialogStandardVisible: false
    };
  },
  computed: {
    ruleList() {
      const listRule = this.listRule;
      return [
        Vue.observable({
          checkId: '042cdf56-9191-464c-9da0-c6555f13e051',
          children: listRule.rows.map(it => ({
            ...it,
            isEdit: false,
            standardName: '',
            created_at: it.created_at.$format('YYYY-MM-DD'),
            updated_at: it.updated_at.$format('YYYY-MM-DD')
          })),
          isEdit: false,
          name: '默认分类',
          ruleId: 'f700cb12-16a3-4414-b2f7-70b27c5167b2',
          ruleScore: 80
        })
      ];
    }
  },
  created() {
    this.checkId = this.$route.query.checkId;
    this.checkName = decodeURIComponent(this.$route.query.checkName);
  },
  asyncComputed: {
    listRule: {
      async get() {
        return await this.$api.CheckSystem.listRule({checkId: this.checkId});
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
    openStandardDialog() {
      this.dialogStandardVisible = true;
    },
    addClass() {
      this.ruleList.push({
        checkId: this.checkId,
        name: '',
        ruleId: '',
        ruleScore: 0,
        isEdit: true,
        children: [
          {
            checkId: this.checkId,
            // 考核内容
            ruleName: '',
            // 分值
            ruleScore: '',
            // 考核标准
            checkStandard: '',
            // 考核方法
            checkMethod: '',
            // 评分标准
            evaluateStandard: '',
            //关联关系
            standardId: '',
            standardName: '',
            isEdit: true
          }
        ]
      });
    },
    //保存分类方法
    async saveClass(row) {
      const {ruleId, name} = row;
      if (name === '') {
        return this.$message({
          message: '请输入考核分类',
          type: 'error'
        });
      }
      try {
        await this.$api.CheckSystem.addClass({ruleId, name});
        this.$asyncComputed.listRule.update();
        this.$message({
          type: 'success',
          message: '保存成功!'
        });
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    editClass(item) {
      item.isEdit = true;
    },
    delClass(row) {
      this.$confirm('删除分类将同时删除包含的所有细则, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.CheckSystem.removeClass(row.ruleId);
            this.$asyncComputed.listRule.update();
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
    },
    addRule(item) {
      let showInput = item.children.some(v => v.isEdit);
      if (showInput) {
        this.$message({
          type: 'error',
          message: '请先保存考核系项'
        });
      } else {
        item.children.push({
          checkId: this.checkId,
          // 考核内容
          ruleName: '',
          // 分值
          ruleScore: '',
          // 考核标准
          checkStandard: '',
          // 考核方法
          checkMethod: '',
          // 评分标准
          evaluateStandard: '',
          //关联关系
          standardId: '',
          standardName: '',
          isEdit: true
        });
      }
    },
    async saveRule(row) {
      if (row.ruleName === '') {
        return this.$message({
          message: '考核内容不能为空',
          type: 'error'
        });
      } else if (row.ruleScore === '') {
        return this.$message({
          message: '分值不能为空',
          type: 'error'
        });
      } else if (row.checkStandard === '') {
        return this.$message({
          message: '考核标准不能为空',
          type: 'error'
        });
      } else if (row.ruleScore < 0) {
        return this.$message({
          message: '分值不能小于0',
          type: 'error'
        });
      } else if (row.checkMethod === '') {
        return this.$message({
          message: '考核方法不能为空',
          type: 'error'
        });
      } else if (row.evaluateStandard === '') {
        return this.$message({
          message: '评分标准不能为空',
          type: 'error'
        });
      }
      try {
        // let selectStand = this.selectStand.map(it => ({
        //   formulaId: it.formulaId,
        //   id: it.id,
        //   name: it.name,
        //   norm: it.norm,
        //   scoreRate: it.scoreRate
        // }));
        const {
          ruleId,
          ruleName,
          parentRuleId,
          checkId,
          ruleScore,
          checkStandard,
          checkMethod,
          evaluateStandard,
          status
        } = row;
        // const standardIds = [];
        let result;
        if (!ruleId) {
          result = await this.$api.CheckSystem.addRule({
            checkId,
            ruleName,
            ruleScore,
            checkStandard,
            checkMethod,
            status: 'N',
            evaluateStandard
          });
          console.log(result);
        } else {
          result = await this.$api.CheckSystem.updateRule({
            ruleId,
            ruleName,
            parentRuleId, //: 'f700cb12-16a3-4414-b2f7-70b27c5167b2'
            checkId,
            evaluateStandard,
            ruleScore,
            checkStandard,
            checkMethod,
            status
          });
          console.log(result);
        }

        this.$message({
          type: 'success',
          message: '保存成功!'
        });
        // this.firstActiveName = '0';
        // this.secondActiveName = '0';
        this.$set(row, 'isEdit', false);
        this.$asyncComputed.listRule.update();
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    editRule(item) {
      item.isEdit = true;
    },
    delRule({row}) {
      this.$confirm('此操作将永久删除该细则, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.CheckSystem.removeRule(row.ruleId);
            this.$asyncComputed.listRule.update();
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

<style scoped lang="scss">
.check-class-title {
  display: flex;
  justify-content: space-between;
  background-color: #dee2e6;
  line-height: 26px;
  padding: 5px 0;
  span {
    padding: 0 20px;
    display: flex;
  }
  div {
    padding: 0 20px;
  }
}
.add-rule {
  margin: 10px 0 30px;
  width: 100%;
  height: 34px;
  border: 1px dashed #c1c1cd;
  border-radius: 3px;
  cursor: pointer;
  justify-content: center;
  display: flex;
  line-height: 34px;
  color: green;
}
</style>
