<template>
  <div class="wrapper">
    <div>
      <!--顶部表头-->
      <el-card v-sticky shadow="never">
        <span class="header-title">
          中心绩效考核
        </span>

        <el-button
          type="primary"
          size="mini"
          @click="
            $router.push({
              name: 'check-project'
            })
          "
          >手动考核</el-button
        >
      </el-card>
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="8" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
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
                  <two-card-circle
                    :coefficient="dataSource.rate"
                  ></two-card-circle>
                </div>
              </el-col>
            </el-card>
          </el-col>
          <el-col :span="16" :xs="24" :sm="16" :md="16" :lg="16" :xl="16">
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
import twoCardCircle from '../appraisal-result/components/twocardCircle';

export default {
  name: 'index',
  data() {
    return {
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
      }
    };
  },
  components: {
    twoCardCircle
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
      this.drawDoctorPerformanceBar();
      this.drawProjectPerformanceBar();
    },
    // 医生绩效柱状图
    drawDoctorPerformanceBar() {
      // 基于准备好的dom，初始化echarts实例
      const myChart = this.$echarts.init(
        document.getElementById('doctorPerformanceBar')
      );
      let option;
      const colors = ['#409eff', '#ea9d42'];
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
              color: '#409eff'
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

.header-title {
  font: bold 20px/2 Arial;
  color: $color-primary;
  margin-right: 10px;
}

.score-detail {
  height: 300px;
  font-size: 15px;
  text-align: center;
  .total-score-title {
    font-size: 22px;
    margin: 10px;
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
