<template>
  <div class="wrapper">
    <div v-hidden-scroll>
      <!--顶部表头-->
      <el-card v-sticky shadow="never">
        <div
          class="header"
          v-loading="$asyncComputed.overviewServerData.updating"
        >
          <div class="header-title">{{ overviewData.name }}绩效考核</div>
          <div>
            <el-date-picker
              v-model="currentDate"
              size="mini"
              type="month"
              placeholder="选择月"
              :picker-options="disabledDate"
              :clearable="false"
              @change="handleChangeDate"
            >
            </el-date-picker>
          </div>
          <el-tooltip
            :disabled="!overviewData.settle"
            content="结果已冻结，无法操作"
          >
            <div>
              <el-button
                type="primary"
                size="mini"
                :disabled="overviewData.settle"
                @click="handleSettle()"
              >
                {{ overviewData.settle ? '结果解冻' : '结果冻结' }}
              </el-button>
            </div>
          </el-tooltip>
          <div class="right">
            <el-button
              type="primary"
              size="mini"
              :loading="reportDataLoading"
              @click="handleClickReport"
            >
              报表
            </el-button>
            <el-tooltip
              style="margin-left: 10px"
              :disabled="!overviewData.settle"
              content="结果已冻结，无法操作"
            >
              <div>
                <el-button
                  type="primary"
                  size="mini"
                  :disabled="overviewData.settle"
                  @click="handleCompute"
                >
                  计算
                </el-button>
              </div>
            </el-tooltip>
          </div>
        </div>
      </el-card>
      <el-row
        style="margin: 10px 0"
        v-for="(item, index) of indicatorsData"
        :key="index"
      >
        <div
          class="card indicators-box"
          :style="{height: item.isOpen ? 'auto' : '118px', overflow: 'hidden'}"
        >
          <div class="indicators-title-card title-box">
            <div class="title">{{ item.name }}</div>
          </div>
          <div class="indicators-container">
            <div
              v-for="(i, index) of item.data"
              :key="index"
              class="item-content indicators-card"
            >
              <div class="indicators-name">
                {{ i.name }}
              </div>
              <div class="indicators-content">
                <div class="number" v-loading="i.isLoading">
                  {{ i.number }}
                  <span style="font-size: 16px">{{ i.unit }}</span>
                </div>
                <div class="icon-box">
                  <img class="icon" :src="i.img" />
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="item.data.length > 4"
            class="arrow-box"
            @click="
              () =>
                item.name === '医疗指标'
                  ? (medicalIndicatorsIsOpen = !medicalIndicatorsIsOpen)
                  : item.name === '公卫指标'
                  ? (publicIndicatorsIsOpen = !publicIndicatorsIsOpen)
                  : null
            "
          >
            <div
              :class="
                `${item.isOpen ? 'el-icon-arrow-up' : 'el-icon-arrow-down'}`
              "
            />
          </div>
        </div>
      </el-row>
      <el-row :gutter="10">
        <el-col
          :span="17"
          :xs="24"
          :sm="12"
          :md="12"
          :lg="16"
          :xl="17"
          style="margin-bottom: 10px"
        >
          <div class="card staff-container" v-hidden-scroll>
            <div v-sticky style="z-index:999">
              <div class="staff-tabs">
                <div
                  :class="staffFlag === 'workPoint' ? 'tab-select' : 'tab'"
                  @click="staffFlag = 'workPoint'"
                >
                  员工工作量排名
                </div>
                <div
                  :class="staffFlag === 'rate' ? 'tab-select' : 'tab'"
                  @click="staffFlag = 'rate'"
                >
                  员工质量系数排名
                </div>
              </div>
              <div class="top-container">
                <div
                  v-if="staffFlag === 'workPoint'"
                  v-loading="$asyncComputed.overviewServerData.updating"
                >
                  当前月工作总量：{{ overviewData.originalScore }}分
                </div>
                <div v-if="staffFlag === 'rate'">
                  平均质量系数：{{ averageRate * 100 }}%
                </div>
              </div>
            </div>
            <div
              class="content"
              v-loading="$asyncComputed.staffCheckListSeverData.updating"
              v-hidden-scroll
            >
              <div v-if="staffFlag === 'workPoint'">
                <div class="rank-box">
                  <div
                    v-for="(i, index) of staffCheckListData.sort(
                      (a, b) => b.correctionScore - a.correctionScore
                    )"
                    :key="index"
                    class="cell"
                    @click="onGotoStaffDetail(i.id, i.area)"
                  >
                    <div v-if="index < 3" class="top_three_ranking">
                      <img class="icon" :src="topThreeIcon[index]" alt="" />
                    </div>
                    <div v-else class="ranking">
                      {{ index + 1 }}
                    </div>
                    <div class="container">
                      <div class="name">{{ i.name }}</div>
                      <div class="progress el-progress-staff-cell">
                        <el-progress
                          :style="{
                            width: `${i.proportion * 100}%`
                          }"
                          :stroke-width="16"
                          :percentage="i.correctionRate * 100"
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
                          width: rankScoreWidth,
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
                        {{ i.correctionScore }}/{{ i.score }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="staffFlag === 'rate'">
                <div class="rank-box">
                  <div
                    v-for="(i, index) of staffCheckListData.sort((a, b) => {
                      if (a.rate === null && b.rate === null) {
                        return 0;
                      } else if (a.rate === null) {
                        return 1;
                      } else if (b.rate === null) {
                        return -1;
                      } else {
                        return b.rate - a.rate;
                      }
                    })"
                    :key="index"
                    class="cell"
                    @click="onGotoStaffDetail(i.id, i.area)"
                  >
                    <div v-if="index < 3" class="top_three_ranking">
                      <img class="icon" :src="topThreeIcon[index]" alt="" />
                    </div>
                    <div v-else class="ranking">
                      {{ index + 1 }}
                    </div>
                    <div class="container">
                      <div class="name">{{ i.name }}</div>
                      <div class="progress el-progress-staff-cell">
                        <el-progress
                          :style="{
                            width: `${i.rate === null ? 0 : 100}%`
                          }"
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
                        {{ i.rateFormat }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
        <el-col
          :span="7"
          :xs="24"
          :sm="12"
          :md="12"
          :lg="8"
          :xl="7"
          style="margin-bottom: 10px"
        >
          <div class="card workbench-container">
            <div class="workbench-header">
              系统配置
            </div>
            <div class="content">
              <div
                v-for="(value, key) in hisSettingSeverData"
                :key="key"
                class="cell"
              >
                <div>{{ key }}</div>
                <el-switch
                  :value="value"
                  @change="onWorkItemsSwitchChange(key)"
                />
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
      <el-dialog :visible.sync="dialogStaffTableVisible" width="90%" top="10vh">
        <div slot="title" class="dialog-header">
          <div style="width: 40px; color: #606266; font-size: 14px">金额:</div>
          <el-input
            size="mini"
            style="width: 200px"
            placeholder="请输入金额"
            v-model="amount"
          ></el-input>
          <el-button
            type="primary"
            size="mini"
            style="margin-left: 20px"
            @click="
              exportReport(
                [reportTypeOption.SUMMARY, reportTypeOption.DETAIL],
                overviewData.name + currentDate.$format('YYYY-MM') + '报表.xlsx'
              )
            "
            >导出
          </el-button>
          <el-button
            type="primary"
            size="mini"
            style="margin-left: 20px"
            @click="handleClickReportType"
            >{{ this.ReportTypeText }}
          </el-button>
          <div style="margin-left: 20px">
            绩效考核月份: {{ currentDate.$format('YYYY-MM') }}
          </div>
          <div style="margin-left: 20px;">计算时间: {{ computingTime }}</div>
        </div>
        <el-table
          v-show="reportType === reportTypeOption.SUMMARY"
          :id="reportTypeOption.SUMMARY"
          :data="reportData"
          :span-method="objectSpanMethod"
          class="el-table-medical-performance-report"
          :cell-class-name="tableCellClassName"
          height="70vh"
          size="mini"
          border
          :header-cell-style="{textAlign: 'center'}"
          :cell-style="{textAlign: 'center'}"
        >
          <el-table-column
            property="deptName"
            label="科室"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="name"
            label="姓名"
            min-width="120"
          ></el-table-column>
          <el-table-column
            v-for="it of reportCols"
            :key="it.id"
            :property="it.id"
            :label="it.name"
            min-width="120"
          >
          </el-table-column>
          <el-table-column
            property="sumScoreFormat"
            label="校正前总分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="rateFormat"
            label="质量系数"
            min-width="100"
          ></el-table-column>
          <el-table-column
            property="correctionSumScoreFormat"
            label="校正后总分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="extra"
            label="附加分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="totalScoreFormat"
            label="总得分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="amount"
            label="金额"
            min-width="120"
          ></el-table-column>
        </el-table>
        <el-table
          v-show="reportType === reportTypeOption.DETAIL"
          :id="reportTypeOption.DETAIL"
          :data="reportData"
          :span-method="objectSpanMethod"
          class="el-table-medical-performance-report"
          :cell-class-name="tableCellClassName"
          height="70vh"
          size="mini"
          border
          :header-cell-style="{textAlign: 'center'}"
          :cell-style="{textAlign: 'center'}"
        >
          <el-table-column
            property="deptName"
            label="科室"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="name"
            label="姓名"
            min-width="120"
          ></el-table-column>
          <el-table-column
            v-for="it of reportCols"
            :key="it.id"
            :property="it.id"
            :label="it.name"
            min-width="120"
          >
            <el-table-column
              v-for="item of it.children"
              :key="item.id"
              :property="item.id"
              :label="item.name"
              min-width="120"
            />
          </el-table-column>
          <el-table-column
            property="sumScoreFormat"
            label="校正前总分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="rateFormat"
            label="质量系数"
            min-width="100"
          ></el-table-column>
          <el-table-column
            property="correctionSumScoreFormat"
            label="校正后总分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="extra"
            label="附加分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="totalScoreFormat"
            label="总得分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="amount"
            label="金额"
            min-width="120"
          ></el-table-column>
        </el-table>
      </el-dialog>
    </div>
  </div>
</template>

<script>
import VueSticky from 'vue-sticky';
import * as dayjs from 'dayjs';
import FileSaver from 'file-saver';
import XLSX from 'xlsx';
import firstIcon from '../../../assets/rank/first.png';
import secondIcon from '../../../assets/rank/second.png';
import thirdIcon from '../../../assets/rank/third.png';
import {getTimeRange} from '../../../../common/his.ts';

export default {
  name: 'index',
  data() {
    return {
      currentDate: dayjs()
        .startOf('M')
        .toDate(),
      disabledDate: {
        disabledDate(time) {
          return (
            time.getTime() >
              dayjs(getTimeRange().end)
                .subtract(1, 'M')
                .valueOf() ||
            time.getTime() < dayjs(getTimeRange().start).valueOf()
          );
        }
      },
      amount: null,
      reportTypeOption: {
        SUMMARY: '汇总',
        DETAIL: '明细'
      },
      // 报表类型 summary、detail
      reportType: '汇总',
      reportSeverData: {cols: [], data: []},
      reportDataLoading: false,
      dialogStaffTableVisible: false,
      deptNameSpanArr: [],
      //员工工作量：workPoint， 质量系数：rate
      staffFlag: 'workPoint',
      medicalIndicatorsIsOpen: false,
      publicIndicatorsIsOpen: false,
      topThreeIcon: [firstIcon, secondIcon, thirdIcon]
    };
  },
  directives: {
    sticky: VueSticky
  },
  created() {
    this.initParams(this.$route);
  },
  computed: {
    rankScoreWidth() {
      return (
        this.$widthCompute(
          this.staffCheckListData.map(it => it.score + '/' + it.correctionScore)
        ) -
        15 +
        'px'
      );
    },
    overviewData() {
      return {
        ...this.overviewServerData,
        originalScore:
          Number(this.overviewServerData.originalScore?.toFixed(2)) || 0,
        correctScore:
          Number(this.overviewServerData.correctScore?.toFixed(2)) || 0,
        rate: this.overviewServerData.correctScore
          ? this.overviewServerData.correctScore /
            this.overviewServerData.originalScore
          : 0
      };
    },
    staffCheckListData() {
      return this.staffCheckListSeverData
        ?.sort((a, b) => b.score - a.score)
        .map(it => {
          const correctionRate = it.rate ?? 1; // 用于校正得分的质量系数，为null时按照100%计算
          return {
            ...it,
            correctionRate,
            rateFormat:
              it.rate === null
                ? '无考核'
                : Number((it.rate * 100).toFixed(2)) + '%',
            score: Number(it.score?.toFixed(2)) || 0,
            correctionScore: Number((it.score * correctionRate).toFixed(2)),
            proportion: it.score / (this.staffCheckListSeverData[0].score || 1)
          };
        })
        .sort((a, b) => b.correctionScore - a.correctionScore);
    },
    averageRate() {
      const data = this.staffCheckListSeverData
        .filter(it => it.rate !== null)
        .map(it => it.rate);
      const total = data.reduce((prev, curr) => prev + curr, 0);
      let average = 0;
      if (data.length > 0) average = Number((total / data.length).toFixed(4));
      return average;
    },
    indicatorsData() {
      const num = 100000;
      return [
        {
          name: '医疗指标',
          isOpen: this.medicalIndicatorsIsOpen,
          data: [
            {
              name: '医疗人员数量',
              unit: this.staffSeverData > num ? '万人' : '人',
              number: Number(
                (this.staffSeverData > num
                  ? this.staffSeverData / 10000
                  : this.staffSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/numberPeople.png')
                .default,
              isLoading: this.$asyncComputed.oldSeverData.updating
            },
            {
              name: '医疗收入',
              unit: this.moneySeverData > num ? '万元' : '元',
              number: Number(
                (this.moneySeverData > num
                  ? this.moneySeverData / 10000
                  : this.moneySeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/medicalIncome.png')
                .default,
              isLoading: this.$asyncComputed.moneySeverData.updating
            },
            {
              name: '诊疗人次数',
              unit: this.visitsSeverData > num ? '万人次' : '人次',
              number: Number(
                (this.visitsSeverData > num
                  ? this.visitsSeverData / 10000
                  : this.visitsSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/month.png').default,
              isLoading: this.$asyncComputed.visitsSeverData.updating
            },
            {
              name: '医师日均担负诊疗人次数',
              unit: this.doctorDailyVisitsSeverData > num ? '万人次' : '人次',
              number: Number(
                (this.doctorDailyVisitsSeverData > num
                  ? this.doctorDailyVisitsSeverData / 10000
                  : this.doctorDailyVisitsSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/averageDaily.png')
                .default,
              isLoading: this.$asyncComputed.doctorDailyVisitsSeverData.updating
            },
            {
              name: '出院人员数量',
              unit: this.dischargedVisitsSeverData > num ? '万人' : '人',
              number: Number(
                (this.dischargedVisitsSeverData > num
                  ? this.dischargedVisitsSeverData / 10000
                  : this.dischargedVisitsSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/leaveHospitalNumber.png')
                .default,
              isLoading: this.$asyncComputed.dischargedVisitsSeverData.updating
            },
            {
              name: '病床使用率',
              number: Number((this.sickbedUsageRateSeverData * 100).toFixed(2)),
              unit: '%',
              img: require('../../../assets/indicators-icon/bedUtilizationRate.png')
                .default,
              isLoading: this.$asyncComputed.sickbedUsageRateSeverData.updating
            },
            {
              name: '门急诊次均费用',
              unit:
                this.outpatientAverageIncomesSeverData > num ? '万元' : '元',
              number: Number(
                (this.outpatientAverageIncomesSeverData > num
                  ? this.outpatientAverageIncomesSeverData / 10000
                  : this.outpatientAverageIncomesSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/averageCostOutpatientEmergency.png')
                .default,
              isLoading: this.$asyncComputed.outpatientAverageIncomesSeverData
                .updating
            },
            {
              name: '住院次均费用',
              unit: this.inpatientAverageIncomesSeverData > num ? '万元' : '元',
              number: Number(
                (this.inpatientAverageIncomesSeverData > num
                  ? this.inpatientAverageIncomesSeverData / 10000
                  : this.inpatientAverageIncomesSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/averageCostHospitalization.png')
                .default,
              isLoading: this.$asyncComputed.inpatientAverageIncomesSeverData
                .updating
            },
            {
              name: '每万人口全科医生数',
              unit: this.staffSeverData > num ? '万人' : '人',
              number: Number(
                (this.generalPractitionersNumberSeverData > num
                  ? this.generalPractitionersNumberSeverData / 10000
                  : this.generalPractitionersNumberSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/generalPractitionersNumber.png')
                .default,
              isLoading: this.$asyncComputed.generalPractitionersNumberSeverData
                .updating
            },
            {
              name: '医护比',
              unit: '',
              number: Number(this.healthCareRatioSeverData.toFixed(2)),
              img: require('../../../assets/indicators-icon/healthCareRatio.png')
                .default,
              isLoading: this.$asyncComputed.healthCareRatioSeverData.updating
            },
            {
              name: '卫生技术人员学历结构',
              number: Number(
                (this.ratioOfHealthTechnicianEducationSeverData * 100).toFixed(
                  2
                )
              ),
              unit: '%',
              img: require('../../../assets/indicators-icon/educationalStructureHealthTechnicians.png')
                .default,
              isLoading: this.$asyncComputed
                .ratioOfHealthTechnicianEducationSeverData.updating
            },
            {
              name: '卫生技术人员职称结构',
              number: Number(
                (this.ratioOfHealthTechnicianTitlesSeverData * 100).toFixed(2)
              ),
              unit: '%',
              img: require('../../../assets/indicators-icon/ratioOfHealthTechnicianTitles.png')
                .default,
              isLoading: this.$asyncComputed
                .ratioOfHealthTechnicianTitlesSeverData.updating
            },
            {
              name: '中医类别医师占比',
              unit: '',
              number: Number(this.ratioOfTCMSeverData.toFixed(2)),
              img: require('../../../assets/indicators-icon/proportionTCMPhysicians.png')
                .default,
              isLoading: this.$asyncComputed.ratioOfTCMSeverData.updating
            },
            {
              name: '每万人服务门诊当量',
              unit: '',
              number: Number(this.thousandOutpatientVisitsSeverData.toFixed(2)),
              img: require('../../../assets/indicators-icon/outpatientServiceEquivalent.png')
                .default,
              isLoading: this.$asyncComputed.thousandOutpatientVisitsSeverData
                .updating
            },
            {
              name: '每万人服务住院当量',
              unit: '',
              number: Number(this.thousandInpatientVisitsSeverData.toFixed(2)),
              img: require('../../../assets/indicators-icon/serviceHospitalizationEquivalent.png')
                .default,
              isLoading: this.$asyncComputed.thousandInpatientVisitsSeverData
                .updating
            },
            {
              name: '职工年平均担负门急诊人次',
              unit: this.visitsSeverData > num ? '万人次' : '人次',
              number: Number(
                (this.visitsSeverData > num
                  ? this.visitsSeverData / 10000
                  : this.visitsSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/averageAnnualNumberOutpatientVisitsEmployees.png')
                .default,
              isLoading: this.$asyncComputed.visitsSeverData.updating
            }
          ]
        },
        {
          name: '公卫指标',
          isOpen: this.publicIndicatorsIsOpen,
          data: [
            {
              name: '居民档案数量',
              unit: this.personSeverData > num ? '万人' : '人',
              number: Number(
                (this.personSeverData > num
                  ? this.personSeverData / 10000
                  : this.personSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/archives.png')
                .default,
              isLoading: this.$asyncComputed.personSeverData.updating
            },
            {
              name: '慢病管理人数',
              unit: this.chronicSeverData > num ? '万人' : '人',
              number: Number(
                (this.chronicSeverData > num
                  ? this.chronicSeverData / 10000
                  : this.chronicSeverData
                ).toFixed(2)
              ),
              img: require('../../../assets/indicators-icon/slowDisease.png')
                .default,
              isLoading: this.$asyncComputed.chronicSeverData.updating
            },
            {
              name: '高血压规范管理率',
              number: Number((this.htnSeverData * 100).toFixed(2)),
              unit: '%',
              img: require('../../../assets/indicators-icon/hypertension.png')
                .default,
              isLoading: this.$asyncComputed.htnSeverData.updating
            },
            {
              name: '糖尿病规范管理率',
              number: Number((this.t2dmSeverData * 100).toFixed(2)),
              unit: '%',
              img: require('../../../assets/indicators-icon/diabetes.png')
                .default,
              isLoading: this.$asyncComputed.t2dmSeverData.updating
            },
            {
              name: '老年人管理率',
              number: Number((this.oldSeverData * 100).toFixed(2)),
              unit: '%',
              img: require('../../../assets/indicators-icon/elderly.png')
                .default,
              isLoading: this.$asyncComputed.oldSeverData.updating
            }
          ]
        }
      ];
    },
    // 报表计算时间
    computingTime() {
      const it = this.reportData.find(it => it.items.length > 0);
      if (it?.items) {
        return it.items[0].updated_at.$format('YYYY-MM-DD HH:mm');
      }
      return null;
    },
    reportData() {
      // 机构总分
      let organizationScore = 0;
      let data = this.reportSeverData['data'];
      data = data
        .map(it => {
          it.items
            .sort((a, b) => {
              if (a['typeId'] != b['typeId']) {
                return a['typeId']?.localeCompare(b['typeId']);
              }
            })
            //根据order排序
            .sort((a, b) => a.order - b.order);
          // 质量系数
          it.rate = it.rate || 1;
          it.rateFormat = Number((it.rate * 100).toFixed(2)) + '%';
          // 员工项目总计计 校正前总得分
          it.sumScore = it.items.reduce((prev, curr) => prev + curr.score, 0);
          it.sumScoreFormat = Number(it.sumScore?.toFixed(2));
          // 员工项目总计计 校正后总得分
          it.correctionSumScore = it.sumScore * it.rate;
          it.correctionSumScoreFormat = Number(
            it.correctionSumScore?.toFixed(2)
          );
          // 员工总得分
          it.totalScore = it.correctionSumScore + (it.extra || 0);
          it.totalScoreFormat = Number(it.totalScore?.toFixed(2));
          // 累加员工得分得到机构总分
          organizationScore += it.totalScore;
          return it;
        })
        .sort((a, b) => {
          if (a['deptName'] != b['deptName']) {
            return a['deptName']?.localeCompare(b['deptName']);
          }
        });
      for (const i of data) {
        // 员工总得分在机构中所占比例
        i.proportion = (i.totalScore || 0) / organizationScore;
        // 所得金额
        i.amount = Number((this.amount * i.proportion).toFixed(2));
      }
      return data;
    },
    reportCols() {
      return this.reportSeverData['cols'];
    },
    ReportTypeText() {
      return this.reportType === this.reportTypeOption.SUMMARY
        ? this.reportTypeOption.DETAIL
        : this.reportTypeOption.SUMMARY;
    }
  },
  asyncComputed: {
    overviewServerData: {
      async get() {
        return await this.$api.HisHospital.overview(this.currentDate);
      },
      default() {
        return {};
      }
    },
    staffCheckListSeverData: {
      async get() {
        return await this.$api.HisHospital.findStaffCheckList(this.currentDate);
      },
      default() {
        return [];
      }
    },
    /********************医疗指标**********************/
    // 医疗人员数量
    staffSeverData: {
      async get() {
        return await this.$api.AppHome.staff(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 医疗收入
    moneySeverData: {
      async get() {
        return await this.$api.AppHome.money(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 诊疗人次数
    visitsSeverData: {
      async get() {
        return await this.$api.AppHome.visits(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 医师日均担负诊疗人次数
    doctorDailyVisitsSeverData: {
      async get() {
        return await this.$api.AppHome.doctorDailyVisits(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 出院人员数量
    dischargedVisitsSeverData: {
      async get() {
        return await this.$api.AppHome.dischargedVisits(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 病床使用率
    sickbedUsageRateSeverData: {
      async get() {
        return await this.$api.AppHome.sickbedUsageRate(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 门急诊次均费用
    outpatientAverageIncomesSeverData: {
      async get() {
        return await this.$api.AppHome.outpatientAverageIncomes(
          this.currentDate
        );
      },
      default() {
        return 0;
      }
    },
    // 住院次均费用
    inpatientAverageIncomesSeverData: {
      async get() {
        return await this.$api.AppHome.inpatientAverageIncomes(
          this.currentDate
        );
      },
      default() {
        return 0;
      }
    },
    // 每万人口全科医生数
    generalPractitionersNumberSeverData: {
      async get() {
        return await this.$api.AppHome.GPsPerW(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 医护比
    healthCareRatioSeverData: {
      async get() {
        return await this.$api.AppHome.ratioOfMedicalAndNursing(
          this.currentDate
        );
      },
      default() {
        return 0;
      }
    },
    // 卫生技术人员学历结构
    ratioOfHealthTechnicianEducationSeverData: {
      async get() {
        return await this.$api.AppHome.ratioOfHealthTechnicianEducation(
          this.currentDate
        );
      },
      default() {
        return 0;
      }
    },
    // 卫生技术人员职称结构
    ratioOfHealthTechnicianTitlesSeverData: {
      async get() {
        return await this.$api.AppHome.ratioOfHealthTechnicianTitles(
          this.currentDate
        );
      },
      default() {
        return 0;
      }
    },
    // 中医类别医师占比
    ratioOfTCMSeverData: {
      async get() {
        return await this.$api.AppHome.RatioOfTCM(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 每万人服务门诊当量
    thousandOutpatientVisitsSeverData: {
      async get() {
        return await this.$api.AppHome.thousandOutpatientVisits(
          this.currentDate
        );
      },
      default() {
        return 0;
      }
    },
    // 每万人服务住院当量
    thousandInpatientVisitsSeverData: {
      async get() {
        return await this.$api.AppHome.thousandInpatientVisits(
          this.currentDate
        );
      },
      default() {
        return 0;
      }
    },
    //职工年平均担负门急诊人次
    staffOutpatientVisitsSeverData: {
      async get() {
        return await this.$api.AppHome.staffOutpatientVisits(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    /********************医疗指标**********************/

    /********************公卫指标**********************/
    // 居民档案数量
    personSeverData: {
      async get() {
        return await this.$api.AppHome.person(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 慢病管理人数
    chronicSeverData: {
      async get() {
        return await this.$api.AppHome.chronic(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 高血压
    htnSeverData: {
      async get() {
        return await this.$api.AppHome.htn(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 糖尿病规范管理率
    t2dmSeverData: {
      async get() {
        return await this.$api.AppHome.t2dm(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    // 老年人管理率
    oldSeverData: {
      async get() {
        return await this.$api.AppHome.old(this.currentDate);
      },
      default() {
        return 0;
      }
    },
    /********************公卫指标**********************/

    hisSettingSeverData: {
      async get() {
        return await this.$api.HisHospital.selectHisSetting();
      },
      default() {
        return {};
      }
    }
  },
  watch: {
    reportData: function() {
      // 获取需要合并的数据
      this.deptNameSpanArr = this.getDeptNameSpanArr();
    }
  },
  methods: {
    initParams(route) {
      if (route.query.date)
        this.currentDate = new Date(JSON.parse(route.query.date));
    },
    async handleClickReport() {
      this.reportDataLoading = true;
      this.reportSeverData = await this.$api.HisHospital.report2(
        this.currentDate
      );
      this.reportDataLoading = false;
      this.dialogStaffTableVisible = true;
    },
    // 切换报表类型
    handleClickReportType() {
      this.reportType =
        this.reportType === this.reportTypeOption.SUMMARY
          ? this.reportTypeOption.DETAIL
          : this.reportTypeOption.SUMMARY;
    },
    // 跳转到员工详情页
    onGotoStaffDetail(id, area) {
      this.$router.push({
        name: 'personal-appraisal-results',
        query: {
          id: id,
          area: area,
          date: JSON.stringify(this.currentDate)
        }
      });
    },
    getDeptNameSpanArr() {
      let arr = [];
      let pos = 0;
      let index = 0;
      for (let i = 0; i < this.reportData.length; i++) {
        if (i === 0) {
          arr.push(1);
          pos = 0;
          this.reportData[i].deptNameIndex = index;
        } else {
          // 判断当前元素与上一个元素是否相同
          if (this.reportData[i].deptName === this.reportData[i - 1].deptName) {
            arr[pos] += 1;
            arr.push(0);
            this.reportData[i].deptNameIndex = index;
          } else {
            arr.push(1);
            pos = i;
            index++;
            this.reportData[i].deptNameIndex = index;
          }
        }
      }
      return arr;
    },
    handleChangeDate() {
      this.$router.replace({
        query: {
          date: JSON.stringify(this.currentDate)
        }
      });
    },
    async handleCompute() {
      try {
        await this.$api.HisScore.score(this.currentDate);
        this.$message.success('请刷新后查看');
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    async handleSettle() {
      this.$confirm('此操作无法恢复, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.HisHospital.settle(
              this.currentDate,
              !this.overviewData.settle
            );
            this.$message.success('修改成功');
            this.$asyncComputed.overviewServerData.update();
          } catch (e) {
            console.log(e.message);
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
    objectSpanMethod({column, rowIndex}) {
      if (column.property === 'deptName') {
        const _row = this.deptNameSpanArr[rowIndex];
        const _col = _row > 0 ? 1 : 0;
        return {rowspan: _row, colspan: _col};
      }
    },
    // 导出报表
    // id为要导出的table节点id（父节点也可以），title是导出的表格文件名
    exportReport(ids, title) {
      // create new workbook
      const wb = XLSX.utils.book_new();
      for (const id of ids) {
        const ws = XLSX.utils.table_to_sheet(document.getElementById(id));
        XLSX.utils.book_append_sheet(wb, ws, id);
      }

      const wbOut = XLSX.write(wb, {
        bookType: 'xlsx',
        bookSST: true,
        type: 'array'
      });
      try {
        FileSaver.saveAs(
          new Blob([wbOut], {
            type: 'application/octet-stream'
          }),
          title
        );
      } catch (e) {
        if (typeof console !== 'undefined') console.log(e, wbOut);
      }
    },
    tableCellClassName({row, columnIndex}) {
      // 非第一列（科室），以员工为单位，单元格进行斑马线颜色区分
      if (columnIndex !== 0 && row.nameIndex % 2 === 1) {
        return 'custom-cell';
      }
    },
    async onWorkItemsSwitchChange(key) {
      const message = this.hisSettingSeverData[key]
        ? `关闭后，${key}将无法查看，是否确定关闭？`
        : `开启后，${key}将可以查看，是否确定开启？`;
      try {
        await this.$confirm(message, '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        try {
          await this.$api.HisHospital.upsertHisSetting(
            key,
            !this.hisSettingSeverData[key]
          );
          this.$message.success('修改成功');
          this.$asyncComputed.hisSettingSeverData.update();
        } catch (e) {
          console.log(e.message);
          this.$message.error(e.message);
        }
      } catch (e) {
        this.$message({
          type: 'info',
          message: '已取消'
        });
      }
    }
  }
};
</script>

<style lang="scss">
.el-table-medical-performance-report {
  .custom-cell {
    background: #f5f7fa;
  }

  tr {
    pointer-events: none;
  }
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
}

.header {
  & > div {
    margin: 0 20px 15px 0;
    float: left;
  }

  .right {
    float: right;
    margin-right: 0;
    display: flex;
    flex-direction: row;
  }

  .header-title {
    font: 18px/1.4 Arial;
    color: #3a3f62;
  }
}

.indicators-card {
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  background-color: #ffffff;
  padding: 10px;
}

.card {
  border-radius: 4px;
  background-color: #ffffff;
}

.indicators-title-card {
  background-color: #ffffff;
  border-right: 1px solid #ebeef5;
  color: #3a3f62;
  padding: 10px;
}

.indicators-box {
  display: flex;
  flex-direction: row;
  position: relative;

  .title-box {
    display: flex;
    flex-direction: row;
    align-items: center;

    .title {
      writing-mode: vertical-lr;
      letter-spacing: 0.3em;
      font-size: 17px;
    }
  }

  .indicators-container {
    flex: 1;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;

    .item-content {
      width: calc((100% - 84px) / 4);
      display: flex;
      flex-direction: column;
      color: #3a3f62;

      .indicators-name {
        font-size: 15px;
        padding: 5px;
      }

      .indicators-content {
        flex: 1;
        display: flex;
        flex-direction: row;
        align-items: center;

        .number {
          text-align: center;
          flex: 1;
          font-size: 28px;
        }

        .icon-box {
          margin: 0 40px 20px 0;

          .icon {
            width: 50px;
            height: 50px;
          }
        }
      }
    }
  }

  .arrow-box {
    position: absolute;
    right: 0;
    bottom: 0;
    height: 100px;
    width: 100px;
    display: flex;
    align-items: flex-end;
    justify-content: right;
    padding: 0 15px 15px 0;
  }
}

.staff-container {
  height: 60vh;
  color: #3a3f62;
  font-size: 15px;
  overflow-y: scroll;

  .top-container {
    background: #ffffff;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 10px 20px;
  }

  .staff-tabs {
    height: 60px;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
    font-size: 16px;
    background: #dae0f2;
    border-bottom: 1px solid #ebeef5;

    .tab,
    .tab-select {
      width: 50%;
      height: 100%;
      text-align: center;
      line-height: 60px;
      cursor: pointer;
    }

    .tab-select {
      background: #ffffff;
    }
  }

  .content {
    height: calc(60vh - 80px);

    .rank-box {
      padding: 10px;

      .cell {
        padding: 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 13px;
        color: #3a3f62;
        cursor: pointer;

        .top_three_ranking,
        .ranking {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .top_three_ranking {
          .icon {
            width: 23px;
            height: 30px;
          }
        }

        .ranking {
          background: #dae0f2;
          border-radius: 50%;
        }

        .container {
          margin-left: 10px;
          width: 100%;
          display: flex;
          flex-direction: row;
          align-items: center;

          .name {
            width: 50px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .progress {
            flex: 1;
            margin: 5px 3px;
          }

          .text {
            width: 50px;
            text-align: right;
          }
        }
      }
    }
  }
}

.workbench-container {
  height: 60vh;

  .workbench-header {
    height: 40px;
    line-height: 40px;
    border-bottom: 1px solid #ebeef5;
    padding: 10px;
    color: #3a3f62;
    font-size: 18px;
  }

  .content {
    color: #3a3f62;
    font-size: 15px;
    .cell {
      margin: 20px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }
}

.dialog-header {
  width: calc(100% - 30px);
  height: 50px;
  display: flex;
  flex-direction: row;
  align-items: center;
}
</style>
