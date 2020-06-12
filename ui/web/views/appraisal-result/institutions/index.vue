<template>
  <div>
    <!--顶部表头-->
    <el-card class="box-card" shadow="never">
      <div class="header-title" style="float: left">
        {{ totalData.name }}两卡制管理
      </div>
      <div class="kpiSum-select">
        <span style="margin-left:20px; font-size: 17px">纬度：</span>
        <el-button-group style="">
          <el-button
            :class="{'el-button--primary': params.listFlag === 'quality'}"
            @click="latTypeChanged('quality')"
          >
            质量系数
          </el-button>
          <el-button
            type="default"
            :class="{'el-button--primary': params.listFlag === 'score'}"
            @click="latTypeChanged('score')"
          >
            工分值
          </el-button>
        </el-button-group>
        <el-button
          plain
          style="float:right; margin: 0 30px;"
          type="primary"
          @click="handleBack"
          v-if="showBackButton()"
          >返回
        </el-button>
      </div>
    </el-card>
    <el-row :gutter="20" style="margin: 20px -10px">
      <el-col :span="8">
        <el-card
          shadow="hover"
          v-loading="$asyncComputed.totalServerData.updating"
        >
          <div class="score-detail" v-if="params.listFlag === 'score'">
            <p style="font-size:22px; margin:0; text-align:left;">
              工分值
            </p>
            <p style="color: #6C7177; font-size:16px; margin:10px 0;">校正后</p>
            <h3 style="font-size: 30px; margin:0; display:inline-block">
              {{ totalData.score }}
            </h3>
            <span>分</span>
            <p style="margin:10px 0;">{{ date }}</p>
            <p style="font-size:13px;">{{ totalData.name }}</p>
            <table
              v-if="params.isInstitution"
              style="width: 100%;margin-top: 20px;color: #666;"
            >
              <tr>
                <td style="width: 33%;text-align: center">
                  <p>{{ totalData.originalScore }}分</p>
                  <p>校正前</p>
                </td>
                <td
                  style="width: 33%;text-align: center;vertical-align: middle;"
                >
                  X
                </td>
                <td style="text-align: center">
                  <p>{{ totalData.fixedDecimalRate }}%</p>
                  <p>质量系数</p>
                </td>
              </tr>
            </table>

            <div style="padding-top: 40px;" v-else>
              <p>校正前 {{ totalData.originalScore }}分</p>
            </div>
          </div>
          <div class=" score-detail" v-if="params.listFlag === 'quality'">
            <two-card-circle
              :coefficient="totalData.fixedDecimalRate"
              :pointDate="date"
              :subtitle="totalData.name"
              :text="totalData.name"
            ></two-card-circle>
            <span
              style="bottom: 20px;position: absolute;left: 50%;margin-left: -90px;"
            >
              (计算时校正系数：{{ totalData.fixedDecimalRate }}%)
            </span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16" v-if="params.listFlag === 'quality'">
        <el-card shadow="hover">
          <div class="score-detail">
            历史趋势（待实现）
          </div>
        </el-card>
      </el-col>
      <div v-else>
        <el-col :span="10">
          <el-card
            shadow="hover"
            v-loading="
              $asyncComputed.doctorWorkpointRankServerData.updating ||
                $asyncComputed.workpointRankServerData.updating
            "
          >
            <div class="score-detail">
              <two-card-bar
                :barxAxisData="workpointBarData.xAxisData"
                :baryAxisData="workpointBarData.yAxisData"
              ></two-card-bar>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="score-detail">
              人脸采集信息（待实现）
            </div>
          </el-card>
        </el-col>
      </div>
    </el-row>
    <!--机构排行-->
    <div v-if="!params.isInstitution">
      <el-card
        v-loading="$asyncComputed.workpointRankServerData.updating"
        shadow="hover"
        :style="{height: totalShowMore ? 'auto' : 300 + 'px'}"
      >
        <h3 class="ins-ranking-title">
          机构排行（含一级机构及下属二级机构）
        </h3>
        <div v-for="(item, index) of workpointRankData" :key="item.code">
          <!--质量系数机构排行-->
          <accordion
            v-if="params.listFlag === 'quality'"
            :Accordionindex="0"
            :AccordionData="`${index + 1}、${item.name}`"
          >
            <div
              slot="Sizes"
              style="float: right; width: 80px; text-align: right;"
            >
              {{ item.child.length }}家
            </div>
            <div slot="Progress" style="padding: 10px 20px 0;">
              <el-progress
                :text-inside="true"
                :stroke-width="18"
                :percentage="Math.round(item.rate * 100)"
              >
              </el-progress>
            </div>
            <div slot="First" style="padding: 0 20px">
              <ul>
                <li
                  class="pointer"
                  v-for="(i, index) of item.child"
                  :key="index"
                  @click="handleClickInstitution(i.id)"
                >
                  {{ i.name }} {{ Math.round(i.rate * 100) }}%
                </li>
              </ul>
            </div>
          </accordion>
          <!--工分值机构排行-->
          <accordion
            v-if="params.listFlag === 'score'"
            :Accordionindex="0"
            :AccordionData="`${index + 1}、${item.name}`"
          >
            <div
              slot="Sizes"
              style="float: right; width: 80px; text-align: right;"
            >
              {{ item.child.length }}家
            </div>
            <div slot="Progress" style="padding: 10px 20px 0;">
              <progress-score
                :label="item.score"
                :height="18"
                :percentage="
                  item.score != 0
                    ? Math.round((item.score / maxScore) * 100)
                    : 0
                "
                style="padding:0 20px;"
              >
              </progress-score>
            </div>
            <div slot="First" style="padding: 0 20px">
              <ul>
                <li
                  class="pointer"
                  style="margin: 8px 0; font-size: 14px"
                  v-for="(i, index) of item.child"
                  :key="index"
                  @click="handleClickInstitution(i.id)"
                >
                  {{ i.name }} {{ i.score }}分
                </li>
              </ul>
            </div>
          </accordion>
        </div>
      </el-card>
      <!--机构排行底部【收起】/【显示更多】按钮-->
      <div
        v-show="workpointRankData.length > 3"
        class="show-more"
        @click="totalShowMore = !totalShowMore"
      >
        {{ totalShowMore ? '收起' : '显示更多' }}
      </div>
      <!--一、二级机构排行-->
      <el-row
        :gutter="20"
        style="margin-top: 20px"
        v-loading="$asyncComputed.workpointRankServerData.updating"
      >
        <!--一级机构排行-->
        <el-col :span="12">
          <el-card shadow="hover">
            <h3 class="ins-ranking-title">一级机构排行</h3>
            <div
              v-for="(item, index) of firstLevelWorkpointRankData"
              :key="item.id"
            >
              <!--一级机构质量系数排行-->
              <div
                v-if="params.listFlag === 'quality'"
                class="pointer"
                @click="handleClickInstitution(item.id)"
              >
                <p>
                  {{ index + 1 }}、{{ item.name }}
                  <span style="float:right"
                    >{{ Math.round(item.rate * 100) }}% 考核办法</span
                  >
                </p>
                <el-progress
                  :text-inside="true"
                  :stroke-width="18"
                  :percentage="Math.round(item.rate * 100)"
                >
                </el-progress>
              </div>
              <!--一级机构工分值排行-->
              <div
                class="pointer"
                v-else-if="params.listFlag === 'score'"
                @click="handleClickInstitution(item.id)"
              >
                <p>{{ index + 1 }}、{{ item.name }}</p>
                <progress-score
                  :label="item.score"
                  :height="18"
                  :percentage="
                    item.score != 0
                      ? Math.round((item.score / maxScore) * 100)
                      : 0
                  "
                  style="padding:0 20px;"
                >
                </progress-score>
              </div>
            </div>
          </el-card>
        </el-col>
        <!--二级机构排行-->
        <el-col :span="12">
          <el-card shadow="hover">
            <h3 class="ins-ranking-title">二级机构排行</h3>
            <div
              v-for="(item, index) of secondLevelWorkpointRankData"
              :key="item.id"
            >
              <!--二级机构质量系数排行-->
              <div
                v-if="params.listFlag === 'quality'"
                class="pointer"
                @click="handleClickInstitution(item.id)"
              >
                <p>
                  {{ index + 1 }}、{{ item.name }}
                  <span style="float:right"
                    >{{ Math.round(item.rate * 100) }}% 考核办法</span
                  >
                </p>
                <el-progress
                  :text-inside="true"
                  :stroke-width="18"
                  :percentage="Math.round(item.rate * 100)"
                >
                </el-progress>
              </div>
              <!--二级机构工分值排行-->
              <div
                class="pointer"
                v-else-if="params.listFlag === 'score'"
                @click="handleClickInstitution(item.id)"
              >
                <p>{{ index + 1 }}、{{ item.name }}</p>
                <progress-score
                  :label="item.score"
                  :height="18"
                  :percentage="
                    item.score != 0
                      ? Math.round((item.score / maxScore) * 100)
                      : 0
                  "
                  style="padding:0 20px;"
                >
                </progress-score>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    <!--考核指标规则-->
    <el-row
      v-loading="$asyncComputed.appraisalIndicatorsServerData.updating"
      class="appraisal-indicators-rule"
      v-if="params.isInstitution && params.listFlag === 'quality'"
    >
      <el-col :span="24">
        <div>
          <div style="width: 100%; height:40px;">
            <div class="appraisal-indicators-rule-title" style="float:left">
              {{ appraisalIndicatorsData.checkName }}
              <span style="color: #666;font-size: 14px;"
                >{{ appraisalIndicatorsData.score | fixedDecimal }}分/{{
                  appraisalIndicatorsData.ruleScore
                }}分</span
              >
            </div>
          </div>
          <div
            v-for="(item, index) in appraisalIndicatorsData.children"
            :key="index"
          >
            <div class="check-table-title">
              <span>{{ item.ruleName }}</span>
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
              <el-table-column prop="ruleName" align="center" label="考核内容">
              </el-table-column>
              <el-table-column
                prop="ruleScore"
                align="center"
                width="80px"
                label="分值"
              >
              </el-table-column>
              <el-table-column
                prop="checkStandard"
                align="center"
                width="284px"
                label="考核标准"
              >
              </el-table-column>
              <el-table-column
                prop="checkMethod"
                align="center"
                label="考核方法"
              >
              </el-table-column>
              <el-table-column
                prop="evaluateStandard"
                align="center"
                label="评分标准"
              >
              </el-table-column>
              <el-table-column
                prop="score"
                :formatter="fixedDecimal"
                align="center"
                width="180px"
                label="得分"
              >
                <template slot-scope="scope">
                  <span v-if="scope.row.isGradeScore">
                    <el-input-number
                      v-model="scope.row.score"
                      size="mini"
                      :min="0"
                      :step="1"
                      :precision="2"
                      style="width:84%"
                      :max="scope.row.ruleScore"
                    >
                    </el-input-number>
                  </span>
                  <span v-else>{{ scope.row.score | fixedDecimal }}</span>
                </template>
              </el-table-column>
              <el-table-column
                prop="isLock"
                align="center"
                width="150px"
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
                v-if="$settings.user.isRegion"
                align="center"
                label="操作"
                width="184px"
              >
                <template slot-scope="scope">
                  <el-button
                    v-if="scope.row.isGradeScore"
                    plain
                    type="primary"
                    size="small"
                    @click="handleSaveScore(scope.row)"
                    :loading="scope.row.isSaveScoreLoaing"
                    >保存
                  </el-button>
                  <el-button
                    v-if="!scope.row.isGradeScore"
                    plain
                    type="primary"
                    size="small"
                    @click="handleScore(scope.row)"
                    >打分
                  </el-button>
                  <el-button
                    v-if="scope.row.isGradeScore"
                    plain
                    type="primary"
                    size="small"
                    @click="cancelScore(scope.row)"
                    >取消
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column v-else align="center" label="操作" width="184px">
                <template slot-scope="scope">
                  <el-button
                    v-if="scope.row.isAttach"
                    plain
                    type="primary"
                    size="small"
                    @click="handleUploadAppraisalFile(scope.row)"
                    >上传考核资料
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row
      v-loading="$asyncComputed.doctorWorkpointRankServerData.updating"
      v-if="params.isInstitution && params.listFlag === 'score'"
      :gutter="20"
      style="margin-top: 20px"
    >
      <el-col :span="12">
        <el-card shadow="hover">
          <p style="color:#1096d0; font-size:20px; font-weight:500;">
            医生工分
          </p>
          <el-table
            :data="doctorWorkpointRankData"
            :header-cell-style="{background: '#e4e2df', color: '#333'}"
          >
            <el-table-column type="expand" prop="children">
              <template slot-scope="scope">
                <el-table :data="scope.row.children" :show-header="false">
                  <el-table-column type="index" align="center">
                  </el-table-column>
                  <el-table-column prop="name" align="center"></el-table-column>
                  <el-table-column
                    prop="score"
                    align="center"
                  ></el-table-column>
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="序号" align="center">
              <template slot-scope="scope">
                <span>【{{ scope.$index + 1 }}】</span>
              </template>
            </el-table-column>
            <el-table-column label="医生" align="center">
              <template slot-scope="scope">
                <span>{{ scope.row.doctorname }}</span>
              </template>
            </el-table-column>
            <el-table-column align="center" label="工分值">
              <template slot-scope="scope">
                <span>{{ scope.row.score }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <p style="color:#1096d0; font-size:20px; font-weight:500;">
            工分项目
          </p>
          <el-table
            :data="categoryWorkpointRankData"
            :header-cell-style="{background: '#e4e2df', color: '#333'}"
            ref="refTable"
          >
            <el-table-column type="expand" prop="children">
              <template slot-scope="scope">
                <el-table :data="scope.row.children" :show-header="false">
                  <el-table-column type="index" align="center">
                  </el-table-column>
                  <el-table-column
                    prop="doctorname"
                    align="center"
                  ></el-table-column>
                  <el-table-column
                    prop="score"
                    align="center"
                  ></el-table-column>
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="序号" align="center">
              <template slot-scope="scope">
                <span>【{{ scope.$index + 1 }}】</span>
              </template>
            </el-table-column>
            <el-table-column label="工分目录" align="center">
              <template slot-scope="scope">
                <span>{{ scope.row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column align="center" label="工分值">
              <template slot-scope="scope">
                <span>{{ scope.row.score }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
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
            name="attachments"
            accept=".jpg,.jpeg,.gif,.png,.doc,.docx,.xls,.xlsx,.pdf,.zip,.rar"
            ref="uploadForm"
            :auto-upload="false"
            :limit="1"
            :on-exceed="handleExceed"
            action="/api/Score/upload.ac"
            :data="curRule.data"
          >
            <el-button plain slot="trigger" size="small" type="primary"
              >选取文件</el-button
            >
            <div slot="tip" class="el-upload__tip" style="font-size:12px;">
              可以上传图片，word文件，xls文件，pdf文件，压缩包文件，单个文件不能超过5M。
            </div>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button plain @click="dialogUploadAppraisalFileVisible = false"
          >取 消</el-button
        >
        <el-button plain type="primary" @click="handleSaveUploadFile"
          >确 定</el-button
        >
      </div>
    </el-dialog>
  </div>
</template>
<script>
import twoCardBar from '../components/twocardBar';
import twoCardCircle from '../components/twocardCircle';
import accordion from '../components/twocardAccordion';
import progressScore from '../components/progressScore';
import decimal from 'decimal.js';

export default {
  name: 'index',
  components: {
    twoCardBar,
    twoCardCircle,
    accordion,
    progressScore
  },
  beforeRouteUpdate(to, from, next) {
    this.initParams(to);
    next();
  },
  created() {
    this.initParams(this.$route);
  },
  data() {
    return {
      params: {
        listFlag: 'score', // quality(质量系数) | score（工分值）
        isInstitution: false, // 是否机构
        id: this.$settings.user.code
      },
      date: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).$format(
        'YYYY-MM-DD'
      ),
      totalShowMore: false,
      dialogUploadAppraisalFileVisible: false,
      curRule: {
        ruleName: '',
        ruleId: '',
        data: ''
      }
    };
  },
  filters: {
    //过滤器，保留两位小数
    fixedDecimal: function(value) {
      if (!value) return 0;
      return value.toFixed(2);
    }
  },
  methods: {
    //系统自动打分开关
    async handleChangeSystemAutoScore(row) {
      console.log(row);
      try {
        await this.$api.Hospital.setRuleAuto(
          this.params.id,
          row.ruleId,
          row.auto
        );
        this.$message({
          type: 'success',
          message: '更改成功'
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
    //保存打分处理
    async handleSaveScore(row) {
      if (row.score > row.ruleScore) {
        this.$message({
          type: 'error',
          message: '打分不能超过最大分值！'
        });
        return;
      }
      if (row.score < 0) {
        this.$message({
          type: 'error',
          message: '打分不能低于0分！'
        });
        return;
      }
      try {
        row.isSaveScoreLoaing = true;
        await this.$api.Score.score(row.ruleId, this.totalData.id, row.score);
        this.$message({
          type: 'success',
          message: '打分成功'
        });
        this.$set(row, 'isGradeScore', false);
      } catch (e) {
        this.$message({
          type: 'danger',
          message: e.message
        });
      } finally {
        row.isSaveScoreLoaing = false;
      }
    },
    //取消打分
    cancelScore(row) {
      this.$set(row, 'originalScore', row.originalScore);
      this.$set(row, 'isGradeScore', false);
    },
    //上传考核资料
    handleUploadAppraisalFile(row) {
      this.curRule.ruleName = row.ruleName;
      this.curRule.ruleId = row.ruleId;
      this.curRule.data = {
        ruleId: JSON.stringify(this.curRule.ruleId),
        hospitalId: JSON.stringify(this.params.id)
      };
      this.dialogUploadAppraisalFileVisible = true;
    },
    //保存上传资料到服务器
    async handleSaveUploadFile() {
      await this.$refs.uploadForm.submit();
      this.dialogUploadAppraisalFileVisible = false;
    },
    //超出文件个数限制的处理
    handleExceed() {
      this.$message.warning('每次只允许上传一个文件，若有多个文件，请分开上次');
    },
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
    initParams(route) {
      this.params.listFlag = route.query.listFlag ?? 'score';
      this.params.isInstitution = route.query.isInstitution
        ? JSON.parse(route.query.isInstitution)
        : !this.$settings.user.isRegion;
      this.params.id = route.query.id ?? this.$settings.user.code;
    },
    //纬度切换
    latTypeChanged(type) {
      if (type !== this.params.listFlag) {
        this.params.listFlag = type;
        this.$router.push({
          query: {
            ...this.params
          }
        });
      }
    },
    handleClickInstitution(id) {
      this.params.isInstitution = true;
      this.params.id = id;
      if (this.params.listFlag === 'score') {
        this.$router.push({
          query: {
            ...this.params
          }
        });
      } else if (this.params.listFlag === 'quality') {
        this.$router.push({
          query: {
            ...this.params
          }
        });
      }
    },
    //是否显示返回按钮
    showBackButton() {
      if (this.$route.query.isInstitution) {
        if (JSON.parse(this.$route.query.isInstitution)) {
          return this.$settings.user.isRegion;
        }
      }
      return false;
    },
    //返回
    handleBack() {
      //这里不需要设置this.params.isInstitution=false，
      //因为执行initParams方法时
      //会将route.query.isInstitution赋值给this.params.isInstitution
      //this.params.isInstitution = false;
      this.$router.go(-1);
    }
  },
  computed: {
    //工分值数据，用于柱状图显示
    workpointBarData() {
      let value = {xAxisData: [], yAxisData: []};
      let array = [];
      if (this.params.isInstitution) {
        //机构，取医生的前三名
        array = this.doctorWorkpointRankData.slice(0, 3);
        value.xAxisData = array.map(it => it.doctorname);
        value.yAxisData = array.map(it => it.score);
        return value;
      } else {
        //地区，取一级机构的前三名
        array = this.firstLevelWorkpointRankData.slice(0, 3);
        value.xAxisData = array.map(it => it.name);
        value.yAxisData = array.map(it => it.score);
      }
      return value;
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
    //机构排行数据
    workpointRankData() {
      const result = this.workpointRankServerData
        //过滤，只取一级机构（name中含'中心'）的值
        .filter(item => item.name.endsWith('中心'))
        //添加child
        .map(item => {
          const returnValue = Object.assign({}, item, {
            child: [
              item,
              ...this.workpointRankServerData.filter(
                it => it.parent === item.id
              )
            ]
          });
          //累加分数
          returnValue.score = returnValue.child.reduce(
            (result, current) => (result += current.score),
            0
          );
          //累加质量系数
          returnValue.rate = returnValue.child.reduce(
            (result, current) => (result += current.rate),
            0
          );
          returnValue.rate = returnValue.rate / returnValue.child.length;
          return returnValue;
        })
        .sort((a, b) => b.score - a.score);
      return result;
    },
    //一级机构排行数据
    firstLevelWorkpointRankData() {
      return this.workpointRankData
        .map(item => item.child)
        .reduce((result, current) => result.concat(current), [])
        .filter(item => item.name.endsWith('中心'))
        .sort((a, b) => b.score - a.score);
    },
    //二级机构排行数据
    secondLevelWorkpointRankData() {
      return this.workpointRankServerData
        .filter(item => !item.name.endsWith('中心'))
        .sort((a, b) => b.score - a.score);
    },
    //最大得分值数
    maxScore() {
      return Math.max(...this.workpointRankData.map(it => it.score));
    },
    //医生工分排行数据
    doctorWorkpointRankData() {
      let returnValue = this.doctorWorkpointRankServerData
        .reduce((result, current) => {
          // let item = result.find(it => it.doctorid === current.doctorid);
          let item;
          for (const it of result) {
            if (it.doctorid === current.doctorid) {
              item = it;
              break;
            }
          }
          if (item) {
            // 医生已存在
            item.score += current.score;
            item.children.push(current);
          } else {
            // 不存在
            item = {
              doctorid: current.doctorid,
              doctorname: current.doctorname,
              score: current.score,
              children: [current]
            };
            result.push(item);
          }
          return result;
        }, [])
        .sort((a, b) => b.score - a.score)
        .map(item => {
          item.children.sort((a, b) => b.score - a.score);
          return item;
        });
      return returnValue;
    },
    //工分项目数据
    categoryWorkpointRankData() {
      return this.doctorWorkpointRankServerData
        .reduce((result, current) => {
          let item = result.find(it => it.name === current.name);
          if (item) {
            //类别已存在
            item.score += current.score;
            item.children.push(current);
          } else {
            //类别不存在
            item = {
              name: current.name,
              score: current.score,
              children: [current]
            };
            result.push(item);
          }
          return result;
        }, [])
        .sort((a, b) => b.score - a.score)
        .map(item => {
          item.children.sort((a, b) => b.score - a.score);
          return item;
        });
    },
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
      return returnValue;
    }
  },
  asyncComputed: {
    //获取服务器上该地区/机构的总计工分和系数
    totalServerData: {
      async get() {
        return await this.$api.Score.total(this.params.id);
      },
      default() {
        return {
          id: '',
          name: '',
          originalScore: 0,
          score: 0,
          rate: 0
        };
      }
    },
    //获取服务器的机构排行数据
    workpointRankServerData: {
      async get() {
        return await this.$api.Score.rank(this.params.id);
      },
      shouldUpdate() {
        return !this.params.isInstitution;
      },
      default() {
        return [];
      }
    },
    //获取服务器的医生工分和工分项目数据
    doctorWorkpointRankServerData: {
      async get() {
        return await this.$api.Hospital.workpoints(this.params.id);
      },
      shouldUpdate() {
        return this.params.listFlag === 'score' && this.params.isInstitution;
      },
      default() {
        return [];
      }
    },
    //获取服务器绩效考核指标的规则和评分数据
    appraisalIndicatorsServerData: {
      async get() {
        return await this.$api.Hospital.checks(this.params.id);
      },
      shouldUpdate() {
        return this.params.listFlag === 'quality' && this.params.isInstitution;
      },
      default() {
        return {
          checkId: null,
          checkName: null,
          status: true,
          children: []
        };
      }
    }
  }
};
</script>

<style scoped lang="scss">
.header-title {
  font: bold 20px/2 Arial;
  color: #0090dc;
}

.kpiSum-select {
  width: 100%;
  height: 35px;
  line-height: 40px;
}

.box-card {
  width: auto;
}

.score-detail {
  position: relative;
  height: 300px;
  text-align: center;
  box-sizing: border-box;
  color: #1096d0;
}

.pointer {
  cursor: pointer;
}

.ins-ranking-title {
  margin: 0;
  color: #1096d0;
  font-size: 20px;
}

.show-more {
  width: 100%;
  line-height: 30px;
  text-align: center;
  padding: 10px 0;
  background-color: #f5f5f5;
  border: 1px solid #f5f5f5;
  border-top: none;
  border-color: rgba(162, 162, 162, 0.1);
  color: #6c7177;
  font-size: 14px;
  cursor: pointer;
}

.appraisal-indicators-rule {
  padding-top: 20px;

  .appraisal-indicators-rule-title {
    color: #1a95d7;
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
