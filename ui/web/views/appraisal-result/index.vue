<template>
  <div class="wrapper">
    <div v-hidden-scroll>
      <!--顶部表头-->
      <div
        v-if="params.listFlag === 'quality'"
        v-sticky
        v-loading="
          $asyncComputed.reportListSeverData.updating ||
            $asyncComputed.totalServerData.updating
        "
        class="header-box-card"
      >
        <div class="header-title">
          {{ totalData.name }}
        </div>
        <div style="display: flex; align-items: center">
          <!--年度选择-->
          <el-select
            v-if="!$settings.isMobile"
            v-model="params.year"
            size="mini"
            placeholder="请选择考核年度"
            @change="handleYearChange(params.year)"
            style="margin: 0 10px"
          >
            <el-option
              v-for="item in yearList"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
            </el-option>
          </el-select>
          <select
            v-if="$settings.isMobile"
            v-model="params.year"
            style="height: 32px; line-height: 32px; border: 1px solid #dcdfe6; border-radius: 4px; color: #606266; padding: 0 15px;"
            @change="handleYearChange(params.year)"
          >
            <option
              v-for="item in yearList"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
          <div v-if="!$settings.isMobile" style="margin:0 10px">
            <el-button
              plain
              size="mini"
              type="primary"
              @click="
                handleFileDownload(
                  'https://knrt-doctor-app.oss-cn-shanghai.aliyuncs.com/appraisal/2021-1%E6%8C%87%E5%8D%97%E5%85%B1%E8%AF%86.pdf'
                )
              "
              >考核共识下载</el-button
            >
          </div>
          <div v-if="!$settings.isMobile">
            <el-button
              size="mini"
              type="primary"
              @click="handleAppraisalResultsDownload()"
              >考核结果下载
            </el-button>
            <el-button
              v-if="reportListData.length === 1"
              plain
              size="small"
              type="primary"
              style="margin:0 10px"
              @click="handleFileDownload(reportListData[0].url)"
              >公卫报告下载</el-button
            >
            <el-dropdown
              v-if="reportListData.length > 1"
              split-button
              size="small"
              type="primary"
              style="margin:0 10px"
              @command="handleFileDownload"
            >
              公卫报告下载
              <el-dropdown-menu slot="dropdown">
                <el-dropdown-item
                  v-for="it in reportListData"
                  :key="it.id"
                  :command="it.url"
                >
                  {{ it.name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </el-dropdown>
          </div>
          <el-button
            v-if="showBackButton()"
            style="margin-left: 20px"
            size="small"
            type="primary"
            @click="handleBack"
            >返回上级
          </el-button>
        </div>
      </div>
      <div v-if="params.listFlag === 'score'" v-sticky>
        <div class="header-box-card" style="align-items: center">
          <span class="header-title"> {{ totalData.name }}工分校正详情 </span>
          <el-button
            size="mini"
            type="primary"
            @click="latTypeChanged('quality')"
            >关闭
          </el-button>
        </div>
      </div>
      <!--自身考核结果-->
      <div>
        <el-row :gutter="10" style="margin: 10px -5px">
          <div v-if="params.listFlag === 'quality'">
            <el-col :span="8" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
              <el-card
                v-loading="$asyncComputed.totalServerData.updating"
                shadow="hover"
              >
                <div class="score-detail">
                  <el-tooltip
                    effect="dark"
                    content="点击查看考核结果详情"
                    placement="top"
                  >
                    <two-card-circle
                      :coefficient="totalData.fixedDecimalRate"
                      text="计算时校正系数"
                      :on-click="handleCheckDetailClick"
                    ></two-card-circle>
                  </el-tooltip>
                </div>
              </el-card>
            </el-col>
            <el-col :span="8" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
              <el-card
                v-loading="$asyncComputed.totalServerData.updating"
                shadow="hover"
              >
                <el-tooltip
                  class="item"
                  effect="dark"
                  content="点击查看工分校正详情"
                  placement="top"
                >
                  <div
                    class="score-detail"
                    style="cursor: pointer"
                    @click="latTypeChanged('score')"
                  >
                    <div class="second-title" style="text-align:left">
                      工分值
                    </div>
                    <div style="margin:20px 0 10px 0;">
                      校正后
                    </div>
                    <div
                      style="color: #40415a; font-size: 28px; margin:10px; display:inline-block; font-weight: bold"
                    >
                      {{ totalData.correctWorkPoint | fixedDecimal }}分
                    </div>
                    <div style="margin: 10px">
                      {{ totalData.name }}
                    </div>
                    <div
                      style="margin: 40px 0 10px 0; display: flex; flex-direction: row; justify-content: center; align-items: center; font-size: 12px;"
                    >
                      <div>校正前总工分： {{ totalData.totalWorkPoint }}分</div>
                      <div
                        style="padding: 0 20px; font-size: 16px"
                        class="el-icon-close"
                      ></div>
                      <div>参与校正工分： {{ totalData.workPoint }}分</div>
                    </div>
                  </div>
                </el-tooltip>
              </el-card>
            </el-col>
            <el-col :span="8" :xs="24" :sm="12" :md="8" :lg="8" :xl="8">
              <el-card
                v-loading="$asyncComputed.faceCollectSeverData.updating"
                shadow="hover"
              >
                <div class="score-detail">
                  <face-collection-info-gauge
                    :rate="faceCollectData.rateFormat"
                    :face-number="faceCollectData.face"
                    :face-total="faceCollectData.total"
                    title="人脸采集信息"
                    text="人脸采集数"
                  ></face-collection-info-gauge>
                </div>
              </el-card>
            </el-col>
          </div>
          <div v-else>
            <!--工分值校正明细-->
            <el-col :span="24">
              <div class="table-title">
                工分值校正明细
              </div>
              <div
                v-loading="$asyncComputed.projectDetailServerData.updating"
                shadow="hover"
              >
                <div class="score-detail">
                  <el-table
                    v-hidden-scroll
                    :data="projectDetailData"
                    height="99%"
                    :header-cell-class-name="tableHeaderClass"
                    :cell-class-name="tableCellClass"
                  >
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
                      label="校正系数 / 质量系数"
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
              </div>
            </el-col>
          </div>
        </el-row>
        <el-row v-if="params.listFlag === 'quality'" :gutter="10">
          <el-col :span="16" :xs="24" :sm="24" :md="24" :lg="16" :xl="16">
            <el-row>
              <el-card shadow="hover">
                <div style="height: 280px">
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
            </el-row>
            <el-row :gutter="10" style="margin: 10px 0">
              <el-card shadow="hover">
                <div style="height: 280px; text-align: center">
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
                        v-hidden-scroll
                        :ref="tag.type"
                        v-loading="
                          $asyncComputed.healthEducationServerData.updating
                        "
                        :data="healthEducationData"
                        height="190px"
                        class="appraisal-result-health-education-table"
                        style="width: 100%"
                        size="mini"
                        :cell-style="{color: '#9198bb'}"
                      >
                        <el-table-column
                          prop="time"
                          width="110px"
                          label="活动时间"
                        >
                        </el-table-column>
                        <el-table-column
                          prop="name"
                          min-width="110px"
                          label="活动名称"
                        >
                          <template slot-scope="scope">
                            <div class="single-text">
                              {{ scope.row.name }}
                            </div>
                          </template>
                        </el-table-column>
                      </el-table>
                      <div style="margin-top: 3px">
                        <el-pagination
                          v-reset-scroll="tag.type"
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
                    </el-tab-pane>
                  </el-tabs>
                </div>
              </el-card>
            </el-row>
          </el-col>
          <el-col
            :span="8"
            :xs="24"
            :sm="24"
            :md="24"
            :lg="8"
            :xl="8"
            style="margin-bottom: 10px;"
          >
            <el-card shadow="hover">
              <div style="height: 610px; text-align: center">
                <p class="second-title" style="margin:0; text-align:left;">
                  监督协管
                </p>
                <el-tabs>
                  <el-tab-pane
                    style="display: flex;flex-direction: column"
                    label="报告"
                  >
                    <el-table
                      v-hidden-scroll
                      ref="reportTable"
                      v-loading="
                        $asyncComputed.supervisionReportServerData.updating
                      "
                      :data="supervisionReportData"
                      height="520px"
                      style="width: 100%; flex:1"
                      size="mini"
                      :cell-style="{color: '#9198bb'}"
                    >
                      <el-table-column
                        prop="Contents"
                        min-width="110px"
                        label="报告内容"
                      >
                        <template slot-scope="scope">
                          <div class="single-text">
                            {{ scope.row.Contents }}
                          </div>
                        </template>
                      </el-table-column>
                      <el-table-column
                        prop="Time"
                        width="110px"
                        label="报告时间"
                      ></el-table-column>
                    </el-table>
                    <div style="margin-top: 3px">
                      <el-pagination
                        v-reset-scroll="'reportTable'"
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
                      v-hidden-scroll
                      ref="assistTable"
                      v-loading="
                        $asyncComputed.supervisionAssistServerData.updating
                      "
                      :data="supervisionAssistData"
                      height="520px"
                      style="width: 100%; flex:1"
                      size="mini"
                      :cell-style="{color: '#9198bb'}"
                    >
                      <el-table-column
                        prop="Address"
                        min-width="110px"
                        label="巡查地点"
                      >
                        <template slot-scope="scope">
                          <div class="single-text">
                            {{ scope.row.Address }}
                          </div>
                        </template>
                      </el-table-column>
                      <el-table-column
                        prop="Time"
                        width="110px"
                        label="巡查时间"
                      ></el-table-column>
                    </el-table>
                    <div style="margin-top: 3px">
                      <el-pagination
                        v-reset-scroll="'assistTable'"
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
      <div>
        <!--下级质量系数排行-->
        <el-row
          v-if="params.listFlag === 'quality' && this.rankData.length > 0"
          :gutter="10"
        >
          <el-col :span="12" :xs="24" style="margin-bottom: 10px;">
            <el-card
              v-loading="$asyncComputed.rankServerData.updating"
              shadow="hover"
            >
              <div class="second-title">下级质量系数排行</div>
              <div class="rank-box">
                <div
                  v-for="(i, index) of rankData"
                  :key="index"
                  class="cell"
                  @click="handleClickSubordinateArea(i.code)"
                >
                  <div class="ranking">{{ index + 1 }}</div>
                  <div class="container">
                    <div
                      class="name single-text"
                      :style="{
                        width:
                          totalData.label === 'city' ||
                          totalData.label === 'province'
                            ? '55px'
                            : '200px'
                      }"
                    >
                      {{ i.name }}
                    </div>
                    <div class="progress el-progress-staff-cell">
                      <el-progress
                        :stroke-width="16"
                        :percentage="i.rate * 100"
                        :show-text="false"
                        :color="
                          index === 0
                            ? '#4458fe'
                            : index === 1
                            ? '#00d0b4'
                            : index === 2
                            ? '#ffb143'
                            : '#ff56a9'
                        "
                      ></el-progress>
                    </div>
                    <div
                      class="text"
                      :style="{
                        color:
                          index === 0
                            ? '#4458fe'
                            : index === 1
                            ? '#00d0b4'
                            : index === 2
                            ? '#ffb143'
                            : '#ff56a9'
                      }"
                    >
                      {{ Number((i.rate * 100).toFixed(2)) }}%
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12" :xs="24">
            <el-card
              v-loading="$asyncComputed.rankServerData.updating"
              shadow="hover"
            >
              <div class="second-title">下级校正前工分排行</div>
              <div class="rank-box">
                <div
                  v-for="(i, index) of rankTotalData"
                  :key="index"
                  class="cell"
                  @click="handleClickSubordinateArea(i.code)"
                >
                  <div class="ranking">{{ index + 1 }}</div>
                  <div class="container">
                    <div
                      class="name single-text"
                      :style="{
                        width:
                          totalData.label === 'province' ||
                          totalData.label === 'city' ||
                          totalData.label === 'district'
                            ? '55px'
                            : '190px'
                      }"
                    >
                      {{ i.name }}
                    </div>
                    <div class="progress el-progress-staff-cell">
                      <el-progress
                        :style="{
                          width: `${i.proportion * 100}%`
                        }"
                        :stroke-width="16"
                        :percentage="100"
                        :show-text="false"
                        :color="
                          index === 0
                            ? '#4458fe'
                            : index === 1
                            ? '#00d0b4'
                            : index === 2
                            ? '#ffb143'
                            : '#ff56a9'
                        "
                      ></el-progress>
                    </div>
                    <div
                      class="text"
                      :style="{
                        color:
                          index === 0
                            ? '#4458fe'
                            : index === 1
                            ? '#00d0b4'
                            : index === 2
                            ? '#ffb143'
                            : '#ff56a9'
                      }"
                    >
                      {{ Number(i.totalWorkPoint.toFixed(2)) }}
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <!--下级工分排行 / 工分项目-->
        <el-row
          v-if="params.listFlag === 'score'"
          :gutter="10"
          style="margin-top: 10px"
        >
          <el-col
            :span="12"
            :xs="24"
            :sm="12"
            :md="12"
            :lg="12"
            :xl="12"
            style="margin-bottom: 10px;"
          >
            <div class="table-title">下级工分</div>
            <div
              v-loading="$asyncComputed.workpointRankServerData.updating"
              shadow="hover"
            >
              <el-table
                v-hidden-scroll
                :data="workpointRankData"
                height="600"
                :cell-class-name="cellClassHover"
                :header-cell-class-name="tableHeaderClass"
                @row-click="handleCellClick"
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
            </div>
          </el-col>
          <el-col :span="12" :xs="24" :sm="12" :md="12" :lg="12" :xl="12">
            <div class="table-title">工分项目</div>
            <div
              v-loading="$asyncComputed.workPointsProjectServerData.updating"
              shadow="hover"
            >
              <el-table
                v-hidden-scroll
                ref="refTable"
                :data="workPointsProjectData"
                height="600"
                :header-cell-class-name="tableHeaderClass"
                :cell-class-name="tableCellClass"
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
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>
<script>
import doctorBar from './components/doctorBar';
import twoCardCircle from './components/twocardCircle';
import decimal from 'decimal.js';
import VueSticky from 'vue-sticky';
import FileSaver from 'file-saver';
import faceCollectionInfoGauge from './components/faceCollectionInfoGauge';

