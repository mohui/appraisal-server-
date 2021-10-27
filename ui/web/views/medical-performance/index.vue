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
              @change="handleChangeDate"
              :picker-options="disabledDate"
            >
            </el-date-picker>
          </div>
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
          <div class="right">
            <el-button
              type="primary"
              size="mini"
              :loading="reportDataLoading"
              :disabled="overviewData.settle"
              @click="handleClickReport"
            >
              报表
            </el-button>
            <el-button
              type="primary"
              size="mini"
              :disabled="overviewData.settle"
              @click="handleCompute"
            >
              计算
            </el-button>
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
                  <i class="el-icon-s-platform icon" />
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
          <div class="card staff-container">
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
            <div
              class="content"
              v-loading="$asyncComputed.staffCheckListSeverData.updating"
              v-hidden-scroll
            >
              <div class="top-container">
                <div v-loading="$asyncComputed.overviewServerData.updating">
                  当前月工作总量：{{ overviewData.originalScore }}分
                </div>
              </div>
              <div v-if="staffFlag === 'workPoint' || staffFlag === 'rate'">
                <div class="rank-box" v-hidden-scroll>
                  <div
                    v-for="(i, index) of staffCheckListData"
                    :key="index"
                    class="cell"
                    @click="onGotoStaffDetail(i.id)"
                  >
                    <div class="ranking">{{ index + 1 }}</div>
                    <div class="container">
                      <div class="name">{{ i.name }}</div>
                      <div class="progress el-progress-staff-cell">
                        <el-progress
                          :style="{
                            width: `${i.proportion * 100}%`
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
                        {{ i.correctionScore }}/{{ i.score }}
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
              工作台
            </div>
            <div class="content" v-hidden-scroll>
              <div class="square">
                <div class="square-inner grid">
                  <div v-for="i of workbenchImgSrc" :key="i">
                    <div class="item">
                      <img style="width: 75%; height: 75%" :src="i" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
      <el-dialog
        title="报表"
        :visible.sync="dialogStaffTableVisible"
        width="90%"
        top="10vh"
      >
        <div slot="title" class="dialog-header">
          <div style="width: 40px; color: #606266; font-size: 14px">金额:</div>
          <el-input
            size="mini"
            style="width: 200px"
            placeholder="请输入金额"
            v-model="amount"
            @input="handleAmountChange"
          ></el-input>
          <el-button
            type="primary"
            size="mini"
            style="margin-left: 20px"
            @click="
              exportReport(
                'reportTable',
                overviewData.name + currentDate.$format('YYYY-MM') + '报表.xlsx'
              )
            "
            >导出</el-button
          >
        </div>
        <el-table
          id="reportTable"
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
            property="typeName"
            label="工分项分类"
            min-width="120"
          />
          <el-table-column
            property="workPointName"
            label="工分项"
            min-width="150"
          ></el-table-column>
          <el-table-column
            property="scoreFormat"
            label="项目得分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="scoreTotal"
            label="校正前总分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="rateFormat"
            label="质量系数"
            min-width="100"
          ></el-table-column>
          <el-table-column
            property="afterCorrectionScore"
            label="校正后总分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="extra"
            label="附加分"
            min-width="120"
          ></el-table-column>
          <el-table-column
            property="totalScore"
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

