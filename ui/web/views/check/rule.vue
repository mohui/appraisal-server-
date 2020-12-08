<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 80px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '20px 0 0 10px'
      }"
    >
      <div slot="header" class="clearfix">
        <span>《{{ checkName }}》 规则详情</span>
        <el-button
          style="float: right;margin:0 -9px;"
          type="primary"
          size="small"
          @click="
            $router.push({
              name: 'check'
            })
          "
          >返回
        </el-button>
      </div>
      <div
        style="flex-grow: 1;height: 0; overflow-y: auto; overflow-x: hidden;"
      >
        <div v-for="(item, index) in ruleList" :key="item.ruleId">
          <div class="check-class-title">
            <span v-if="!!item.isEdit">
              <el-input
                v-model="item.ruleName"
                size="mini"
                placeholder="请输入考核分类名称"
              >
              </el-input>
              <el-input-number
                v-model="item.budget"
                :precision="4"
                style="width: 300px;"
                size="mini"
                placeholder="请输入金额"
              ></el-input-number>
              <el-tooltip content="选择工分项" :enterable="false">
                <el-button
                  icon="el-icon-s-claim"
                  circle
                  type="primary"
                  size="mini"
                  @click.stop="selectWorkPoint(item)"
                >
                </el-button>
              </el-tooltip>
              <el-button
                plain
                type="success"
                size="mini"
                @click="saveGroup(item)"
                >保存
              </el-button>
              <el-button
                plain
                type="warning"
                size="mini"
                @click="cancelGroup(item)"
                >取消
              </el-button>
            </span>
            <span v-else>
              {{ item.ruleName }}（<em> {{ item.ruleScores }}分</em>）
              <span class="sub-attr">
                分配金额：
                <em> {{ item.budget }} 元 </em>
              </span>
              <span v-if="item.projects.length > 0" class="sub-tip">
                <el-tooltip
                  :content="
                    '绑定工分项：' + item.projects.map(it => it.name).join('，')
                  "
                  :enterable="false"
                >
                  <el-button
                    icon="el-icon-s-claim"
                    circle
                    type="primary"
                    size="mini"
                  >
                  </el-button>
                </el-tooltip>
              </span>
            </span>
            <div>
              <el-button
                plain
                type="primary"
                size="mini"
                v-show="!item.isEdit && !item.group.some(it => it.isEdit)"
                @click="addRule(item)"
                v-permission="permission.RULE_ADD"
              >
                新增细则
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
            <el-table-column align="center" label="考核内容" min-width="200">
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
            <el-table-column align="center" label="分值" min-width="140">
              <template slot-scope="scope">
                <span v-if="scope.row.isEdit">
                  <el-input-number
                    v-model="scope.row.ruleScore"
                    size="mini"
                    :min="0"
                    placeholder="请输入分值"
                  >
                  </el-input-number>
                  <span
                    v-if="scope.row.scoreChanged"
                    style="color:#f00;font-size: 12px;"
                  >
                    请同步调整关联关系的分值
                  </span>
                </span>
                <span v-else>{{ scope.row.ruleScore }}</span>
              </template>
            </el-table-column>
            <el-table-column align="center" label="考核标准" min-width="300">
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
            <el-table-column align="center" label="考核方法" min-width="200">
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
            <el-table-column align="center" label="评分标准" min-width="200">
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
            <el-table-column align="center" label="关联关系" min-width="200">
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
            <el-table-column align="center" label="操作" min-width="200">
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
                    @click="cancelRule(scope.row, item)"
                    >取消
                  </el-button>
                </div>
                <div v-else>
                  <el-button
                    plain
                    v-permission="{
                      permission: permission.RULE_UPDATE,
                      type: 'disabled'
                    }"
                    type="primary"
                    size="mini"
                    @click="editRule(scope.row)"
                    >修改
                  </el-button>
                  <el-button
                    plain
                    v-permission="{
                      permission: permission.RULE_REMOVE,
                      type: 'disabled'
                    }"
                    type="danger"
                    size="mini"
                    @click="delRule(scope, index)"
                    >删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-col
            :span="24"
            v-if="!item.isEdit && index === ruleList.length - 1"
          >
            <div class="add-rule" @click="addGroup">
              <span>+ 新增考核项</span>
            </div>
          </el-col>
        </div>
      </div>
    </el-card>
    <el-dialog title="指标库" :visible.sync="dialogStandardVisible">
      <el-link
        target="_blank"
        download
        href="/2020系统考核规则详解共识.pdf"
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
                    <td style="text-align: center; width: 300px">
                      <el-input-number
                        size="mini"
                        :min="0"
                        :disabled="!k.enabled"
                        v-model="k.baseline"
                      ></el-input-number>
                      <span
                        style="margin: 0 -15px 0 5px;"
                        v-if="
                          k.name.includes('率') &&
                            (k.algorithm === 'egt' || k.algorithm === 'elt')
                        "
                      >
                        %
                      </span>
                      <span
                        style="margin: 0 -15px 0 5px;"
                        v-if="k.algorithm === 'attach'"
                        >个附件
                        <el-popover
                          placement="bottom"
                          width="360"
                          trigger="click"
                        >
                          <el-date-picker
                            type="daterange"
                            v-model="k.daterange"
                            range-separator="至"
                            start-placeholder="开始日期"
                            end-placeholder="结束日期"
                          >
                          </el-date-picker>
                          <el-button
                            size="mini"
                            slot="reference"
                            type="primary"
                          >
                            上传时间
                          </el-button>
                        </el-popover>
                      </span>
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
        <el-button plain @click="cancelStandard">
          取 消
        </el-button>
        <el-button plain type="primary" @click="saveStandard">
          确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog title="工分项" :visible.sync="workPointVisible">
      <el-table
        border
        :data="tableData"
        ref="multipleTable"
        height="300"
        size="small"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" :selectable="isDisabled">
        </el-table-column>
        <el-table-column prop="name" label="名称"></el-table-column>
        <el-table-column label="考核项">
          <template slot-scope="scope">
            {{ getRuleName(scope.row.id) }}
          </template>
        </el-table-column>
      </el-table>
      <span slot="footer" class="dialog-footer">
        <el-button @click="cancelWorkPoint">取 消</el-button>
        <el-button type="primary" @click="saveWorkPoint">
          确 定
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import Vue from 'vue';
import dayjs from 'dayjs';
import {
  MarkTags,
  TagAlgorithm,
  MarkTagUsages,
  TagAlgorithmUsages
} from '../../../../common/rule-score.ts';
import {Permission} from '../../../../common/permission.ts';
import {Projects} from '../../../../common/project.ts';

