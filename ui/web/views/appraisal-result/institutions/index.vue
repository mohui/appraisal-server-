<template>
  <div class="wrapper">
    <div>
      <!--顶部表头-->
      <el-card
        v-sticky
        v-loading="
          $asyncComputed.reportListSeverData.updating ||
            $asyncComputed.totalServerData.updating
        "
        class="box-card"
        shadow="never"
      >
        <span class="header-title">
          {{ totalData.name }}基本公共卫生服务两卡制绩效考核
          <span v-if="totalData.budget" style="color: #606266;"
            >({{ totalData.budget }}元)
          </span>
        </span>
        <!--年度选择-->
        <span style="margin: 0 10px">
          <el-select
            size="small"
            v-model="params.year"
            placeholder="请选择考核年度"
            @change="handleYearChange(params.year)"
          >
            <el-option
              v-for="item in yearList"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
            </el-option>
          </el-select>
        </span>
        <span style="margin:  0 10px">
          <el-button-group>
            <el-button
              size="small"
              :class="{'el-button--primary': params.listFlag === 'quality'}"
              @click="latTypeChanged('quality')"
            >
              质量系数
            </el-button>
            <el-button
              size="small"
              :class="{'el-button--primary': params.listFlag === 'score'}"
              @click="latTypeChanged('score')"
            >
              工分值
            </el-button>
          </el-button-group>
        </span>
        <el-button
          v-if="showBackButton()"
          size="small"
          style="float:right; margin: 4px 0 10px 30px"
          type="primary"
          @click="handleBack"
          >返回上级
        </el-button>
      </el-card>
      <!--自身考核结果-->
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="8" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
            <el-card
              v-loading="$asyncComputed.totalServerData.updating"
              shadow="hover"
            >
              <div v-if="params.listFlag === 'score'" class="score-detail">
                <div class="second-title" style="text-align:left">
                  工分值
                </div>
                <p style="color: #6C7177; font-size:16px; margin:10px 0;">
                  校正后
                </p>
                <h3 style="font-size: 30px; margin:0; display:inline-block">
                  {{ totalData.correctWorkPoint | fixedDecimal }}
                </h3>
                <span>分</span>
                <p style="font-size:13px;">{{ totalData.name }}</p>
                <div style="padding-top: 40px">
                  <div>
                    <p>校正前总工分： {{ totalData.totalWorkPoint }}分</p>
                  </div>
                  <div>
                    <p>参与校正工分： {{ totalData.workPoint }}分</p>
                  </div>
                </div>
              </div>
              <div v-if="params.listFlag === 'quality'" class=" score-detail">
                <two-card-circle
                  :coefficient="totalData.fixedDecimalRate"
                ></two-card-circle>
                <span style="position: absolute; bottom: 20px; left: 31%;">
                  (计算时校正系数：{{ totalData.fixedDecimalRate }}%)
                </span>
              </div>
            </el-card>
          </el-col>
          <div v-if="params.listFlag === 'quality'">
            <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
              <el-card
                v-loading="$asyncComputed.faceCollectSeverData.updating"
                shadow="hover"
              >
                <div class="score-detail">
                  <p class="second-title" style="margin:0; text-align:left;">
                    人脸采集信息
                  </p>
                  <twoCardPie
                    :pie-data="faceCollectData"
                    :color="['#409EFF', '#96c9ff']"
                  ></twoCardPie>
                </div>
              </el-card>
            </el-col>
            <el-col :span="10" :xs="24" :sm="12" :md="10" :lg="10" :xl="10">
              <el-card
                v-loading="
                  $asyncComputed.historicalTrendLineChartSeverData.updating
                "
                shadow="hover"
              >
                <div class="score-detail">
                  <line-chart
                    :x-axis-data="historicalTrendLineChartData.xAxisData"
                    :y-axis-data="historicalTrendLineChartData.yAxisData"
                    line-text="%"
                    :list-flag="params.listFlag"
                  ></line-chart>
                </div>
              </el-card>
            </el-col>
          </div>
          <div v-else>
            <!--下级金额分配-->
            <el-col :span="10" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
              <el-card
                v-loading="$asyncComputed.rankServerData.updating"
                shadow="hover"
              >
                <div class="score-detail">
                  <two-card-tree-map
                    :map-data="budgetData"
                    :color="color"
                    empty-text="尚未配置金额"
                  ></two-card-tree-map>
                </div>
              </el-card>
            </el-col>
            <!--下级工分值图-->
            <el-col :span="6" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
              <el-card
                v-loading="$asyncComputed.rankServerData.updating"
                shadow="hover"
              >
                <div class="score-detail">
                  <two-card-tree-map :map-data="mapData"></two-card-tree-map>
                </div>
              </el-card>
            </el-col>
            <!--工分值校正明细-->
            <el-col :span="24">
              <el-card
                v-loading="$asyncComputed.projectDetailServerData.updating"
                shadow="hover"
                style="margin-top: 20px"
              >
                <div class="score-detail">
                  <div class="second-title" style="text-align: left;">
                    工分值校正明细
                  </div>
                  <el-table :data="projectDetailData" height="99%">
                    <el-table-column
                      prop="projectName"
                      label="工分项"
                      align="center"
                      :min-width="computedColWidth('projectName')"
                    >
                    </el-table-column>
                    <el-table-column
                      prop="workPointFormat"
                      label="工分"
                      align="center"
                      :min-width="computedColWidth('workPointFormat')"
                    >
                    </el-table-column>
                    <el-table-column
                      prop="ruleName"
                      label="考核项"
                      align="center"
                      :min-width="computedColWidth('ruleName')"
                    >
                    </el-table-column>
                    <el-table-column
                      prop="rateFormat"
                      label="质量系数"
                      align="center"
                      min-width="80"
                    >
                    </el-table-column>
                    <el-table-column
                      prop="correctWorkPointFormat"
                      label="得分"
                      align="center"
                      :min-width="computedColWidth('correctWorkPointFormat')"
                    >
                    </el-table-column>
                  </el-table>
                </div>
              </el-card>
            </el-col>
          </div>
        </el-row>
        <el-row
          v-if="params.listFlag === 'quality'"
          :gutter="20"
          style="margin: 20px -10px"
        >
          <el-col :span="8" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
            <el-card shadow="hover">
              <div class="score-detail">
                <p class="second-title" style="margin:0; text-align:left;">
                  家庭医生签约
                </p>
                <div
                  v-loading="
                    $asyncComputed.familyDoctorContractServerData.updating
                  "
                  style="height: 100%"
                >
                  <doctor-bar
                    style="padding-top: 20px;"
                    :bar-data="familyDoctorContractData"
                  ></doctor-bar>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-card shadow="hover">
              <div style="height: 300px; text-align: center">
                <p class="second-title" style="margin:0; text-align:left;">
                  健康教育
                </p>
                <el-tabs v-model="healthEducationType">
                  <el-tab-pane
                    v-for="tag in healthEducationTags"
                    :key="tag.type"
                    :label="tag.name"
                    :name="tag.type"
                  >
                    <el-table
                      v-loading="
                        $asyncComputed.healthEducationServerData.updating
                      "
                      :data="healthEducationData"
                      height="210px"
                      class="appraisal-result-health-education-table"
                      style="width: 100%"
                      size="mini"
                    >
                      <el-table-column
                        prop="time"
                        header-align="center"
                        align="center"
                        min-width="20px"
                        label="活动时间"
                      >
                      </el-table-column>
                      <el-table-column
                        prop="name"
                        header-align="center"
                        align="center"
                        min-width="40px"
                        label="活动名称"
                      >
                      </el-table-column>
                    </el-table>
                  </el-tab-pane>
                  <div style="margin-top: 3px">
                    <el-pagination
                      small
                      background
                      :page-size="healthEducationPageSize"
                      :current-page="healthEducationPageNo"
                      layout="total, prev, pager, next"
                      :total="healthEducationServerData.rows"
                      @current-change="
                        no => {
                          healthEducationPageNo = no;
                        }
                      "
                    ></el-pagination>
                  </div>
                </el-tabs>
              </div>
            </el-card>
          </el-col>
          <el-col :span="10" :xs="24" :sm="12" :md="10" :lg="10" :xl="10">
            <el-card shadow="hover">
              <div style="height: 300px; text-align: center">
                <p class="second-title" style="margin:0; text-align:left;">
                  监督协管
                </p>
                <el-tabs>
                  <el-tab-pane
                    style="display: flex;flex-direction: column"
                    label="报告"
                  >
                    <el-table
                      v-loading="
                        $asyncComputed.supervisionReportServerData.updating
                      "
                      :data="supervisionReportData"
                      height="210px"
                      style="width: 100%;flex:1"
                      size="mini"
                    >
                      <el-table-column
                        prop="Contents"
                        header-align="center"
                        align="center"
                        min-width="20px"
                        label="报告内容"
                      ></el-table-column>
                      <el-table-column
                        prop="Time"
                        header-align="center"
                        align="center"
                        min-width="20px"
                        label="报告时间"
                      ></el-table-column>
                    </el-table>
                    <div style="margin-top: 3px">
                      <el-pagination
                        small
                        background
                        :page-size="supervisionReportPageSize"
                        :current-page="supervisionReportPageNo"
                        layout="total, prev, pager, next"
                        :total="supervisionReportServerData.rows"
                        @current-change="
                          no => {
                            supervisionReportPageNo = no;
                          }
                        "
                      ></el-pagination>
                    </div>
                  </el-tab-pane>
                  <el-tab-pane
                    style="display: flex;flex-direction: column"
                    label="巡查"
                  >
                    <el-table
                      v-loading="
                        $asyncComputed.supervisionAssistServerData.updating
                      "
                      :data="supervisionAssistData"
                      height="210px"
                      style="width: 100%; flex:1"
                      size="mini"
                    >
                      <el-table-column
                        prop="Address"
                        header-align="center"
                        align="center"
                        min-width="20px"
                        label="巡查地点"
                      ></el-table-column>
                      <el-table-column
                        prop="Time"
                        header-align="center"
                        align="center"
                        min-width="20px"
                        label="巡查时间"
                      ></el-table-column>
                    </el-table>
                    <div style="margin-top: 3px">
                      <el-pagination
                        small
                        background
                        :page-size="supervisionAssistPageSize"
                        :current-page="supervisionAssistPageNo"
                        layout="total, prev, pager, next"
                        :total="supervisionAssistServerData.rows"
                        @current-change="
                          no => {
                            supervisionAssistPageNo = no;
                          }
                        "
                      ></el-pagination>
                    </div>
                  </el-tab-pane>
                </el-tabs>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>
      <!--下级排行-->
      <div style="margin-top: 20px">
        <!--下级质量系数排行-->
        <el-row
          v-if="params.listFlag === 'quality' && this.rankData.length > 0"
        >
          <el-col :span="24">
            <el-card
              v-loading="$asyncComputed.rankServerData.updating"
              shadow="hover"
            >
              <div class="second-title">下级地区排行</div>
              <div v-for="(item, index) of rankData" :key="item.code">
                <div
                  class="pointer"
                  @click="handleClickSubordinateArea(item.code)"
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
              </div>
            </el-card>
          </el-col>
        </el-row>
        <!--下级工分排行 / 工分项目-->
        <el-row
          v-if="params.listFlag === 'score'"
          :gutter="20"
          style="margin-top: 20px"
        >
          <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
            <el-card
              v-loading="$asyncComputed.workpointRankServerData.updating"
              shadow="hover"
            >
              <div class="second-title">下级工分</div>
              <el-table
                :data="workpointRankData"
                height="600"
                @row-click="handleCellClick"
                :cell-class-name="cellClassHover"
              >
                <el-table-column label="序号" align="center">
                  <template slot-scope="scope">
                    <span>【{{ scope.$index + 1 }}】</span>
                  </template>
                </el-table-column>
                <el-table-column label="名称" align="center" prop="name">
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
          <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
            <el-card
              shadow="hover"
              v-loading="$asyncComputed.workPointsProjectServerData.updating"
            >
              <div class="second-title">工分项目</div>
              <el-table
                ref="refTable"
                :data="workPointsProjectData"
                height="600"
              >
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
      </div>
      <!--考核指标规则-->
      <el-row
        v-if="params.listFlag === 'quality'"
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
                  <span style="color: #606266">({{ item.budget }}元)</span>
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
                      :ref="scope.row.ruleId"
                      :popper-options="{
                        boundariesElement: 'viewport',
                        removeOnDestroy: true
                      }"
                      placement="top"
                      title="指标结果"
                      width="500"
                      trigger="hover"
                      @show="
                        handleAppraisalResultInstructionsPopoverVisible(
                          scope.row
                        )
                      "
                    >
                      <div
                        v-loading="
                          $asyncComputed.appraisalResultInstructionsServerData
                            .updating
                        "
                      >
                        <p
                          style="border-bottom: 1px solid #ccc;padding-bottom: 10px;"
                        >
                          评分标准：{{ curRule.evaluateStandard }}
                        </p>
                        <div v-if="!appraisalResultInstructionsData">
                          得分尚未计算
                        </div>
                        <div
                          v-else-if="
                            appraisalResultInstructionsData.length === 0
                          "
                        >
                          尚未绑定关联关系
                        </div>
                        <div v-else>
                          <ul>
                            <li
                              v-for="it of appraisalResultInstructionsData"
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
          <div v-for="item of appraisalFileListData" :key="item.id">
            <a :href="item.url" target="_blank">{{ item.name }}</a>
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
import twoCardPie from '../components/twocardPie';
import doctorBar from '../components/doctorBar';
import twoCardTreeMap from '../components/twocardTreemap';
import twoCardCircle from '../components/twocardCircle';
import lineChart from '../components/twocardLine';
import decimal from 'decimal.js';
import VueSticky from 'vue-sticky';
import FileSaver from 'file-saver';