export default {
  name: 'Index',
  components: {
    faceCollectionInfoGauge,
    doctorBar,
    twoCardCircle
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
        year: this.$dayjs().year() //考核年份，默认为当前年
      },
      yearList: [
        {value: 2020, label: '2020年度'},
        {value: 2021, label: '2021年度'}
      ],
      totalShowMore: false,
      appraisalResultInstructionsPopoverVisible: false, //单项指标考核结果说明
      healthEducationType: '1',
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
        {type: '6', name: '个体化健康教育'},
        {type: '8', name: '慢病自我管理小组活动'},
        {type: '9', name: '全民健康生活方式活动'}
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
      return {
        ...this.faceCollectSeverData,
        rateFormat: Number((this.faceCollectSeverData.rate * 100).toFixed(2))
      };
    },
    //工分值校正明细
    projectDetailData() {
      return this.projectDetailServerData?.map(it => ({
        ...it,
        rateFormat:
          (it?.rate ?? 0) >= 0.85 && (it?.rate ?? 0) < 1
            ? `100.00% / ${(it.rate * 100).toFixed(2)}%`
            : `${(it.rate * 100).toFixed(2)}% / ${(it.rate * 100).toFixed(2)}%`,
        workPointFormat: it.workPoint.toFixed(2),
        correctWorkPointFormat: it.correctWorkPoint.toFixed(2)
      }));
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
    },
    //下级地区排行数据
    rankTotalData() {
      // 首先获取数据
      const ranks = this.rankServerData;
      // 取出最大的校正前工分值
      const maxTotalWorkPoint = ranks
        .sort((a, b) => b.totalWorkPoint - a.totalWorkPoint)
        .map(item => item.totalWorkPoint)[0];

      return ranks.map(item => {
        return {
          ...item,
          // 较最大工分的比例
          proportion: maxTotalWorkPoint
            ? item?.totalWorkPoint / maxTotalWorkPoint
            : 0
        };
      });
    }
  },
  watch: {
    healthEducationType() {
      //切换type时将no还原为1
      this.healthEducationPageNo = 1;
    }
  },
  created() {
    this.initParams(this.$route);
  },
  methods: {
    tableCellClass() {
      return 'appraisal-result-table-cell';
    },
    tableHeaderClass() {
      return 'appraisal-result-table-header';
    },
    computedColWidth(field) {
      if (this.projectDetailData?.length > 0) {
        return this.$widthCompute(
          this.projectDetailData.map(item => item[field])
        );
      }
    },
    //el-table-column 内容格式化保留两位小数
    fixedDecimal: function(row, column, value) {
      if (!value) return 0;
      return value.toFixed(2);
    },
    initParams(route) {
      this.params.listFlag = route.query.listFlag ?? 'quality';
      this.params.year = Number(route.query.year ?? this.$dayjs().year());
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
    //文件下载（考核共识）
    handleFileDownload(url) {
      FileSaver.saveAs(url);
    },
    //设置标题可点击样式
    cellClassHover({columnIndex}) {
      if (columnIndex === 1) return 'appraisal-result-subordinate-name';
      return 'appraisal-result-table-cell';
    },
    //点击标题跳转详情
    handleCellClick(row, column) {
      if (column.property === 'name') {
        this.handleClickSubordinateArea(row.code);
      }
    },
    handleCheckDetailClick() {
      this.$router.push({
        name: 'check-detail',
        query: {
          id: this.params.id,
          year: this.params.year
        }
      });
    },
    // 自定义进度条文字
    setProgress(totalWorkPoint) {
      return () => {
        return totalWorkPoint;
      };
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

<style lang="scss">
.appraisal-result-table-header {
  color: #3a3f62;
  font-weight: normal;
  font-size: 15px;
}

.appraisal-result-table-cell {
  color: #3e4260;
  font-size: 14px;
}

.el-progress-staff-cell {
  .el-progress-bar__outer,
  .el-progress-bar__inner {
    /*圆角*/
    border-radius: 2px;
  }
}
</style>

<style scoped lang="scss">
@import '../../styles/vars';

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

.table-title {
  text-align: left;
  background: #eef2fe;
  padding: 20px;
}

.second-title,
.table-title {
  font-size: 16px;
  color: #444c63;
}

.header-box-card {
  width: auto;
  z-index: 2001 !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  padding: 15px 20px;
  border-radius: 5px;
  border: 1px solid #ebeef5;
  box-sizing: border-box;
  .header-title {
    font-size: 18px;
    color: #3a3f62;
    margin-right: 10px;
  }
}

.score-detail {
  position: relative;
  height: 260px;
  text-align: center;
  box-sizing: border-box;
  color: #7a7d95;
  font-size: 14px;
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

.rank-box {
  padding-top: 20px;
  .cell {
    padding: 10px;
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 12px;
    color: #3a3f62;
    cursor: pointer;
    .ranking {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #dae0f2;
      border-radius: 50%;
      margin-right: 10px;
    }
    .container {
      width: 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
      .name {
        width: 80px;
      }
      .progress {
        flex: 1;
        margin: 5px 2px;
      }
      .text {
        width: 80px;
        text-align: right;
      }
    }
  }
}

.el-dropdown-link {
  cursor: pointer;
  color: #409eff;
}

.single-text {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<style lang="scss">
.appraisal-result-subordinate-name {
  cursor: pointer;
  color: #3a3f62;
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
