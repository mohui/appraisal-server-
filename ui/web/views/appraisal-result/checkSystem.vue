<template>
  <div>
    <div>
      <el-row
        v-loading="$asyncComputed.appraisalIndicatorsServerData.updating"
        class="appraisal-indicators-rule"
      >
        <el-col :span="24">
          <el-card
            v-if="!appraisalIndicatorsData.checkId"
            style="min-height: 300px"
          >
            <div class="second-title">
              绩效考核评价细则
            </div>
            <div
              style="color: #909399; font-size: 12px; text-align: center; line-height: 250px"
            >
              暂无考核
            </div>
          </el-card>
          <div v-else>
            <div style="width: 100%; height:40px;">
              <div class="appraisal-indicators-rule-title" style="float:left">
                {{ appraisalIndicatorsData.checkName }}
                <span style="color: #666;font-size: 14px;"
                  >{{ appraisalIndicatorsData.score | fixedDecimal }}分/{{
                    appraisalIndicatorsData.ruleScore
                  }}分</span
                >
                <el-button
                  style="margin-left: 30px;"
                  size="mini"
                  plain
                  type="primary"
                  @click="handleAppraisalResultsDownload()"
                  >考核结果下载
                </el-button>
              </div>
              <div v-if="totalData.parent" style="float: right">
                <span style="font-size: 14px">系统自动打分：</span>
                <el-switch
                  v-model="appraisalIndicatorsData.auto"
                  style="padding-right: 20px;"
                  active-text="开启"
                  inactive-text="关闭"
                  @change="handleSystemAllAutoScore"
                >
                </el-switch>
              </div>
            </div>
            <div
              v-for="(item, index) in appraisalIndicatorsData.children"
              :key="index"
            >
              <div class="check-table-title">
                <div>
                  {{ item.ruleName }}
                </div>
              </div>
              <el-table
                :data="item.children"
                show-summary
                :summary-method="handleSummaries"
                style="width: 100%"
              >
                <el-table-column
                  type="index"
                  align="center"
                  label="序号"
                ></el-table-column>
                <el-table-column
                  prop="ruleName"
                  header-align="center"
                  align="left"
                  min-width="150px"
                  label="考核内容"
                >
                </el-table-column>
                <el-table-column
                  prop="ruleScore"
                  align="center"
                  width="100px"
                  label="分值"
                >
                </el-table-column>
                <el-table-column
                  prop="checkStandard"
                  header-align="center"
                  align="left"
                  min-width="200px"
                  label="考核标准"
                >
                </el-table-column>
                <el-table-column
                  prop="checkMethod"
                  header-align="center"
                  align="left"
                  min-width="100px"
                  label="考核方法"
                >
                </el-table-column>
                <el-table-column
                  prop="evaluateStandard"
                  header-align="center"
                  align="left"
                  min-width="150px"
                  label="评分标准"
                >
                </el-table-column>
                <el-table-column
                  v-if="totalData.parent"
                  prop="isLock"
                  align="center"
                  width="160px"
                  label="系统打分"
                >
                  <template slot-scope="scope">
                    <el-switch
                      v-model="scope.row.auto"
                      active-text="开启"
                      inactive-text="关闭"
                      @change="handleChangeSystemAutoScore(scope.row)"
                    >
                    </el-switch>
                  </template>
                </el-table-column>
                <el-table-column
                  prop="score"
                  :formatter="fixedDecimal"
                  align="center"
                  width="170px"
                  label="得分"
                >
                  <template slot-scope="scope">
                    <span v-if="scope.row.isGradeScore">
                      <el-input-number
                        v-model="scope.row.score"
                        size="mini"
                        :step="1"
                        :precision="2"
                        style="width:84%"
                        :max="scope.row.ruleScore"
                      >
                      </el-input-number>
                    </span>
                    <span v-else>{{ scope.row.score | fixedDecimal }}</span>
                    <i
                      v-if="scope.row.isAttach"
                      style="padding-left:5px; color:#ff9800"
                      class="el-icon-document"
                      @click="handleDialogAppraisalFileListVisible(scope.row)"
                    ></i>
                    <el-popover
                      :popper-options="{
                        boundariesElement: 'viewport',
                        removeOnDestroy: true
                      }"
                      placement="top"
                      title="指标结果"
                      width="500"
                      trigger="hover"
                    >
                      <div>
                        <p
                          style="border-bottom: 1px solid #ccc;padding-bottom: 10px;"
                        >
                          评分标准：{{ scope.row.evaluateStandard }}
                        </p>
                        <div v-if="!scope.row.details">
                          得分尚未计算
                        </div>
                        <div v-else-if="scope.row.details.length === 0">
                          尚未绑定关联关系
                        </div>
                        <div v-else>
                          <ul>
                            <li
                              v-for="it of scope.row.details"
                              :key="it"
                              style="margin-left: -20px"
                            >
                              {{ it }}
                            </li>
                          </ul>
                        </div>
                      </div>
                      <i
                        slot="reference"
                        class="el-icon-warning"
                        style="padding-left:5px; color:#ff9800"
                      ></i>
                    </el-popover>
                  </template>
                </el-table-column>
                <el-table-column
                  v-if="totalData.parent"
                  align="center"
                  label="操作"
                  width="220px"
                >
                  <template slot-scope="scope">
                    <el-button
                      v-if="scope.row.isGradeScore"
                      plain
                      type="primary"
                      size="mini"
                      :loading="scope.row.isSaveScoreLoaing"
                      @click="openRemarkDialog(scope.row)"
                      >保存
                    </el-button>
                    <el-button
                      v-if="!scope.row.isGradeScore"
                      plain
                      type="primary"
                      size="mini"
                      @click="handleScore(scope.row)"
                      >打分
                    </el-button>
                    <el-button
                      v-if="scope.row.isGradeScore"
                      style="margin: 0"
                      plain
                      type="primary"
                      size="mini"
                      @click="cancelScore(scope.row)"
                    >
                      取消
                    </el-button>
                    <el-popover placement="left" width="600" trigger="click">
                      <el-table
                        height="200px"
                        :data="scope.row.scoreHistoryData"
                        size="mini"
                      >
                        <el-table-column
                          align="center"
                          property="score"
                          label="手动打分"
                        ></el-table-column>
                        <el-table-column
                          align="center"
                          property="remark"
                          label="备注"
                        ></el-table-column>
                        <el-table-column
                          align="center"
                          property="creator.name"
                          label="打分人"
                        ></el-table-column>
                        <el-table-column
                          align="center"
                          property="created_at"
                          label="时间"
                        ></el-table-column>
                      </el-table>
                      <el-button
                        slot="reference"
                        plain
                        type="warning"
                        size="mini"
                        @click="scoreHistory(scope.row)"
                      >
                        历史
                      </el-button>
                    </el-popover>
                  </template>
                </el-table-column>
                <el-table-column
                  v-else
                  align="center"
                  label="操作"
                  width="150px"
                >
                  <template slot-scope="scope">
                    <el-button
                      v-if="scope.row.isAttach"
                      :disabled="!scope.row.isUploadAttach"
                      plain
                      type="primary"
                      size="mini"
                      @click="handleUploadAppraisalFile(scope.row)"
                      >{{
                        scope.row.isUploadAttach
                          ? '上传考核资料'
                          : '超出上传时间'
                      }}
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
    <el-dialog
      title="上传考核资料"
      :visible.sync="dialogUploadAppraisalFileVisible"
      width="30%"
    >
      <el-form :model="curRule">
        <el-form-item label="考核内容">
          {{ curRule.ruleName }}
        </el-form-item>
        <el-form-item label="上传文件">
          <el-upload
            ref="uploadForm"
            name="attachments"
            accept=".jpg,.jpeg,.gif,.png,.doc,.docx,.xls,.xlsx,.pdf,.zip,.rar"
            :auto-upload="false"
            :file-list="fileList"
            :limit="1"
            :on-exceed="handleExceed"
            :on-success="handleUploadAppraisalFileSuccess"
            :on-error="handleUploadAppraisalFileError"
            action="/api/Score/upload.ac"
            :data="curRule.data"
          >
            <el-button slot="trigger" plain size="small" type="primary"
              >选取文件
            </el-button>
            <div slot="tip" class="el-upload__tip" style="font-size:12px;">
              可以上传图片，word文件，xls文件，pdf文件，压缩包文件，单个文件不能超过5M。
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button plain @click="dialogUploadAppraisalFileVisible = false"
          >取 消
        </el-button>
        <el-button plain type="primary" @click="handleSaveUploadFile"
          >确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="考核资料"
      :visible.sync="dialogAppraisalFileListVisible"
      width="50%"
    >
      <div>
        <p style="border-bottom: 1px solid #ccc;padding-bottom: 10px;">
          评分内容：{{ curRule.ruleName }}
        </p>
        <p style="border-bottom: 1px solid #ccc;padding-bottom: 10px;">
          评分标准：{{ curRule.evaluateStandard }}
        </p>
        <div v-if="appraisalFileListData.length > 0">
          <div
            v-for="(item, index) in appraisalFileListData"
            :key="item.id"
            style="margin-top: 10px"
          >
            <a :href="item.url" target="_blank">{{ item.name }}</a>
            <el-button
              type="danger"
              icon="el-icon-delete"
              circle
              size="mini"
              @click="delRuleAreaAttach(item.rule, item.id, index)"
            >
            </el-button>
          </div>
        </div>
        <div v-else style="color: red">暂无文件</div>
      </div>
    </el-dialog>
    <el-dialog
      title="填写打分备注"
      :visible.sync="scoreRemarkVisible"
      @closed="currentRow = {}"
    >
      <el-input v-model="scoreRemark" type="textarea" size="mini"></el-input>
      <div style="text-align: right; margin: 30px">
        <el-button size="mini" type="text" @click="scoreRemarkVisible = false"
          >取消
        </el-button>
        <el-button
          type="primary"
          size="mini"
          @click="handleSaveScore(currentRow)"
          >确定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import decimal from 'decimal.js';

