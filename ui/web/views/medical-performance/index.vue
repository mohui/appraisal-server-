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
              type="month"
              placeholder="选择月"
              :picker-options="disabledDate"
            >
            </el-date-picker>
          </div>
          <el-button
            type="primary"
            size="mini"
            :disabled="overviewData.settle"
            style="margin-left: 20px"
            @click="handleSettle()"
            >{{ overviewData.settle ? '结果解冻' : '结果冻结' }}</el-button
          >
        </div>
      </el-card>
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="10" :xs="24" :sm="10" :md="10" :lg="10" :xl="10">
            <el-card
              shadow="hover"
              v-loading="$asyncComputed.overviewServerData.updating"
            >
              <el-col :span="12">
                <div class="score-detail">
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
              <el-col :span="12">
                <div>
                  <div
                    id="rateGauge"
                    :style="{width: '100%', height: '300px'}"
                  ></div>
                </div>
              </el-col>
            </el-card>
          </el-col>
          <el-col :span="14" :xs="24" :sm="14" :md="14" :lg="14" :xl="14">
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
    </div>
  </div>
</template>

<script>
import VueSticky from 'vue-sticky';
import * as dayjs from 'dayjs';

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
      chartColors: ['#409eff', '#ea9d42', '#9e68f5']
    };
  },
  directives: {
    sticky: VueSticky
  },
  mounted() {
    this.drawChart();
  },
  computed: {
    overviewData() {
      return {
        ...this.overviewServerData,
        rate: this.overviewServerData.correctScore
          ? this.overviewServerData.correctScore /
            this.overviewServerData.originalScore
          : 0
      };
    },
    workScoreListData() {
      return this.workScoreListSeverData;
    },
    staffCheckListData() {
      return this.staffCheckListSeverData;
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
    }
  },
  methods: {
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
            show: true,
            start: 0,
            end: 50
          },
          {
            type: 'inside'
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
            data: doctorData.map(it => (it.rate * 100).toFixed(2))
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
            left: '0%',
            startValue: 0,
            endValue: 6
          },
          {
            type: 'inside',
            yAxisIndex: 0
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
          data: this.workScoreListData.map(it => it.name)
        },
        series: [
          {
            name: '项目应得分',
            type: 'bar',
            data: this.workScoreListData.map(it => it.score),
            itemStyle: {
              color: 'rgba(180, 180, 180, 0.3)'
            }
          },
          {
            name: '项目实际得分',
            type: 'bar',
            data: this.workScoreListData.map(
              it => it.score * this.overviewData.rate
            ),
            itemStyle: {
              color: this.chartColors[0]
            },
            barGap: '-100%'
          }
        ]
      };
      myChart.setOption(option);
    }
  }
};
</script>

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
  display: flex;
  flex-direction: row;
  .header-title {
    font: bold 20px/2 Arial;
    color: $color-primary;
    margin-right: 10px;
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
    font-size: 22px;
    color: $color-primary;
    margin: 10px;
  }
  .before-correction {
    color: darkgray;
    font-size: 12px;
    margin: 10px;
  }
}
</style>
