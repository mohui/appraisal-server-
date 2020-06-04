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
      <div v-for="(item, index) in ruleList" :key="item.ruleId">
        <div class="check-class-title">
          <span v-if="!!item.isEdit">
            <el-input
              v-model="item.ruleName"
              size="mini"
              placeholder="请输入考核分类名称"
            >
            </el-input>
            <el-button plain type="success" size="mini" @click="saveGroup(item)"
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
          <span v-else>{{ item.ruleName }} （{{ item.ruleScores }}分）</span>
          <div>
            <el-button
              v-if="index === ruleList.length - 1"
              plain
              type="primary"
              size="mini"
              @click="addGroup"
            >
              新增
            </el-button>
            <el-button
              plain
              type="primary"
              size="mini"
              v-show="!item.isEdit"
              @click="editGroup(item, index)"
              >修改
            </el-button>
            <el-button
              v-show="!item.isEdit"
              plain
              type="danger"
              size="mini"
              @click="delGroup(item, index)"
              >删除
            </el-button>
          </div>
        </div>
        <el-table :data="item.group">
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
                <el-button
                  plain
                  size="mini"
                  type="primary"
                  icon="el-icon-check"
                  @click="openStandardDialog(index, scope)"
                  >选择指标</el-button
                >
              </span>
              <span v-else>{{ scope.row.ruleTagName }}</span>
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
                <el-button
                  plain
                  type="primary"
                  size="mini"
                  @click="scope.row.isEdit = false"
                  >取消
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
                  @click="delRule(scope, index)"
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
    <el-dialog title="指标库" :visible.sync="dialogStandardVisible">
      <el-link
        target="_blank"
        download
        href="/系统考核规则详解共识.pdf"
        :underline="false"
        style="position: absolute;top: 20px;left: 100px;"
      >
        <el-button plain size="small" type="primary">指标解读下载</el-button>
      </el-link>
      <el-tabs type="card" @tab-click="handleClick" v-model="curTag">
        <el-tab-pane
          v-for="i of markTags"
          :key="i.code"
          :label="i.name"
          :name="i.code"
        >
          <el-tabs v-model="secondCurTag">
            <el-tab-pane
              v-for="(item, index) of i.children"
              :key="index"
              :label="item.name"
              :name="index.toString()"
            >
              <table style="width:100%;">
                <thead style="background-color: #ebebeb;">
                  <tr>
                    <th>指标内涵</th>
                    <th>计算方式</th>
                    <th>指标值</th>
                    <th>得分</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(k, index) of item.children"
                    :key="index"
                    :style="!k.enabled ? 'background-color: #f8f8f8' : ''"
                  >
                    <td>
                      <label>
                        <el-checkbox v-model="k.checked" :disabled="!k.enabled">
                          {{ k.name }}
                        </el-checkbox>
                      </label>
                    </td>
                    <td style="text-align: center">
                      <el-select
                        size="mini"
                        v-model="k.algorithm"
                        :disabled="!k.enabled"
                        placeholder="请选择"
                      >
                        <el-option
                          v-for="item in tagAlgorithm"
                          :key="item.code"
                          :label="item.name"
                          :value="item.code"
                        >
                        </el-option>
                      </el-select>
                    </td>
                    <td style="text-align: center; width: 180px">
                      <el-input-number
                        size="mini"
                        :min="0"
                        :disabled="!k.enabled"
                        v-model="k.baseline"
                      ></el-input-number>
                      <span
                        style="margin: 0 -15px 0 5px;"
                        v-if="k.algorithm === 'egt' || k.algorithm === 'elt'"
                        >%</span
                      >
                    </td>
                    <td style="text-align: center">
                      <el-input-number
                        size="mini"
                        :min="0"
                        :disabled="!k.enabled"
                        v-model="k.score"
                      ></el-input-number>
                    </td>
                  </tr>
                </tbody>
              </table>
            </el-tab-pane>
          </el-tabs>
        </el-tab-pane>
      </el-tabs>

      <div slot="footer" class="dialog-footer">
        <el-button plain @click="dialogStandardVisible = false">
          取 消
        </el-button>
        <el-button plain type="primary" @click="saveStandard">
          确 定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import Vue from 'vue';
