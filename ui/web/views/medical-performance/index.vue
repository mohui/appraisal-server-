<template>
  <div class="wrapper">
    <div>
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
      <div>
        <el-row :gutter="10" style="margin: 10px -5px 0;">
          <el-col
            :span="10"
            :xs="24"
            :sm="10"
            :md="10"
            :lg="10"
            :xl="10"
            style="margin-bottom: 10px;"
          >
            <el-card
              shadow="hover"
              v-loading="$asyncComputed.overviewServerData.updating"
            >
              <el-col :span="12" :xs="24">
                <div
                  class="score-detail"
                  :style="{height: $settings.isMobile ? '200px' : '300px'}"
                >
                  <div class="total-score-title">总分</div>
                  <div class="total-score">
                    {{ overviewData.correctScore }}
                  </div>
                  <div>校正后</div>
                  <div class="before-correction">
                    校正前工分: {{ overviewData.originalScore }}
                  </div>
                </div>
              </el-col>
              <el-col :span="12" :xs="24">
                <div>
                  <div
                    id="rateGauge"
                    :style="{width: '100%', height: '300px'}"
                  ></div>
                </div>
              </el-col>
            </el-card>
          </el-col>
          <el-col
            :span="14"
            :xs="24"
            :sm="14"
            :md="14"
            :lg="14"
            :xl="14"
            style="margin-bottom: 10px;"
          >
            <el-card
              shadow="hover"
              v-loading="$asyncComputed.staffCheckListSeverData.updating"
            >
              <div
                id="doctorPerformanceBar"
                :style="{width: '100%', height: '300px'}"
              ></div>
            </el-card>
          </el-col>
        </el-row>
      </div>
      <el-card
        shadow="hover"
        v-loading="$asyncComputed.workScoreListSeverData.updating"
      >
        <div
          id="projectPerformanceBar"
          :style="{width: '100%', height: '400px'}"
        ></div>
      </el-card>
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
      chartColors: [
        '#409eff',
        '#ea9d42',
        '#9e68f5',
        '#5470c6',
        '#91cc75',
        '#fac858',
        '#ee6666',
        '#73c0de',
        '#3ba272',
        '#fc8452',
        '#9a60b4',
        '#ea7ccc'
      ]
    };
  },
  directives: {
    sticky: VueSticky
  },
  mounted() {
    this.drawChart();
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
    workScoreListData() {
      return this.workScoreListSeverData?.map(it => ({
        ...it,
        score: Number(it.score?.toFixed(2)) || 0
      }));
    },
    staffCheckListData() {
      return this.staffCheckListSeverData?.map(it => ({
        ...it,
        score: Number(it.score?.toFixed(2)) || 0
      }));
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
    workScoreListSeverData: {
      async get() {
        return await this.$api.HisHospital.findWorkScoreList(this.currentDate);
      },
      default() {
        return [];
      }
    },
    staffCheckListSeverData: {
      async get() {
        return await this.$api.HisHospital.findStaffCheckList(this.currentDate);
      },
      default() {
        return [];
      }
    }
  },
  watch: {
    workScoreListData: function() {
      this.drawProjectPerformanceBar();
    },
    staffCheckListData: function() {
      this.drawDoctorPerformanceBar();
    },
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
              item.rateFormat = item.rate * 100 + '%';
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
        this.$message.success('计算完成');
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
    // 绘制图表
    drawChart() {
      this.drawRateGauge();
      this.drawDoctorPerformanceBar();
      this.drawProjectPerformanceBar();
    },
    // 质量系数仪表盘图
    drawRateGauge() {
      // 基于准备好的dom，初始化echarts实例
      const myChart = this.$echarts.init(document.getElementById('rateGauge'));
      let option;
      const color = '#409EFF';
      const value = this.overviewData.rate;
      option = {
        series: [
          {
            type: 'gauge',
            radius: '90%',
            center: ['50%', '65%'],
            startAngle: 180,
            endAngle: 0,
            min: 0,
            max: 100,
            splitNumber: 2,
            itemStyle: {
              color: color
            },
            progress: {
              show: true,
              width: 30
            },

            axisTick: {show: false},

            pointer: {
              show: false
            },
            axisLine: {
              lineStyle: {
                width: 30,
                color: [
                  [value / 100, color],
                  [1, '#f6f7fa']
                ]
              }
            },
            splitLine: {
              show: false
            },
            axisLabel: {
              distance: 10,
              color: '#999',
              fontSize: 15
            },
            anchor: {
              show: false
            },
            title: {
              show: false
            },
            detail: {
              show: true,
              valueAnimation: true,
              offsetCenter: [0, '-15%'],
              fontSize: 25,
              fontWeight: 'bolder',
              formatter: '{value}%',
              color: 'auto'
            },
            data: [
              {
                value: value
              }
            ]
          }
        ]
      };
      // 绘制图表
      myChart.setOption(option);
    },
    // 医生绩效柱状图
    drawDoctorPerformanceBar() {
      const doctorData = this.staffCheckListData;
      // 基于准备好的dom，初始化echarts实例
      const myChart = this.$echarts.init(
        document.getElementById('doctorPerformanceBar')
      );
      let option;
      const colors = this.chartColors;
      option = {
        color: colors,
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        grid: {
          right: '20%'
        },
        legend: {
          data: ['人员得分', '质量系数']
        },
        dataZoom: [
          {
            show: true
          },
          {
            type: 'inside',
            zoomOnMouseWheel: 'ctrl'
          }
        ],
        xAxis: [
          {
            type: 'category',
            triggerEvent: true,
            axisTick: {
              alignWithLabel: true
            },
            data: doctorData.map(it => it.name)
          }
        ],
        yAxis: [
          {
            type: 'value',
            name: '人员得分',
            min: 0,
            position: 'right',
            axisLine: {
              show: true,
              lineStyle: {
                color: colors[0]
              }
            },
            axisLabel: {
              formatter: '{value} 分'
            }
          },
          {
            type: 'value',
            name: '质量系数（%）',
            min: 0,
            max: 100,
            axisLine: {
              show: true,
              lineStyle: {
                color: colors[1]
              }
            },
            axisLabel: {
              formatter: '{value}'
            }
          }
        ],
        series: [
          {
            name: '人员得分',
            type: 'bar',
            yAxisIndex: 0,
            data: doctorData.map(it => it.score)
          },
          {
            name: '质量系数',
            type: 'bar',
            yAxisIndex: 1,
            data: doctorData.map(it => Number((it.rate * 100).toFixed(2)))
          }
        ]
      };

      // 绘制图表
      myChart.setOption(option);

      // 表格的点击事件添加路由跳转
      myChart.on('click', params => {
        let id = '';
        if (params.componentType === 'series') {
          id = this.staffCheckListData[params.dataIndex].id;
        } else if (params.componentType === 'xAxis') {
          const anId = params.event.target.anid;
          let strArr = anId.split('_');
          const index = strArr[strArr.length - 1];
          id = this.staffCheckListData[index].id;
          console.log('id:', id);
        }
        if (id) {
          this.$router.push({
            name: 'personal-appraisal-results',
            query: {
              id: id,
              date: JSON.stringify(this.currentDate)
            }
          });
        }
      });
    },
    // 项目绩效柱状图
    drawProjectPerformanceBar() {
      const myChart = this.$echarts.init(
        document.getElementById('projectPerformanceBar')
      );
      let option;
      option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['项目实际得分', '项目应得分']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        dataZoom: [
          {
            show: true,
            yAxisIndex: 0,
            left: '0%'
          },
          {
            type: 'inside',
            yAxisIndex: 0,
            zoomOnMouseWheel: 'ctrl'
          }
        ],
        xAxis: {
          type: 'value',
          boundaryGap: [0, 0.01],
          axisLine: {
            show: true
          }
        },
        yAxis: {
          type: 'category',
          data: this.workScoreListData.map(it => it.name),
          axisTick: {
            alignWithLabel: true
          }
        },
        series: [
          {
            name: '项目应得分',
            type: 'bar',
            data: this.workScoreListData.map(it => it.score),
            itemStyle: {
              color: 'rgba(64, 158, 255, 0.3)'
            }
          },
          {
            name: '项目实际得分',
            type: 'bar',
            data: this.workScoreListData.map(it =>
              Number((it.score * this.overviewData.rate).toFixed(2))
            ),
            itemStyle: {
              color: this.chartColors[0]
            },
            barGap: '-100%'
          }
        ]
      };
      myChart.setOption(option);
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
  margin-bottom: -10px;
  & > div {
    margin: 0 20px 10px 0;
    float: left;
  }
  .right {
    float: right;
    margin-right: 0;
  }
  .header-title {
    font: bold 20px/1.4 Arial;
    color: $color-primary;
  }
}

.score-detail {
  height: 300px;
  font-size: 15px;
  text-align: center;
  .total-score-title {
    font-size: 22px;
    margin: 20px 10px;
    padding-top: 50px;
  }
  .total-score {
    font-size: 26px;
    color: $color-primary;
    margin: 10px;
    font-weight: bold;
  }
  .before-correction {
    color: darkgray;
    font-size: 15px;
    margin: 10px;
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