export default {
  name: 'Index',
  components: {
    twoCardPie,
    doctorBar,
    twoCardTreeMap,
    twoCardCircle,
    lineChart
  },
  beforeRouteUpdate(to, from, next) {
    this.initParams(to);
    //路由更新时还原pageNo
    this.supervisionReportPageNo = 1;
    this.supervisionAssistPageNo = 1;
    this.healthEducationPageNo = 1;
    next();
  },
  directives: {
    sticky: VueSticky
  },
  filters: {
    //过滤器，保留两位小数
    fixedDecimal: function(value) {
      if (!value) return 0;
      return value.toFixed(2);
    }
  },
  data() {
    return {
      color: [
        '#37a2da',
        '#32c5e9',
        '#9fe6b8',
        '#ffdb5c',
        '#ff9f7f',
        '#fb7293',
        '#e7bcf3',
        '#8378ea',
        '#ff7f50',
        '#87cefa',
        '#da70d6',
        '#32cd32',
        '#6495ed',
        '#ff69b4',
        '#ba55d3',
        '#cd5c5c',
        '#ffa500',
        '#40e0d0',
        '#1e90ff',
        '#ff6347',
        '#7b68ee',
        '#d0648a',
        '#ffd700',
        '#6b8e23',
        '#4ea397',
        '#3cb371',
        '#b8860b',
        '#7bd9a5'
      ],
      params: {
        listFlag: 'quality', // quality(质量系数) | score（工分值）
        id: this.$settings.user.code,
        year: this.$dayjs()
          .year()
          .toString() //考核年份，默认为当前年
      },
      yearList: [
        {value: '2020', label: '2020年度'},
        {value: '2021', label: '2021年度'}
      ],
      totalShowMore: false,
      dialogUploadAppraisalFileVisible: false,
      curRule: {
        ruleName: '',
        ruleId: '',
        evaluateStandard: '',
        data: ''
      },
      dialogAppraisalFileListVisible: false,
      appraisalResultInstructionsPopoverVisible: false, //单项指标考核结果说明
      healthEducationType: '1',
      scoreRemarkVisible: false, //打分备注填写框框
      scoreRemark: '', //备注信息
      currentRow: {},
      //监督协管报告
      supervisionReportPageSize: 20, // 每页数量
      supervisionReportPageNo: 1, // 当前第几页
      //监督协管巡查
      supervisionAssistPageSize: 20, // 每页数量
      supervisionAssistPageNo: 1, // 当前第几页
      //健康教育
      healthEducationTags: [
        {type: '1', name: '发放印刷资料'},
        {type: '2', name: '播放音像资料'},
        {type: '3', name: '健康教育宣传栏'},
        {type: '4', name: '健康知识讲座'},
        {type: '5', name: '公众健康咨询'},
        {type: '6', name: '个体化健康教育'}
      ],
      healthEducationPageSize: 20, // 每页数量
      healthEducationPageNo: 1 // 当前第几页
    };
  },
  computed: {
    //家庭医生签约
    familyDoctorContractData() {
      let arr = [
        {
          name: '签约人数',
          label: 'signedNumber',
          value: ''
        },
        {
          name: '履约人数',
          label: 'exeNumber',
          value: ''
        },
        {
          name: '续约人数',
          label: 'renewNumber',
          value: ''
        }
      ];
      return arr.map(it => ({
        ...it,
        value: this.familyDoctorContractServerData[it.label]
      }));
    },
    //健康教育
    healthEducationData() {
      return this.healthEducationServerData.data.map(it => ({
        ...it,
        time: it.time.$format('YYYY-MM-DD')
      }));
    },
    //监督协管报告
    supervisionReportData() {
      return this.supervisionReportServerData.data.map(it => ({
        ...it,
        Time: it.Date.$format('YYYY-MM-DD')
      }));
    },
    //监督协管巡查
    supervisionAssistData() {
      return this.supervisionAssistServerData.data.map(it => ({
        ...it,
        Time: it.Date.$format('YYYY-MM-DD')
      }));
    },
    //人脸采集信息
    faceCollectData() {
      let arr = [
        {
          value: this.faceCollectSeverData.face,
          name: '人脸采集数'
        },
        {
          value:
            this.faceCollectSeverData.total - this.faceCollectSeverData.face,
          name: '人脸未采集数'
        }
      ];
      return arr;
    },
    //历史趋势数据，折线图展示
    historicalTrendLineChartData() {
      const data = this.historicalTrendLineChartSeverData;
      let result = {};
      result.xAxisData = data.map(it => {
        return it.date;
      });
      result.yAxisData = data.map(it => {
        return Number((it.rate * 100).toFixed(2));
      });
      return result;
    },
    //工分值校正明细
    projectDetailData() {
      return this.projectDetailServerData?.map(it => ({
        ...it,
        rateFormat: (it.rate * 100).toFixed(2) + '%',
        workPointFormat: it.workPoint.toFixed(2),
        correctWorkPointFormat: it.correctWorkPoint.toFixed(2)
      }));
    },
    //金额：矩形树状图
    budgetData() {
      let arr = this.rankServerData
        .filter(it => it.budget)
        .map(it => ({
          name: it.name,
          id: it.code,
          budget: it.budget.toFixed(2)
        }))
        .map(it => ({
          name: `${it.name} 金额：${it.budget}元`,
          value: it.budget,
          onClick: () =>
            this.$router.push({
              name: 'appraisal-result-institutions',
              query: {
                ...this.params,
                id: it.code
              }
            })
        }));
      return arr;
    },
    //工分：矩形树状图
    mapData() {
      let arr = this.rankServerData
        .filter(it => it.correctWorkPoint)
        .map(it => ({
          name: `${it.name} 工分值：${Math.round(it.correctWorkPoint)}分`,
          value: it.correctWorkPoint,
          onClick: () =>
            this.$router.push({
              name: 'appraisal-result-institutions',
              query: {
                ...this.params,
                id: it.code
              }
            })
        }));
      return arr;
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
    //下级工分排行
    workpointRankData() {
      return this.workpointRankServerData
        .map(it => it)
        .sort((a, b) => b.score - a.score);
    },
    //工分项目数据
    workPointsProjectData() {
      return this.workPointsProjectServerData;
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
    //单项考核规则的考核文件列表数据
    appraisalFileListData() {
      return this.appraisalFileListServerData;
    },
    //单项考核得分解读数据
    appraisalResultInstructionsData() {
      return this.appraisalResultInstructionsServerData;
    },
    //报告下载列表数据
    reportListData() {
      return this.reportListSeverData;
    },
    //下级地区排行数据
    rankData() {
      const result = this.rankServerData.map(item => item);
      if (this.params.listFlag === 'score') {
        return result
          .sort((a, b) => b.score - a.score)
          .map(it => {
            //格式化取整后的分数，用于页面显示
            it.scoreFormat = Math.round(it.score);
            return it;
          });
      } else {
        return result.sort((a, b) => b.rate - a.rate);
      }
    }
  },
  watch: {
    //指标得分解读详情数据
    appraisalResultInstructionsData() {
      if (this.$refs[this.curRule.ruleId]) {
        //数据返回后更新popper，重新修正定位
        this.$nextTick(() => {
          this.$refs[this.curRule.ruleId][0].updatePopper();
        });
      }
    },
    healthEducationType() {
      //切换type时将no还原为1
      this.healthEducationPageNo = 1;
    }
  },
  created() {
    this.initParams(this.$route);
  },
  methods: {
    computedColWidth(field) {
      if (this.projectDetailData?.length > 0) {
        return this.$widthCompute(
          this.projectDetailData.map(item => item[field])
        );
      }
    },
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
        ruleId: JSON.stringify(this.curRule.ruleId),
        hospitalId: JSON.stringify(this.params.id)
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
    handleUploadAppraisalFileSuccess() {
      this.$message.success('文件上传成功');
      this.dialogUploadAppraisalFileVisible = false;
    },
    //文件上传失败
    handleUploadAppraisalFileError() {
      this.$message.error('文件上传失败');
      this.dialogUploadAppraisalFileVisible = false;
    },
    handleDialogAppraisalFileListVisible(row) {
      this.curRule.ruleName = row.ruleName;
      this.curRule.ruleId = row.ruleId;
      this.curRule.evaluateStandard = row.evaluateStandard;
      this.dialogAppraisalFileListVisible = true;
    },
    //单项指标考核得分解读
    handleAppraisalResultInstructionsPopoverVisible(row) {
      //如果查看的和前一条不同，则先清空前一条的数据
      if (
        this.appraisalResultInstructionsServerData &&
        this.curRule.ruleId !== row.ruleId
      ) {
        this.appraisalResultInstructionsServerData = [];
      }
      this.appraisalResultInstructionsPopoverVisible = true;
      this.curRule.ruleName = row.ruleName;
      this.curRule.ruleId = row.ruleId;
      this.curRule.evaluateStandard = row.evaluateStandard;
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
      this.params.listFlag = route.query.listFlag ?? 'quality';
      this.params.year =
        route.query.year ??
        this.$dayjs()
          .year()
          .toString();
      this.params.id = route.query.id ?? this.$settings.user.code;
    },
    //纬度切换
    latTypeChanged(type) {
      if (type !== this.params.listFlag) {
        this.params.listFlag = type;
        this.$router.replace({
          query: {
            ...this.params
          }
        });
      }
    },
    //年度选择
    handleYearChange(value) {
      console.log(value);
      this.params.year = value;
      this.$router.replace({
        query: {
          ...this.params
        }
      });
    },
    //进入下级地区
    handleClickSubordinateArea(id) {
      this.params.id = id;
      this.$router.push({
        query: {
          ...this.params
        }
      });
    },
    //是否显示返回按钮
    showBackButton() {
      return this.totalData.parent;
    },
    //返回上级
    handleBack() {
      this.params.id = this.totalData.parent;
      this.$router.push({
        query: {
          ...this.params
        }
      });
    },
    //考核结果下载
    async handleAppraisalResultsDownload() {
      try {
        await this.$api.Report.downloadCheckBackJob(
          this.params.id,
          this.params.checkId
        );
        this.$message.success('后台任务已进行, 请关注右上角任务进度~');
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    //报告下载
    handleDownloadReport(url) {
      FileSaver.saveAs(url);
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
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'appraisal-result-subordinate-name';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name') {
        this.handleClickSubordinateArea(row.code);
      }
    }
  },
  asyncComputed: {
    // 家庭医生签约
    familyDoctorContractServerData: {
      async get() {
        return await this.$api.SystemArea.signRegister(
          this.params.id,
          this.params.year
        );
      },
      default() {
        return {};
      }
    },
    //健康教育数据
    healthEducationServerData: {
      async get() {
        return await this.$api.SystemArea.healthEducation(
          this.params.id,
          this.params.year,
          this.healthEducationType,
          this.healthEducationPageNo,
          this.healthEducationPageSize
        );
      },
      default() {
        return {data: [], pages: 0, rows: 0};
      }
    },
    //监督协管报告
    supervisionReportServerData: {
      async get() {
        return await this.$api.SystemArea.supervisionReport(
          this.params.id,
          this.params.year,
          this.supervisionReportPageNo,
          this.supervisionReportPageSize
        );
      },
      default() {
        return {data: [], pages: 0, rows: 0};
      }
    },
    //监督协管巡查
    supervisionAssistServerData: {
      async get() {
        return await this.$api.SystemArea.supervisionAssist(
          this.params.id,
          this.params.year,
          this.supervisionAssistPageNo,
          this.supervisionAssistPageSize
        );
      },
      default() {
        return {data: [], pages: 0, rows: 0};
      }
    },
    //人脸采集数据
    faceCollectSeverData: {
      async get() {
        return await this.$api.SystemArea.faceCollect(
          this.params.id,
          this.params.year
        );
      },
      default() {
        return {
          face: null,
          rate: null
        };
      },
      shouldUpdate() {
        return this.params.listFlag === 'quality';
      }
    },
    //历史趋势数据
    historicalTrendLineChartSeverData: {
      async get() {
        return await this.$api.SystemArea.history(
          this.params.id,
          this.params.year
        );
      },
      default() {
        return [];
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
    //获取服务器的下级排行数据
    rankServerData: {
      async get() {
        return await this.$api.SystemArea.rank(
          this.params.id,
          this.params.year
        );
      },
      default() {
        return [];
      }
    },
    //下级工分数据
    workpointRankServerData: {
      async get() {
        try {
          return await this.$api.SystemArea.workPointsArea(
            this.params.id,
            this.params.year
          );
        } catch (e) {
          return [];
        }
      },
      shouldUpdate() {
        return this.params.listFlag === 'score';
      },
      default() {
        return [];
      }
    },
    //获取服务器工分项目数据
    workPointsProjectServerData: {
      async get() {
        try {
          return await this.$api.SystemArea.workPointsProject(
            this.params.id,
            this.params.year
          );
        } catch (e) {
          return [];
        }
      },
      shouldUpdate() {
        return this.params.listFlag === 'score';
      },
      default() {
        return [];
      }
    },
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
      shouldUpdate() {
        return this.params.listFlag === 'quality';
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
    //获取服务器单项考核规则的考核文件列表数据
    appraisalFileListServerData: {
      async get() {
        return await this.$api.ScoreHospitalCheckRules.listAttachments(
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
    },
    //获取服务器单项考核得分解读数据
    appraisalResultInstructionsServerData: {
      async get() {
        try {
          return await this.$api.Score.detail(
            this.params.id,
            this.curRule.ruleId
          );
        } catch (e) {
          return [e?.message ?? e];
        }
      },
      shouldUpdate() {
        return this.appraisalResultInstructionsPopoverVisible;
      },
      default() {
        return [];
      }
    },
    //获取工分值校正明细数据
    projectDetailServerData: {
      async get() {
        try {
          return await this.$api.SystemArea.projectDetail(
            this.params.id,
            this.params.year
          );
        } catch (e) {
          return [];
        }
      },
      default() {
        return [];
      }
    },
    //报告下载列表服务器数据
    reportListSeverData: {
      async get() {
        return await this.$api.Report.list(this.params.id);
      },
      default() {
        return [];
      }
    }
  }
};
</script>

<style scoped lang="scss">
@import '../../../styles/vars';

.wrapper {
  height: 100%;
  position: relative;

  & > div {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }

  .empty-data {
    font-size: 12px;
    position: relative;
    margin: 0 auto;
    top: 50%;
    transform: translateY(-50%);
  }
}

.second-title {
  font-size: 18px;
  font-weight: bold;
  color: $color-primary;
}

.header-title {
  font: bold 20px/2 Arial;
  color: $color-primary;
  margin-right: 10px;
}

.box-card {
  width: auto;
}

.score-detail {
  position: relative;
  height: 300px;
  text-align: center;
  box-sizing: border-box;
  color: $color-primary;
}

.family-doctor {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px 0 0 15px;

  span {
    color: #606266;
    line-height: 28px;
  }
}

.pointer {
  cursor: pointer;
}

.ins-ranking-title {
  margin: 0;
  color: $color-primary;
  font-size: 18px;
  font-weight: bold;
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

.el-dropdown-link {
  cursor: pointer;
  color: #409eff;
}
</style>

<style lang="scss">
.appraisal-result-subordinate-name {
  cursor: pointer;

  :hover {
    color: #1a95d7;
  }
}

.appraisal-result-health-education-table {
  display: flex;
  flex-direction: column;

  .el-table__body-wrapper {
    flex: 1;
  }
}
</style>