export default {
  filters: {
    //过滤器，保留两位小数
    fixedDecimal: function(value) {
      if (!value) return 0;
      return value.toFixed(2);
    }
  },
  data() {
    return {
      params: {
        // id: this.$settings.user.code,
        id: '340208',
        year: this.$dayjs().year() //考核年份，默认为当前年
      },
      scoreRemarkVisible: false, //打分备注填写框框
      scoreRemark: '', //备注信息
      currentRow: {},
      dialogUploadAppraisalFileVisible: false, // 上传附件
      dialogAppraisalFileListVisible: false, // 考核资料
      curRule: {
        ruleName: '',
        ruleId: '',
        evaluateStandard: '',
        data: ''
      },
      fileList: [] //考核评价细则上传的文件列表
    };
  },
  computed: {
    //绩效考核指标的规则和评分数据
    appraisalIndicatorsData() {
      const returnValue = {...this.appraisalIndicatorsServerData};
      returnValue.children =
        returnValue.children.map(item => {
          // 得分
          item.score = item?.children.reduce(
            (result, current) => (result += current?.score ?? 0),
            0
          );
          item.ruleScore = item?.children.reduce(
            (result, current) => (result += current?.ruleScore ?? 0),
            0
          );
          item.children = item.children.map(it => {
            //判断ruleTags里面是否包含需要上传附件的关联关系
            const isAttach = it.ruleTags
              .map(tag => tag.algorithm)
              .some(tag => tag === 'attach');
            return {
              ...it,
              scoreHistoryData: [],
              isGradeScore: false,
              originalScore: it.score,
              isSaveScoreLoaing: false,
              isAttach: isAttach
            };
          });
          return item;
        }) ?? [];
      returnValue.score = returnValue.children.reduce(
        (result, current) => (result += current.score ?? 0),
        0
      );
      returnValue.ruleScore = returnValue.children.reduce(
        (result, current) => (result += current.ruleScore ?? 0),
        0
      );
      //系统自动打分
      returnValue.auto = true;
      //循环各单项指标规则里面的系统自动打分是否开启，有一项是关闭状态，则returnValue.auto = false
      for (let item of returnValue.children) {
        for (let it of item.children) {
          if (it.auto === false) {
            returnValue.auto = false;
            break;
          }
        }
      }
      return returnValue;
    },
    //总计工分和质量系数数据
    totalData() {
      return {
        ...this.totalServerData,
        fixedDecimalRate: decimal(
          Number((this.totalServerData.rate * 100).toFixed(2))
        ).toNumber()
      };
    },
    //单项考核规则的考核文件列表数据
    appraisalFileListData() {
      return this.appraisalFileListServerData;
    }
  },
  asyncComputed: {
    //获取服务器绩效考核指标的规则和评分数据
    appraisalIndicatorsServerData: {
      async get() {
        try {
          return await this.$api.SystemRule.checks(
            this.params.id,
            this.params.year
          );
        } catch (e) {
          console.log('api systemRule checks error:', e);
          return {
            checkId: null,
            checkName: null,
            status: true,
            children: []
          };
        }
      },
      default() {
        return {
          checkId: null,
          checkName: null,
          status: true,
          children: []
        };
      }
    },
    //获取服务器上该地区/机构的总计工分和质量系数
    totalServerData: {
      async get() {
        return await this.$api.SystemArea.total(
          this.params.id,
          this.params.year
        );
      },
      default() {
        return {
          id: '',
          name: '',
          score: 0,
          rate: 0,
          totalWorkPoint: 0,
          workPoint: 0,
          correctWorkPoint: 0
        };
      }
    },
    //获取服务器单项考核规则的考核文件列表数据
    appraisalFileListServerData: {
      async get() {
        return await this.$api.Score.listAttachments(
          this.curRule.ruleId,
          this.params.id
        );
      },
      shouldUpdate() {
        return this.dialogAppraisalFileListVisible;
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    //系统自动打分开关事件
    async handleSystemAllAutoScore() {
      await this.$api.CheckAreaEdit.setCheckAuto(
        this.appraisalIndicatorsData.checkId,
        this.params.id,
        this.appraisalIndicatorsData.auto
      );
      this.$asyncComputed.appraisalIndicatorsServerData.update();
    },
    //单项指标系统自动打分开关
    async handleChangeSystemAutoScore(row) {
      try {
        await this.$api.CheckAreaEdit.setRuleAuto(
          this.params.id,
          row.ruleId,
          row.auto
        );
        this.$message({
          type: 'success',
          message: '您的更改将在明日生效'
        });
      } catch (e) {
        this.$message({
          type: 'error',
          message: e.message
        });
        row.auto = !row.auto;
      }
    },
    //点击打分按钮处理
    handleScore(row) {
      this.$set(row, 'isGradeScore', true);
    },
    //打开填写备注的弹出窗
    async openRemarkDialog(row) {
      if (row.score > row.ruleScore) {
        this.$message({
          type: 'error',
          message: '打分不能超过最大分值！'
        });
        return;
      }
      this.scoreRemarkVisible = true;
      this.scoreRemark = '';
      this.currentRow = row;
    },
    //保存打分处理
    async handleSaveScore(row) {
      if (!this.scoreRemark) {
        this.$message({
          type: 'error',
          message: '请填写打分备注'
        });
        return;
      }
      try {
        this.scoreRemarkVisible = false;
        row.isSaveScoreLoaing = true;
        await this.$api.Score.manualScore(
          row.ruleId,
          this.totalData.id,
          row.score,
          this.scoreRemark
        );
        this.$message({
          type: 'success',
          message: '打分成功'
        });
        this.$set(row, 'isGradeScore', false);
        //手动打分之后将自动打分关闭
        row.auto = false;
        this.handleChangeSystemAutoScore(row);
      } catch (e) {
        this.$message({
          type: 'danger',
          message: e.message
        });
      } finally {
        //打分后重新刷新考核数据
        this.$asyncComputed.appraisalIndicatorsServerData.update();
        row.isSaveScoreLoaing = false;
      }
    },
    //取消打分
    cancelScore(row) {
      this.$set(row, 'score', row.originalScore);
      this.$set(row, 'isGradeScore', false);
    },
    //上传考核资料
    handleUploadAppraisalFile(row) {
      this.curRule.ruleName = row.ruleName;
      this.curRule.ruleId = row.ruleId;
      this.curRule.data = {
        rule: JSON.stringify(this.curRule.ruleId),
        area: JSON.stringify(this.params.id)
      };
      this.dialogUploadAppraisalFileVisible = true;
    },
    //保存上传资料到服务器
    async handleSaveUploadFile() {
      await this.$refs.uploadForm.submit();
    },
    //超出文件个数限制的处理
    handleExceed() {
      this.$message.warning('每次只允许上传一个文件，若有多个文件，请分开上次');
    },
    //文件上传成功
    handleUploadAppraisalFileSuccess(res) {
      if (res._KatoErrorCode_) {
        this.$message.error('文件上传失败');
      } else {
        this.$message.success('文件上传成功');
      }
      //手动将文件列表清空
      this.fileList = [];
      this.dialogUploadAppraisalFileVisible = false;
    },
    //文件上传失败
    handleUploadAppraisalFileError() {
      this.$message.error('文件上传失败');
      this.dialogUploadAppraisalFileVisible = false;
    },
    // 删除图片
    async delRuleAreaAttach(rule, id, index) {
      try {
        await this.$api.Score.delAttachment(rule, id);
        this.appraisalFileListData.splice(index, 1);
        this.$message({
          type: 'success',
          message: '删除成功'
        });
      } catch (e) {
        this.$message({
          type: 'error',
          message: e.message
        });
      }
    },
    // 指标结果
    handleDialogAppraisalFileListVisible(row) {
      this.curRule.ruleName = row.ruleName;
      this.curRule.ruleId = row.ruleId;
      this.curRule.evaluateStandard = row.evaluateStandard;
      this.dialogAppraisalFileListVisible = true;
    },
    // 自定义的合计计算方法
    handleSummaries(param) {
      const {columns, data} = param;
      const sums = [];
      columns.forEach((column, index) => {
        if (index === 0) {
          sums[index] = '小计';
          return;
        }
        const values = data.map(item => Number(item[column.property]));
        if (column.property === 'score' || column.property === 'ruleScore') {
          sums[index] = values.reduce(
            (result, current) => (result += current),
            0
          );
          if (column.property === 'score') {
            sums[index] = sums[index].toFixed(2);
          }
        } else {
          sums[index] = '';
        }
      });
      return sums;
    },
    //el-table-column 内容格式化保留两位小数
    fixedDecimal: function(row, column, value) {
      if (!value) return 0;
      return value.toFixed(2);
    },
    //查看手动打分的历史
    async scoreHistory(row) {
      row.scoreHistoryData = (
        await this.$api.Score.manualScoreHistory(row.ruleId, this.params.id)
      ).map(it => ({
        ...it,
        creatorName: it.creator.name,
        created_at: it.created_at.$format(),
        updated_at: it.updated_at.$format()
      }));
    },
    //考核结果下载
    async handleAppraisalResultsDownload() {
      try {
        await this.$api.SystemArea.downloadCheck(
          this.params.id,
          this.params.year
        );
        this.$message.success('后台任务已进行, 请关注右上角任务进度~');
      } catch (e) {
        this.$message.error(e.message);
      }
    }
  }
};
</script>

<style scoped lang="scss">
@import '../../styles/vars';

.appraisal-indicators-rule {
  padding-top: 20px;

  .appraisal-indicators-rule-title {
    color: $color-primary;
    font-size: 20px;
    margin-top: 0;
    margin-bottom: 20px;
  }

  .check-table-title {
    background: #ccc;
    width: 100%;
    line-height: 40px;
    padding-left: 20px;
    float: left;
    box-sizing: border-box;
  }
}
</style>