export default {
  name: 'index',
  data() {
    return {
      currentDate: dayjs()
        .startOf('M')
        .toDate(),
      disabledDate: {
        disabledDate(time) {
          return time.getTime() > dayjs().toDate();
        }
      },
      dialogStaffTableVisible: false,
      amount: null,
      originalReportData: [],
      reportData: [],
      reportDataLoading: false,
      spanArr: [],
      categorySpanArr: [],
      deptNameSpanArr: [],
      //员工工作量：workPoint， 质量系数：rate
      staffFlag: 'workPoint',
      medicalIndicatorsIsOpen: false,
      publicIndicatorsIsOpen: false,
      workbenchImgSrc: {
        archives: require('../../../assets/archives.png').default,
        hypertension: require('../../../assets/hypertension.png').default,
        averageDaily: require('../../../assets/averageDaily.png').default,
        elderly: require('../../../assets/elderly.png').default,
        medicalIncome: require('../../../assets/medicalIncome.png').default,
        month: require('../../../assets/month.png').default,
        numberPeople: require('../../../assets/numberPeople.png').default,
        slowDisease: require('../../../assets/slowDisease.png').default,
        diabetes: require('../../../assets/diabetes.png').default
      }
    };
  },
  directives: {
    sticky: VueSticky
  },
  created() {
    this.initParams(this.$route);
  },
  computed: {
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
        .map(it => ({
          ...it,
          rate: it.rate || 1,
          score: Number(it.score?.toFixed(2)) || 0,
          correctionScore: Number((it.score * (it.rate || 1)).toFixed(2)),
          proportion: it.score / (this.staffCheckListSeverData[0].score || 1)
        }))
        .sort((a, b) => b.correctionScore - a.correctionScore);
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

              isLoading: this.$asyncComputed.oldSeverData.updating
            },
            {
              name: '本月医疗收入',
              unit: this.moneySeverData > num ? '万元' : '元',
              number: Number(
                (this.moneySeverData > num
                  ? this.moneySeverData / 10000
                  : this.moneySeverData
                ).toFixed(2)
              ),
              isLoading: this.$asyncComputed.moneySeverData.updating
            },
            {
              name: '本月诊疗人次数',
              unit: this.visitsSeverData > num ? '万人次' : '人次',
              number: Number(
                (this.visitsSeverData > num
                  ? this.visitsSeverData / 10000
                  : this.visitsSeverData
                ).toFixed(2)
              ),
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

              isLoading: this.$asyncComputed.doctorDailyVisitsSeverData.updating
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
              isLoading: this.$asyncComputed.chronicSeverData.updating
            },
            {
              name: '高血压规范管理率',
              number: Number((this.htnSeverData * 100).toFixed(2)),
              unit: '%',
              isLoading: this.$asyncComputed.htnSeverData.updating
            },
            {
              name: '糖尿病规范管理率',
              number: Number((this.t2dmSeverData * 100).toFixed(2)),
              unit: '%',
              isLoading: this.$asyncComputed.t2dmSeverData.updating
            },
            {
              name: '老年人管理率',
              number: Number((this.oldSeverData * 100).toFixed(2)),
              unit: '%',
              isLoading: this.$asyncComputed.oldSeverData.updating
            }
          ]
        }
      ];
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
    staffSeverData: {
      async get() {
        return await this.$api.AppHome.staff();
      },
      default() {
        return 0;
      }
    },
    moneySeverData: {
      async get() {
        return await this.$api.AppHome.money();
      },
      default() {
        return 0;
      }
    },
    visitsSeverData: {
      async get() {
        return await this.$api.AppHome.visits();
      },
      default() {
        return 0;
      }
    },
    doctorDailyVisitsSeverData: {
      async get() {
        return await this.$api.AppHome.doctorDailyVisits();
      },
      default() {
        return 0;
      }
    },
    personSeverData: {
      async get() {
        return await this.$api.AppHome.person();
      },
      default() {
        return 0;
      }
    },
    chronicSeverData: {
      async get() {
        return await this.$api.AppHome.chronic();
      },
      default() {
        return 0;
      }
    },
    htnSeverData: {
      async get() {
        return await this.$api.AppHome.htn();
      },
      default() {
        return 0;
      }
    },
    t2dmSeverData: {
      async get() {
        return await this.$api.AppHome.t2dm();
      },
      default() {
        return 0;
      }
    },
    oldSeverData: {
      async get() {
        return await this.$api.AppHome.old();
      },
      default() {
        return 0;
      }
    }
  },
  watch: {
    reportData: function() {
      // 获取需要合并的数据
      this.spanArr = this.getSpanArr();
      this.categorySpanArr = this.getCategorySpanArr();
      this.deptNameSpanArr = this.getDeptNameSpanArr();
    }
  },
  methods: {
    initParams(route) {
      if (route.query.date)
        this.currentDate = new Date(JSON.parse(route.query.date));
    },
    async handleClickReport() {
      await this.reportDataRequest();
      this.handleReportData();
    },
    async reportDataRequest() {
      this.reportDataLoading = true;
      this.originalReportData = await this.$api.HisHospital.report(
        this.currentDate
      );
      this.reportDataLoading = false;
      this.dialogStaffTableVisible = true;
    },
    // 跳转到员工详情页
    onGotoStaffDetail(id) {
      this.$router.push({
        name: 'personal-appraisal-results',
        query: {
          id: id,
          date: JSON.stringify(this.currentDate)
        }
      });
    },
    // 报表数据处理
    handleReportData() {
      this.originalReportData = this.originalReportData
        .map(it => {
          it.items
            .sort((a, b) => {
              if (a['typeId'] != b['typeId']) {
                return a['typeId']?.localeCompare(b['typeId']);
              }
            })
            //根据order排序
            .sort((a, b) => a.order - b.order);
          return it;
        })
        .sort((a, b) => {
          if (a['deptName'] != b['deptName']) {
            return a['deptName']?.localeCompare(b['deptName']);
          }
        });
      const result = [];
      if (this.originalReportData) {
        // 机构总分
        let organizationScore = 0;
        for (const i of this.originalReportData) {
          // 累加各员工校正后工分
          organizationScore += i.items.reduce(
            (prev, curr) => prev + curr.score * (i.rate || 1),
            0
          );
          // 累加各员工附加分
          organizationScore += i.extra || 0;
          if (i.items.length > 0) {
            // 校正前总工分（所有工分项之和）
            const sumScore = i.items.reduce(
              (prev, curr) => prev + curr.score,
              0
            );
            for (const it of i.items) {
              const item = {};
              item.name = i.name;
              item.deptName = i.deptName;
              item.day = i.day;
              item.rate = i.rate || 1;
              item.rateFormat = Number((item.rate * 100).toFixed(2)) + '%';
              item.extra = i.extra;
              item.workPointName = it.name;
              // 校正前工分（单个工分项）
              item.score = it.score;
              item.scoreFormat = Number(it.score.toFixed(2));
              //校正前总得分
              item.scoreTotal = Number(sumScore.toFixed(2));
              // 校正后总工分
              item.afterCorrectionScore = Number(
                (sumScore * item.rate).toFixed(2)
              );
              // 总得分
              item.totalScore = item.afterCorrectionScore + item.extra;
              item.typeId = it.typeId;
              item.typeName = it.typeName || '-';
              result.push(item);
            }
          } else {
            const item = {};
            item.name = i.name;
            item.deptName = i.deptName;
            item.day = i.day;
            item.rate = i.rate;
            item.rateFormat = item.rate * 100 + '%';
            item.extra = i.extra;
            // 总得分
            item.totalScore = item.extra;
            result.push(item);
          }
        }
        for (const i of result) {
          // 员工总得分在机构中所占比例
          i.proportion = (i.totalScore || 0) / organizationScore;
          // 所得金额
          i.amount = Number((this.amount * i.proportion).toFixed(2));
        }
      }
      this.reportData = result;
    },
    // 金额改变时
    handleAmountChange() {
      // 报表数据更新
      this.handleReportData();
    },
    getSpanArr() {
      let arr = [];
      let pos = 0;
      let index = 0;
      for (let i = 0; i < this.reportData.length; i++) {
        if (i === 0) {
          arr.push(1);
          pos = 0;
          this.reportData[i].nameIndex = index;
        } else {
          // 判断当前元素与上一个元素是否相同
          if (this.reportData[i].name === this.reportData[i - 1].name) {
            arr[pos] += 1;
            arr.push(0);
            this.reportData[i].nameIndex = index;
          } else {
            arr.push(1);
            pos = i;
            index++;
            this.reportData[i].nameIndex = index;
          }
        }
      }
      return arr;
    },
    getCategorySpanArr() {
      let arr = [];
      let pos = 0;
      for (let i = 0; i < this.reportData.length; i++) {
        if (i === 0) {
          arr.push(1);
          pos = 0;
        } else {
          // 判断当前元素与上一个元素是否相同
          if (
            this.reportData[i].name === this.reportData[i - 1].name &&
            this.reportData[i].typeId === this.reportData[i - 1].typeId
          ) {
            arr[pos] += 1;
            arr.push(0);
          } else {
            arr.push(1);
            pos = i;
          }
        }
      }
      return arr;
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
      if (column.property === 'typeName') {
        const _row = this.categorySpanArr[rowIndex];
        const _col = _row > 0 ? 1 : 0;
        return {rowspan: _row, colspan: _col};
      }
      if (column.property === 'deptName') {
        const _row = this.deptNameSpanArr[rowIndex];
        const _col = _row > 0 ? 1 : 0;
        return {rowspan: _row, colspan: _col};
      }
      if (
        column.property !== 'workPointName' &&
        column.property !== 'scoreFormat'
      ) {
        const _row = this.spanArr[rowIndex];
        const _col = _row > 0 ? 1 : 0;
        return {rowspan: _row, colspan: _col};
      }
    },
    // 导出报表
    // id为要导出的table节点id（父节点也可以），title是导出的表格文件名
    exportReport(id, title) {
      // 判断要导出的节点中是否有fixed的表格，如果有，转换excel时先将该dom移除，然后append回去，
      const fix = document.querySelector('.el-table__fixed');
      let wb;
      if (fix) {
        wb = XLSX.utils.table_to_book(
          document.getElementById(id).removeChild(fix)
        );
        document.querySelector(id).appendChild(fix);
      } else {
        wb = XLSX.utils.table_to_book(document.getElementById(id));
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
          margin: 0 40px 30px 0;
          .icon {
            font-size: 36px;
            color: #71a0fd;
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
    }
    .tab-select {
      background: #ffffff;
    }
  }
  .content {
    padding: 10px;
    height: calc(60vh - 80px);
    overflow-y: scroll;
    .top-container {
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 10px;
    }
    .rank-box {
      .cell {
        padding: 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        font-size: 13px;
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
            width: 100px;
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
    padding: 10px;
    height: calc(60vh - 80px);
    overflow-y: scroll;
    .square {
      position: relative;
      width: 100%;
      height: 0;
      padding-bottom: 100%; /* padding百分比是相对父元素宽度计算的 */
    }
    .square-inner {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%; /* 铺满父元素容器，这时候宽高就始终相等了 */
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr); /* 相当于 1fr 1fr 1fr */
      grid-template-rows: repeat(4, 1fr); /* fr单位可以将容器分为几等份 */
      grid-gap: 1px; /* grid-column-gap 和 grid-row-gap的简写 */
      grid-auto-flow: row;
    }
    .grid > div {
      color: #fff;
      line-height: 2;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      .item {
        background: #dae0f2;
        width: 80%;
        height: 80%;
        min-width: 80px;
        min-height: 80px;

        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 20px;
        .icon {
          color: #848dbd;
          font-size: 3.2vw;
        }
      }
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