export default {
  name: 'rule',
  data() {
    return {
      workPointVisible: false,
      multipleSelection: [],
      curRuleGroupID: '',
      tableData: Projects,
      permission: Permission,
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
    //选择工分项，已选项保持选择状态
    selectWorkPoint(item) {
      this.workPointVisible = true;
      this.curRuleGroupID = item.ruleId;

      if (item.projects.length > 0) {
        let arr = [];
        this.tableData.forEach(it => {
          if (item.projects.some(its => its.id === it.id)) {
            arr.push(it);
          }
        });
        this.$nextTick(() => {
          this.$refs.multipleTable.clearSelection();
          arr.forEach(row => {
            this.$refs.multipleTable.toggleRowSelection(row, true);
          });
        });
      } else {
        if (this.multipleSelection.length > 0) {
          this.$refs.multipleTable.clearSelection();
        }
      }
    },
    //取消选择工分项
    cancelWorkPoint() {
      this.workPointVisible = false;
    },
    //保存所选工分项到所属考核项
    saveWorkPoint() {
      this.workPointVisible = false;
      this.ruleList.forEach(it => {
        if (it.ruleId === this.curRuleGroupID) {
          it.projects = this.multipleSelection;
        }
      });
      if (this.multipleSelection.length > 0) {
        this.$refs.multipleTable.clearSelection();
      }
    },
    handleSelectionChange(val) {
      this.multipleSelection = val;
    },
    //已被选择工分项不能再选择
    isDisabled(row) {
      const is = this.ruleList
        .filter(item => item.ruleId !== this.curRuleGroupID)
        .map(it => it.projects)
        .flat()
        .some(item => item.id === row.id);
      if (is) {
        return 0;
      } else {
        return 1;
      }
    },
    //获取已被选择工分项的所属考核项名称
    getRuleName(item) {
      const obj = this.ruleList
        .filter(item => item.ruleId !== this.curRuleGroupID)
        .find(it => it.projects.some(its => its.id === item));
      return obj?.ruleName;
    },
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
                    original: it,
                    isEdit: false,
                    group: it.group.map(
                      item =>
                        new Vue({
                          data() {
                            return {
                              ...item,
                              isEdit: false,
                              original: item,
                              ruleTagName: item.ruleTags
                                .map(its => MarkTagUsages[its.tag].name)
                                .join('，'),
                              created_at: item.created_at.$format('YYYY-MM-DD'),
                              updated_at: item.updated_at.$format('YYYY-MM-DD')
                            };
                          },
                          computed: {
                            scoreChanged: {
                              get() {
                                return (
                                  this.ruleScore <
                                  this.ruleTags.reduce(
                                    (acc, cur) => acc + cur.score,
                                    0
                                  )
                                );
                              }
                            }
                          }
                        })
                    )
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
        children: it.children.map(its => {
          return {
            ...its,
            children: its.children.map(item => {
              // 寻找已经勾选的指标
              const checkedTag = row?.ruleTags?.find(
                items => items.tag === item.code
              ) ?? {checked: false};
              // 真正的返回值
              const returnValue = {
                ...item,
                checked: true, // 默认选中, 会被checkedTag覆盖
                ...checkedTag,
                daterange: checkedTag.attachStartDate
                  ? [
                      checkedTag.attachStartDate,
                      dayjs(checkedTag.attachEndDate).subtract(1, 'day')
                    ]
                  : [],
                baseline: checkedTag.baseline || undefined
              };

              // 参考值的处理
              if (
                returnValue.baseline &&
                returnValue.name.includes('率') &&
                (returnValue.algorithm === 'egt' ||
                  returnValue.algorithm === 'elt')
              ) {
                returnValue.baseline = returnValue.baseline * 100;
              }
              return returnValue;
            })
          };
        })
      }));
      this.dialogStandardVisible = true;
    },
    //取消指标配置
    cancelStandard() {
      const {index, $index} = this.curRule;
      this.dialogStandardVisible = false;

      if (!this.ruleList[index].group[$index].ruleTags) return;
      this.ruleList[index].group[$index].ruleTags = this.ruleList[index].group[
        $index
      ].original.ruleTags;
      this.ruleList[index].group[$index].ruleTagName = this.ruleList[
        index
      ].group[$index].original?.ruleTags
        .map(its => MarkTagUsages[its.tag].name)
        .join('，');
    },
    //保存指标
    async saveStandard() {
      const {ruleId, index, $index, ruleScore} = this.curRule;
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
          score: it.score,
          attachStartDate: it.daterange.length ? it.daterange[0] : null,
          attachEndDate:
            it.daterange.length === 2
              ? dayjs(it.daterange[1]).add(1, 'day')
              : null
        }));

      const notAlgorithm = tags.some(it => !it.algorithm);
      if (notAlgorithm) {
        return this.$message({
          message: '请选择计算方式！',
          type: 'error'
        });
      }
      const hasAttach = tags.some(
        it => it.algorithm === TagAlgorithmUsages.attach.code
      );
      const noAttach = tags.some(
        it => it.algorithm !== TagAlgorithmUsages.attach.code
      );
      if (hasAttach && noAttach) {
        return this.$message({
          message: '定性指标请单独设置！',
          type: 'error'
        });
      }
      const totalScore = tags.reduce((acc, cur) => acc + cur.score, 0);
      if (totalScore > ruleScore) {
        return this.$message({
          message: `总分值为:${ruleScore}, 请合理分配各指标得分。`,
          type: 'error'
        });
      }

      try {
        if (ruleId) {
          await this.$api.RuleTag.upsert({ruleId, tags});
        }
        this.curRule.ruleTags = tags;
        this.ruleList[index].group[$index].ruleTags = tags;
        this.curRule.ruleTagName = tags
          .map(its => MarkTagUsages[its.tag].name)
          .join('，');
        this.ruleList[index].group[
          $index
        ].ruleTagName = this.curRule.ruleTagName;
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
        projects: [],
        group: []
      });
    },
    //细则分类编辑取消
    cancelGroup(item) {
      !item.ruleId
        ? this.ruleList.pop()
        : ((item.ruleName = item.original.ruleName),
          (item.budget = item.original.budget));
      item.isEdit = false;
    },
    //保存细则分类
    async saveGroup(row) {
      const {checkId, ruleId, ruleName, budget, projects = []} = row;
      if (ruleName === '') {
        return this.$message({
          message: '请输入考核分类',
          type: 'error'
        });
      }
      try {
        let result = ruleId
          ? await this.$api.CheckSystem.updateRuleGroup({
              ruleId,
              ruleName,
              budget,
              projects: projects.map(it => it.id)
            })
          : await this.$api.CheckSystem.addRuleGroup({
              checkId,
              ruleName,
              budget,
              projects: projects.map(it => it.id)
            });
        this.$message({
          type: 'success',
          message: '保存成功!'
        });
        if (result.ruleId) {
          row.ruleId = result.ruleId;
          row.projects = projects;
        }
        row.isEdit = false;
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //切换细则分类编辑状态
    editGroup(item) {
      item.isEdit = true;
    },
    //删除细则分类
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
            if (this.ruleList.length === 0) {
              this.addGroup();
            }
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
      if (!parentRuleId) {
        return this.$message({
          message: '请先保存考核分类',
          type: 'error'
        });
      } else if (ruleName === '') {
        return this.$message({
          message: '考核内容不能为空',
          type: 'error'
        });
      } else if (ruleScore === '') {
        return this.$message({
          message: '分值不能为空',
          type: 'error'
        });
      } else if (checkStandard === '') {
        return this.$message({
          message: '考核标准不能为空',
          type: 'error'
        });
      } else if (ruleScore < 0) {
        return this.$message({
          message: '分值不能小于0',
          type: 'error'
        });
      } else if (checkMethod === '') {
        return this.$message({
          message: '考核方法不能为空',
          type: 'error'
        });
      } else if (evaluateStandard === '') {
        return this.$message({
          message: '评分标准不能为空',
          type: 'error'
        });
      }
      if (ruleTags?.length) {
        if (ruleScore < ruleTags.reduce((acc, cur) => acc + cur.score, 0)) {
          return this.$message({
            message: '分值与关联关系合计分值不相符',
            type: 'error'
          });
        }
      }
      try {
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
          this.$set(row, 'original', result);
          if (ruleTags?.length) {
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
          this.$set(row, 'original', {
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
    //细则编辑取消
    cancelRule(row, item) {
      if (row.ruleId) {
        row.ruleName = row.original.ruleName;
        row.ruleScore = row.original.ruleScore;
        row.checkStandard = row.original.checkStandard;
        row.checkMethod = row.original.checkMethod;
        row.evaluateStandard = row.original.evaluateStandard;
        row.isEdit = false;
      } else {
        item.group.pop();
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

  & > span {
    padding: 0 20px;
    display: flex;

    .sub-attr {
      padding-left: 10px;
      font-size: 14px;
    }

    .sub-tip {
      padding-left: 20px;
    }

    em {
      color: #409eff;
    }

    & > div {
      margin: 0 10px;
    }
  }

  & > div {
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
