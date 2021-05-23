<template>
  <div class="wrapper">
    <div>
      <!--顶部表头-->
      <el-card v-sticky shadow="never">
        <div class="header">
          <div class="header-title">
            中心绩效考核
          </div>
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
            style="margin-left: 20px"
            @click="
              $router.push({
                name: 'check-project'
              })
            "
            >手动考核</el-button
          >
        </div>
      </el-card>
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="10" :xs="24" :sm="10" :md="10" :lg="10" :xl="10">
            <el-card shadow="hover">
              <el-col :span="12">
                <div class="score-detail">
                  <div class="total-score-title">总分</div>
                  <div class="total-score">
                    {{ dataSource.afterCorrectionWorkPoint }}
                  </div>
                  <div>校正后</div>
                  <div class="before-correction">
                    校正前工分: {{ dataSource.beforeCorrectionWorkPoint }}
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
            <el-card shadow="hover">
              <div
                id="doctorPerformanceBar"
                :style="{width: '100%', height: '300px'}"
              ></div>
            </el-card>
          </el-col>
        </el-row>
      </div>
      <el-card shadow="hover">
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
      currentDate: dayjs().toDate(),
      disabledDate: {
        disabledDate(time) {
          return time.getTime() > dayjs().toDate();
        }
      },
      dataSource: {
        beforeCorrectionWorkPoint: 30000,
        afterCorrectionWorkPoint: 25000,
        rate: 56,
        doctorData: [
          {name: '医生1', score: 30, rate: 0.8},
          {name: '医生2', score: 70, rate: 0.5},
          {name: '医生3', score: 50, rate: 0.7},
          {name: '医生4', score: 60, rate: 0.6},
          {name: '医生5', score: 90, rate: 0.6},
          {name: '医生6', score: 50, rate: 0.9},
          {name: '医生7', score: 70, rate: 0.4},
          {name: '医生8', score: 30, rate: 0.8},
          {name: '医生9', score: 70, rate: 0.5},
          {name: '医生10', score: 50, rate: 0.7}
        ],
        projectData: [
          {
            name: '项目1',
            afterCorrectionWorkPoint: 245,
            beforeCorrectionWorkPoint: 300
          },
          {
            name: '项目2',
            afterCorrectionWorkPoint: 344,
            beforeCorrectionWorkPoint: 397
          },
          {
            name: '项目3',
            afterCorrectionWorkPoint: 200,
            beforeCorrectionWorkPoint: 240
          },
          {
            name: '项目4',
            afterCorrectionWorkPoint: 234,
            beforeCorrectionWorkPoint: 435
          },
          {
            name: '项目5',
            afterCorrectionWorkPoint: 353,
            beforeCorrectionWorkPoint: 360
          },
          {
            name: '项目6',
            afterCorrectionWorkPoint: 459,
            beforeCorrectionWorkPoint: 633
          },
          {
            name: '项目7',
            afterCorrectionWorkPoint: 330,
            beforeCorrectionWorkPoint: 330
          },
          {
            name: '项目8',
            afterCorrectionWorkPoint: 330,
            beforeCorrectionWorkPoint: 330
          },
          {
            name: '项目9',
            afterCorrectionWorkPoint: 245,
            beforeCorrectionWorkPoint: 300
          },
          {
            name: '项目10',
            afterCorrectionWorkPoint: 344,
            beforeCorrectionWorkPoint: 397
          }
        ]
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
  methods: {
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
      const value = 55;
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
            axisTick: {
              alignWithLabel: true
            },
            data: this.dataSource.doctorData.map(it => it.name)
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
            name: '质量系数',
            min: 0,
            max: 1,
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
            data: this.dataSource.doctorData.map(it => it.score)
          },
          {
            name: '质量系数',
            type: 'bar',
            yAxisIndex: 1,
            data: this.dataSource.doctorData.map(it => it.rate)
          }
        ]
      };

      // 绘制图表
      myChart.setOption(option);

      // 表格的点击事件添加路由跳转
      myChart.on('click', params => {
        console.log(params);
        this.$router.push({
          name: 'personal-appraisal-results',
          query: {
            name: params.name
          }
        });
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
          data: this.dataSource.projectData.map(it => it.name)
        },
        series: [
          {
            name: '项目应得分',
            type: 'bar',
            data: this.dataSource.projectData.map(
              it => it.beforeCorrectionWorkPoint
            ),
            itemStyle: {
              color: 'rgba(180, 180, 180, 0.3)'
            }
          },
          {
            name: '项目实际得分',
            type: 'bar',
            data: this.dataSource.projectData.map(
              it => it.afterCorrectionWorkPoint
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