import {
  MarkTags,
  TagAlgorithm,
  MarkTagUsages
} from '../../../../common/rule-score.ts';
export default {
  name: 'rule',
  data() {
    return {
      checkId: '',
      checkName: '',
      ruleList: [],
      dialogStandardVisible: false,
      localStandardVisible: false,
      formulaList: [],
      markTags: MarkTags,
      curTag: MarkTags[0].code,
      secondCurTag: '0',
      curRule: {},
      tagAlgorithm: TagAlgorithm,
      standardList: [],
      standardTab: []
    };
  },
  created() {
    this.checkId = this.$route.query.checkId;
    this.checkName = decodeURIComponent(this.$route.query.checkName);
    this.getRuleList();
  },
  methods: {
    //获取细则列表
    async getRuleList() {
      try {
        let result = await this.$api.CheckSystem.listRule({
          checkId: this.checkId
        });

        if (result.count > 0) {
          this.ruleList = result.rows.map(
            it =>
              new Vue({
                data() {
                  return {
                    ...it,
                    isEdit: false,
                    group: it.group.map(item => ({
                      ...item,
                      isEdit: false,
                      ruleTagName: item.ruleTags
                        .map(its => MarkTagUsages[its.tag].name)
                        .join('，'),
                      created_at: item.created_at.$format('YYYY-MM-DD'),
                      updated_at: item.updated_at.$format('YYYY-MM-DD')
                    }))
                  };
                },
                computed: {
                  ruleScores: {
                    get() {
                      return this.group.reduce(
                        (acc, cur) => acc + cur.ruleScore,
                        0
                      );
                    }
                  }
                }
              })
          );
        } else {
          this.addGroup();
        }
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //打开指标库对话框
    openStandardDialog(index, {$index, row}) {
      this.curRule = Object.assign({}, {index, $index}, row);
      this.markTags = MarkTags.map(it => ({
        ...it,
        children: it.children.map(its => ({
          ...its,
          children: its.children.map(item => {
            const isChecked =
              row.ruleTags.findIndex(items => items.tag === item.code) !== -1;
            const curObj =
              isChecked &&
              row.ruleTags.filter(items => items.tag === item.code)[0];
            let obj = Object.assign({}, item, {
              checked: item.enabled && isChecked
            });
            if (curObj.algorithm) {
              obj = Object.assign({}, obj, {
                algorithm: curObj.algorithm
              });
            }
            if (curObj.baseline) {
              obj = Object.assign({}, obj, {
                baseline:
                  item.name.indexOf('率') !== -1 &&
                  (curObj.algorithm === 'egt' || curObj.algorithm === 'elt')
                    ? Number.parseInt(curObj.baseline * 100)
                    : curObj.baseline
              });
            }
            if (curObj.score) {
              obj = Object.assign({}, obj, {
                score: curObj.score
              });
            }
            return obj;
          })
        }))
      }));
      this.dialogStandardVisible = true;
    },
    //保存指标
    async saveStandard() {
      const {ruleId, index, $index} = this.curRule;
      const tags = this.markTags
        .map(it => it.children)
        .reduce((acc, cur) => acc.concat(cur), [])
        .map(it => it.children)
        .reduce((acc, cur) => acc.concat(cur), [])
        .filter(it => it.checked)
        .map(it => ({
          tag: it.code,
          algorithm: it.algorithm,
          baseline:
            it.name.indexOf('率') !== -1 &&
            (it.algorithm === 'egt' || it.algorithm === 'elt')
              ? +Number.parseFloat(it.baseline / 100).toFixed(2)
              : it.baseline,
          score: it.score
        }));
      try {
        if (ruleId) {
          await this.$api.RuleTag.upsert({ruleId, tags});
        } else {
          this.curRule.ruleTags = tags;
          this.ruleList[index].group[$index].ruleTags = tags;
          this.curRule.ruleTagName = tags
            .map(its => MarkTagUsages[its.tag].name)
            .join('，');
          this.ruleList[index].group[
            $index
          ].ruleTagName = this.curRule.ruleTagName;
        }
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.dialogStandardVisible = false;
      }
    },
    //标签初始显示第一个
    handleClick() {
      this.secondCurTag = '0';
    },
    //添加细则编辑框
    addGroup() {
      this.ruleList.push({
        checkId: this.checkId,
        ruleName: '',
        ruleId: '',
        ruleScore: 0,
        status: true,
        isEdit: true,
        group: [
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
            status: true,
            isEdit: true
          }
        ]
      });
    },
    //保存细则分组
    async saveGroup(row) {
      const {checkId, ruleId, ruleName} = row;
      if (ruleName === '') {
        return this.$message({
          message: '请输入考核分类',
          type: 'error'
        });
      }
      try {
        ruleId
          ? await this.$api.CheckSystem.updateRuleGroup({ruleId, ruleName})
          : await this.$api.CheckSystem.addRuleGroup({checkId, ruleName});
        this.$message({
          type: 'success',
          message: '保存成功!'
        });
        row.isEdit = false;
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //切换细则分组编辑状态
    editGroup(item) {
      item.isEdit = true;
    },
    //删除细则分组
    delGroup(row, index) {
      this.$confirm('删除分类将同时删除包含的所有细则, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.CheckSystem.removeRule(row.ruleId);
            this.$message({
              type: 'success',
              message: '删除成功!'
            });
            this.ruleList.splice(index, 1);
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
    //新添加细则占位编辑框
    addRule(item) {
      let showInput = item.group.some(v => v.isEdit);
      if (!item.ruleId) {
        this.$message({
          type: 'error',
          message: '请先保存考核分类'
        });
        return;
      }
      if (showInput) {
        this.$message({
          type: 'error',
          message: '请先保存考核细则'
        });
      } else {
        item.group.push({
          checkId: this.checkId,
          parentRuleId: item.ruleId,
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
          status: true,
          isEdit: true
        });
      }
    },
    //保存细则
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
        const {
          ruleId,
          ruleName,
          parentRuleId,
          checkId,
          ruleScore,
          checkStandard,
          checkMethod,
          evaluateStandard,
          status,
          ruleTags
        } = row;

        let result;
        if (!ruleId) {
          result = await this.$api.CheckSystem.addRule({
            checkId,
            ruleName,
            parentRuleId,
            ruleScore,
            checkStandard,
            checkMethod,
            status,
            evaluateStandard
          });

          this.$set(row, 'ruleId', result.ruleId);
          if (ruleTags.length) {
            await this.$api.RuleTag.upsert({
              ruleId: result.ruleId,
              tags: ruleTags
            });
          }
        } else {
          await this.$api.CheckSystem.updateRule({
            ruleId,
            ruleName,
            parentRuleId,
            checkId,
            evaluateStandard,
            ruleScore,
            checkStandard,
            checkMethod,
            status
          });
        }

        this.$message({
          type: 'success',
          message: '保存成功!'
        });

        this.$set(row, 'isEdit', false);
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //切换细则编辑状态
    editRule(item) {
      item.isEdit = true;
    },
    //删除细则
    delRule({row, $index}, i) {
      this.$confirm('此操作将永久删除该细则, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.CheckSystem.removeRule(row.ruleId);
            this.$message({
              type: 'success',
              message: '删除成功!'
            });
            this.ruleList[i].group.splice($index, 1);
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
