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
        <div class="header-title" style="float: left">
          {{ totalData.name }}基本公共卫生服务两卡制绩效考核
          <span
            v-if="params.isInstitution && totalData.budget"
            style="color: #606266;"
            >({{ totalData.budget }}元)</span
          >
        </div>
        <div class="kpiSum-select">
          <el-button-group style="margin-left:20px">
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
          <el-button
            v-if="reportListData.length === 1"
            size="small"
            type="primary"
            style="margin-left: 30px"
            @click="handleDownloadReport(reportListData[0].url)"
          >
            报告下载
          </el-button>
          <el-dropdown
            v-else-if="reportListData.length > 1"
            style="margin-left: 30px"
            @command="handleDownloadReport"
          >
            <el-button type="primary" size="small">
              报告下载<i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item
                v-for="it of reportListData"
                :key="it.id"
                :command="it.url"
              >
                {{ it.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <el-button
            v-if="showBackButton()"
            size="small"
            style="float:right; margin: 4px 0 10px 30px"
            type="primary"
            @click="handleBack"
            >返回
          </el-button>
        </div>
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
                <p style="margin:10px 0;">{{ date }}</p>
                <p style="font-size:13px;">{{ totalData.name }}</p>
                <div
                  :style="{
                    'padding-top': params.isInstitution ? '10px' : '40px'
                  }"
                >
                  <div v-if="params.isInstitution">
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
                  :point-date="date"
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
                v-loading="$asyncComputed.workpointRankServerData.updating"
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
                v-loading="$asyncComputed.workpointRankServerData.updating"
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
                v-loading="$asyncComputed.totalServerData.updating"
                shadow="hover"
              >
                <div class="score-detail">
                  <div class="second-title" style="text-align: left;">
                    工分值校正明细
                  </div>
                  <el-table :data="scoreList" size="mini" height="100%">
                    <el-table-column
                      prop="projectName"
                      label="工分项"
                      :min-width="computedColWidth('projectName')"
                    >
                    </el-table-column>
                    <el-table-column
                      prop="workpoint"
                      label="工分"
                      :min-width="computedColWidth('workpoint')"
                    >
                    </el-table-column>
                    <el-table-column
                      prop="ruleName"
                      label="考核项"
                      :min-width="computedColWidth('ruleName')"
                    >
                    </el-table-column>
                    <el-table-column
                      prop="rate"
                      label="质量系数"
                      min-width="80"
                    >
                    </el-table-column>
                    <el-table-column
                      prop="correctWorkpoint"
                      label="得分"
                      :min-width="computedColWidth('correctWorkpoint')"
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
              <div class="score-detail">
                <p class="second-title" style="margin:0; text-align:left;">
                  监督协管
                </p>
                <el-tabs>
                  <el-tab-pane label="报告">
                    <el-table
                      v-loading="
                        $asyncComputed.supervisionReportServerData.updating
                      "
                      :data="supervisionReportData"
                      height="280px"
                      style="width: 100%"
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
                  </el-tab-pane>
                  <el-tab-pane label="巡查">
                    <el-table
                      v-loading="
                        $asyncComputed.supervisionAssistServerData.updating
                      "
                      :data="supervisionAssistData"
                      height="280px"
                      style="width: 100%"
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
                  </el-tab-pane>
                </el-tabs>
              </div>
            </el-card>
          </el-col>
          <el-col :span="10" :xs="24" :sm="12" :md="10" :lg="10" :xl="10">
            <el-card shadow="hover">
              <div class="score-detail">
                <p class="second-title" style="margin:0; text-align:left;">
                  健康教育
                </p>
                <el-tabs
                  v-if="healthEducationTagsName.length !== 0"
                  v-model="healthEducationTagSelected"
                >
                  <el-tab-pane
                    v-for="tag in healthEducationTagsName"
                    :key="tag"
                    :label="tag"
                    :name="tag"
                  >
                    <el-table
                      v-loading="
                        $asyncComputed.healthEducationServerData.updating
                      "
                      :data="healthEducationData"
                      height="280px"
                      style="width: 100%"
                      size="mini"
                    >
                      <el-table-column
                        prop="ActivityTime"
                        header-align="center"
                        align="center"
                        min-width="20px"
                        label="活动时间"
                      >
                      </el-table-column>
                      <el-table-column
                        prop="ActivityName"
                        header-align="center"
                        align="center"
                        min-width="40px"
                        label="活动名称"
                      >
                      </el-table-column>
                    </el-table>
                  </el-tab-pane>
                </el-tabs>
                <div v-else class="el-table__empty-text empty-data">
                  暂无数据
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <!--考核指标规则-->
        <el-row
          v-if="params.isInstitution && params.listFlag === 'quality'"
          v-loading="$asyncComputed.appraisalIndicatorsServerData.updating"
          class="appraisal-indicators-rule"
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
                  <el-button
                    style="margin-left: 30px;"
                    size="mini"
                    plain
                    type="primary"
                    @click="handleAppraisalResultsDownload()"
                    >考核结果下载
                  </el-button>
                </div>
                <div v-if="$settings.user.isRegion" style="float: right">
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
                    v-if="$settings.user.isRegion"
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
                        v-if="!scope.row.isAttach"
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
                        <i
                          slot="reference"
                          class="el-icon-warning"
                          style="padding-left:5px; color:#ff9800"
                        ></i>
                      </el-popover>
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
                        size="mini"
                        :loading="scope.row.isSaveScoreLoaing"
                        @click="handleSaveScore(scope.row)"
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
                          plain
                          slot="reference"
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
      <!--下级排行-->
      <div>
        <!--下级质量系数排行-->
        <el-row v-if="params.listFlag === 'quality'">
          <el-col :span="24">
            <el-card
              v-loading="$asyncComputed.subordinateAreaRankServerData.updating"
              shadow="hover"
            >
              <h3 class="area-ranking-title">下级地区排行</h3>
              <div
                v-for="(item, index) of subordinateAreaRankData"
                :key="item.id"
              >
                <div
                  class="pointer"
                  @click="handleClickSubordinateArea(item.id)"
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
        <!--下级工分排行-->
        <el-row
          v-if="params.listFlag === 'score'"
          v-loading="$asyncComputed.doctorWorkpointRankServerData.updating"
          :gutter="20"
          style="margin-top: 20px"
        >
          <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
            <el-card shadow="hover">
              <p style="color:#1096d0; font-size:20px; font-weight:500;">
                下级工分
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
                      <el-table-column
                        prop="name"
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
          <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
            <el-card shadow="hover">
              <p style="color:#1096d0; font-size:20px; font-weight:500;">
                工分项目
              </p>
              <el-table
                ref="refTable"
                :data="categoryWorkpointRankData"
                :header-cell-style="{background: '#e4e2df', color: '#333'}"
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
      </div>
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
        isInstitution: false, // 是否机构
        id: this.$settings.user.code,
        checkId: '', //TODO:这个字段新接口不需要，对接完后要去掉
        year: null //考核年份，默认为空，表示当前年
      },
      date: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).$format(
        'YYYY-MM-DD'
      ),
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
      healthEducationTagSelected: '',
      scoreRemarkVisible: false, //打分备注填写框框
      scoreRemark: '', //备注信息
      currentRow: {}
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
    healthEducationTagsName() {
      return Array.from(
        new Set(
          this.healthEducationServerData?.map(it => it.ActivityFormName) ?? []
        )
      );
    },
    //健康教育
    healthEducationData() {
      return this.healthEducationServerData
        .filter(e => e.ActivityFormName === this.healthEducationTagSelected)
        .map(it => ({
          ...it,
          ActivityTime: it.ActivityTime.$format('YYYY-MM-DD')
        }));
    },
    //监督协管报告
    supervisionReportData() {
      return this.supervisionReportServerData.map(it => ({
        ...it,
        Time: it.Date.$format('YYYY-MM-DD')
      }));
    },
    //监督协管巡查
    supervisionAssistData() {
      return this.supervisionAssistServerData.map(it => ({
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
    scoreList() {
      return this.hospitalProject?.map(it =>
        Object.assign({}, it, {
          rate: (it.rate * 100).toFixed(2) + '%',
          workpoint: it.workpoint ?? 0,
          correctWorkpoint: Number.parseInt(it.correctWorkpoint)
        })
      );
    },
    //金额：矩形树状图
    budgetData() {
      let arr = this.workpointRankServerData
        .filter(it => it.budget)
        .map(it => ({
          name: it.name,
          id: it.id,
          budget: it.budget.toFixed(2)
        }))
        .map(it => ({
          name: `${it.name} 金额：${it.budget}元`,
          value: it.budget,
          onClick: () =>
            this.$router.push({
              name: 'appraisal-result-institutions',
              query: {
                id: it.id,
                listFlag: 'score',
                isInstitution: 'true'
              }
            })
        }));
      return arr;
    },
    //工分：矩形树状图
    mapData() {
      let arr = this.workpointRankServerData
        .filter(it => it.score)
        .map(it => ({
          name: `${it.name} 工分值：${Math.round(it.score)}分`,
          value: it.score,
          onClick: () =>
            this.$router.push({
              name: 'appraisal-result-institutions',
              query: {
                id: it.id,
                listFlag: 'score',
                isInstitution: 'true'
              }
            })
        }));
      return arr;
    },
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
        //过滤，只取一级机构（name以"服务中心"和"卫生院"结尾）的值
        .filter(
          item => item.name.endsWith('服务中心') || item.name.endsWith('卫生院')
        )
        //添加child
        .map(item => {
          //对下属二级机构进行排序
          let child = this.workpointRankServerData.filter(
            it => it.parent === item.id
          );
          if (this.params.listFlag === 'score') {
            child = child.sort((a, b) => b.score - a.score);
          } else {
            child = child.sort((a, b) => b.rate - a.rate);
          }
          //添加一级机构和排序后的二级机构的值
          const returnValue = Object.assign({}, item, {
            child: [item, ...child]
          });
          //累加分数
          returnValue.score = returnValue.child.reduce(
            (result, current) => (result += current.score),
            0
          );
          //格式化取整后的分数，用于页面显示
          returnValue.scoreFormat = Math.round(returnValue.score);
          //累加质量系数
          returnValue.rate = returnValue.child.reduce(
            (result, current) => (result += current.rate),
            0
          );
          returnValue.rate = returnValue.rate / returnValue.child.length;
          return returnValue;
        });
      if (this.params.listFlag === 'score') {
        return result.sort((a, b) => b.score - a.score);
      } else {
        return result.sort((a, b) => b.rate - a.rate);
      }
    },
    //一级机构排行数据
    firstLevelWorkpointRankData() {
      const result = this.workpointRankData
        .map(item => item.child)
        .reduce((result, current) => result.concat(current), [])
        .filter(
          item => item.name.endsWith('服务中心') || item.name.endsWith('卫生院')
        );
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
    },
    //二级机构排行数据
    secondLevelWorkpointRankData() {
      const result = this.workpointRankServerData
        .filter(
          item =>
            !item.name.endsWith('服务中心') && !item.name.endsWith('卫生院')
        )
        .sort((a, b) => b.score - a.score);
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
    subordinateAreaRankData() {
      const result = this.subordinateAreaRankServerData.map(item => item);
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
    },
    //最大得分值数
    subordinateAreaMaxScore() {
      return Math.max(...this.subordinateAreaRankData.map(it => it.score));
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
    healthEducationTagsName(val) {
      this.healthEducationTagSelected = val[0];
    }
  },
  created() {
    this.initParams(this.$route);
  },
  methods: {
    computedColWidth(field) {
      if (this.scoreList?.length > 0) {
        return this.$widthCompute(this.scoreList.map(item => item[field]));
      }
    },
    //系统自动打分开关事件
    async handleSystemAllAutoScore() {
      await this.$api.Hospital.setCheckAuto(
        this.appraisalIndicatorsData.checkId,
        this.params.id,
        this.appraisalIndicatorsData.auto
      );
      this.$asyncComputed.appraisalIndicatorsServerData.update();
    },
    //单项指标系统自动打分开关
    async handleChangeSystemAutoScore(row) {
      try {
        await this.$api.Hospital.setRuleAuto(
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
        await this.$api.ScoreHospitalCheckRules.score(
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
      this.params.isInstitution = route.query.isInstitution
        ? JSON.parse(route.query.isInstitution)
        : !this.$settings.user.isRegion;
      this.params.id = route.query.id ?? this.$settings.user.code;
      this.params.checkId = route.query.checkId ?? undefined;
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
    //进入下级地区
    handleClickSubordinateArea(id) {
      //TODO: 跳转到下级地区
      console.log('跳转到下级地区id:', id);
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
    },
    //考核结果下载
    async handleAppraisalResultsDownload() {
      await this.$api.Hospital.checkDownload(this.params.id);
    },
    //报告下载
    handleDownloadReport(url) {
      FileSaver.saveAs(url);
    },
    //查看手动打分的历史
    async scoreHistory(row) {
      row.scoreHistoryData = (
        await this.$api.ScoreHospitalCheckRules.scoreHistory(
          row.ruleId,
          this.params.id
        )
      ).map(it => ({
        ...it,
        creatorName: it.creator.name,
        created_at: it.created_at.$format(),
        updated_at: it.updated_at.$format()
      }));
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
          this.params.year
        );
      },
      default() {
        return [];
      }
    },
    //监督协管报告
    supervisionReportServerData: {
      async get() {
        return await this.$api.SystemArea.supervisionReport(
          this.params.id,
          this.params.year
        );
      },
      default() {
        return [];
      }
    },
    //监督协管巡查
    supervisionAssistServerData: {
      async get() {
        return await this.$api.SystemArea.supervisionAssist(
          this.params.id,
          this.params.year
        );
      },
      default() {
        return [];
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
          detail: [],
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
        return await this.$api.ScoreHospitalCheckRules.rank(
          this.params.id,
          this.params.checkId
        );
      },
      default() {
        return [];
      }
    },
    //获取服务器的医生工分和工分项目数据
    doctorWorkpointRankServerData: {
      async get() {
        try {
          return await this.$api.Hospital.workpoints(this.params.id);
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
        return await this.$api.Hospital.checks(
          this.params.id,
          this.params.checkId
        );
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
        return await this.$api.ScoreHospitalCheckRules.detail(
          this.params.id,
          this.curRule.ruleId
        );
      },
      shouldUpdate() {
        return this.appraisalResultInstructionsPopoverVisible;
      },
      default() {
        return [];
      }
    },
    //获取机构的各项工分详情
    hospitalProject: {
      async get() {
        try {
          return await this.$api.ScoreHospitalCheckRules.projectDetail(
            this.params.id,
            this.params.checkId
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
    },
    //下级地区排行
    subordinateAreaRankServerData: {
      async get() {
        return await this.$api.ScoreHospitalCheckRules.areaRank(
          '3402',
          this.params.checkId
        );
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
}

.header-title {
  font: bold 20px/2 Arial;
  color: $color-primary;
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
