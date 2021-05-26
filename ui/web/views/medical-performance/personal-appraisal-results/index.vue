<template>
  <div class="wrapper">
    <div>
      <!--顶部表头-->
      <div class="card" v-sticky>
        <div class="header">
          <div class="content">
            <div class="item">
              {{ dataSource.name }}
            </div>
            <div class="item">校正后总得分（分）：{{ dataSource.score }}</div>
            <div class="item">质量系数：{{ dataSource.rate }}%</div>
          </div>
          <div>
            <el-button size="small" @click="$router.go(-1)">返回 </el-button>
          </div>
        </div>
      </div>
      {{ workScoreDailyListData }}
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="8" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
            <div class="card">
              <div
                id="projectWorkPointPie"
                :style="{width: '100%', height: '420px'}"
              ></div>
            </div>
          </el-col>
          <el-col :span="16" :xs="24" :sm="16" :md="16" :lg="16" :xl="16">
            <div class="card person-info">
              <div>个人信息</div>
              <el-row :gutter="10" style="height: 100%">
                <el-col
                  v-for="(value, key) in personInfoData"
                  :key="key"
                  :span="12"
                  style="padding:  0 8%"
                >
                  <el-row style="margin: 5px; padding: 5px; font-size: 15px">
                    <el-col :span="10">
                      <div class="name">{{ key }}：</div>
                    </el-col>
                    <el-col :span="14">
                      <div class="value">
                        {{ value }}
                      </div>
                    </el-col>
                  </el-row>
                </el-col>
              </el-row>
            </div>
            <div class="card score-rules">
              <div>得分细则</div>
              <div style="text-align: center;">
                <el-row>
                  <el-col :span="8">
                    <div class="item">
                      <div>校正前工分</div>
                      <div class="content">
                        <el-row :gutter="20">
                          <el-col :span="12" style="">
                            <div style="margin: 15px 0;">自动考核工分项</div>
                            <div>30</div>
                          </el-col>
                          <el-col :span="12" style="">
                            <div style="margin: 15px 0">手动考核工分项</div>
                            <div>20</div>
                          </el-col>
                        </el-row>
                      </div>
                      <div class="more">点击查看</div>
                    </div>
                  </el-col>
                  <el-col :span="16">
                    <el-row>
                      <el-col :span="8" class="item">
                        <div>质量系数</div>
                        <div class="content">80%</div>
                        <div class="more">
                          点击查看
                        </div>
                      </el-col>
                      <el-col :span="8" class="item">
                        <div>校正后工分</div>
                        <div class="content">40</div>
                        <div class="more">点击查看</div>
                      </el-col>
                      <el-col :span="8" class="item">
                        <div>附加分</div>
                        <div class="content">10</div>
                        <div class="more">点击查看</div>
                      </el-col>
                    </el-row>
                  </el-col>
                </el-row>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
      <div class="card" style="height: 300px ; margin-top: 20px">
        <div
          id="projectWorkPointBarRateLine"
          :style="{width: '100%', height: '100%'}"
        ></div>
      </div>
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
      dataSource: {name: '张三', score: 200, rate: 80},
      chartColors: ['#409eff', '#ea9d42', '#9e68f5']
    };
  },
  directives: {
    sticky: VueSticky
  },
  mounted() {
    this.drawChart();
  },
  watch: {
    workScoreListData: function() {
      this.drawProjectWorkPointPie();
    },
    workScoreDailyListData: function() {
      this.drawProjectWorkPointBarRateLine();
    }
  },
  computed: {
    workScoreListData() {
      return this.workScoreListServerData?.items?.map(it => ({
        value: it.score,
        name: it.name
      }));
    },
    workScoreDailyListData() {
      let result = {};
      result.day = this.workScoreDailyListServerData?.map(it =>
        it.day.$format('YYYY-MM-DD')
      );
      const items = this.workScoreDailyListServerData?.map(it => it.items);
      result.items = items;
      return result;
    },
    personInfoData() {
      return this.personInfoServerData;
    }
  },
  asyncComputed: {
    workScoreListServerData: {
      async get() {
        return await this.$api.HisStaff.findWorkScoreList(
          'af637f5c-2711-49ee-a025-42c10659371c',
          dayjs().toDate()
        );
      },
      default: {items: [], rate: 0}
    },
    workScoreDailyListServerData: {
      async get() {
        return await this.$api.HisStaff.findWorkScoreDailyList(
          'af637f5c-2711-49ee-a025-42c10659371c',
          dayjs().toDate()
        );
      },
      default: []
    },
    personInfoServerData: {
      async get() {
        return await this.$api.HisStaff.get(
          'af637f5c-2711-49ee-a025-42c10659371c'
        );
      },
      default: {}
    }
  },
  methods: {
    // 绘制图表
    drawChart() {
      this.drawProjectWorkPointPie();
      this.drawProjectWorkPointBarRateLine();
    },
    // 项目工分饼状图
    drawProjectWorkPointPie() {
      // 基于准备好的dom，初始化echarts实例
      const myChart = this.$echarts.init(
        document.getElementById('projectWorkPointPie')
      );
      let option;
      option = {
        //设置颜色
        color: this.chartColors,
        legend: {
          top: 'bottom'
        },
        series: [
          {
            name: '项目工分值',
            type: 'pie',
            radius: '40%',
            center: ['50%', '40%'],
            label: {
              formatter: '{b|}校正前工分：{c}\n{b|}工分项占比：{d}%',
              backgroundColor: '#F6F8FC',
              borderColor: '#8C8D8E',
              borderWidth: 1,
              borderRadius: 4,
              padding: [0, 5],
              alignTo: 'labelLine',
              rich: {
                b: {
                  fontSize: 14,
                  lineHeight: 23
                }
              }
            },
            roseType: 'area',
            itemStyle: {
              borderRadius: 8
            },
            data: this.workScoreListData
          }
        ]
      };
      // 绘制图表
      myChart.setOption(option);

      // 窗口自适应，表图大小随浏览器窗口的缩放自适应
      window.addEventListener('resize', function() {
        myChart.resize();
      });
    },
    // 项目工分瀑布、质量系数折线混合图
    drawProjectWorkPointBarRateLine() {
      // 基于准备好的dom，初始化echarts实例
      const myChart = this.$echarts.init(
        document.getElementById('projectWorkPointBarRateLine')
      );
      let projects = [];
      // console.log('workScoreDailyListData:', this.workScoreDailyListData);
      for (const item of this.workScoreDailyListData.items) {
        console.log(item);
        for (const it of item) {
          const index = projects.findIndex(p => p.name === it.name);
          console.log(index);
          if (index === -1) {
            projects.push({
              name: it.name,
              score: [it.score],
              auxiliaryDate: [0]
            });
          } else {
            projects[index].auxiliaryDate.push(
              projects[index].score.reduce(function(total, currentValue) {
                return total + currentValue;
              }, 0)
            );
            projects[index].score.push(it.score);
          }
        }
      }
      console.log('projects:', projects);
      let series = [];
      for (const it of projects) {
        console.log('it-------:', it);

        const s = {
          name: it.name,
          type: 'bar',
          stack: it.name,
          label: {
            show: true,
            position: 'top'
          },
          data: it.score
        };
        console.log('s-------:', s);

        const s1 = {
          name: it.name + '辅助',
          type: 'bar',
          stack: it.name,
          itemStyle: {
            barBorderColor: 'rgba(0,0,0,0)',
            color: 'rgba(0,0,0,0)'
          },
          emphasis: {
            itemStyle: {
              barBorderColor: 'rgba(0,0,0,0)',
              color: 'rgba(0,0,0,0)'
            }
          },
          data: it.auxiliaryDate
        };

        console.log('s1-------:', s1);

        series.push(s1, s);
      }
      console.log('series1-------:', series);

      let option;
      option = {
        //设置颜色
        color: this.chartColors,
        tooltip: {
          show: false,
          trigger: 'axis',
          axisPointer: {
            // 坐标轴指示器，坐标轴触发有效
            type: 'shadow' // 默认为直线，可选为：'line' | 'shadow'
          }
        },
        legend: {
          data: projects.map(it => it.name)
          // 设置图例选中状态表
          // selected: {
          //   手术: true,
          //   针灸: false,
          //   处方: false,
          //   质量系数: true
          // }
        },
        xAxis: {
          type: 'category',
          data: this.workScoreDailyListData.day
        },
        yAxis: [
          {
            type: 'value',
            name: '工分',
            axisLabel: {
              formatter: '{value}分'
            }
          },
          {
            type: 'value',
            name: '质量系数',
            min: 0,
            max: 100,
            axisLabel: {
              formatter: '{value}%'
            }
          }
        ],
        series: series
      };
      myChart.setOption(option);
    }
  }
};
</script>

<style scoped lang="scss">
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
.card {
  border-radius: 4px;
  border: 1px solid #ebeef5;
  background-color: #ffffff;
  color: #303133;
  transition: 0.3s;
  padding: 20px;
}

.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  .content {
    display: flex;
    flex-direction: row;
    .item {
      margin-right: 20px;
    }
  }
}

.person-info {
  height: 180px;
  display: flex;
  flex-direction: column;
  .name,
  .value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name {
    color: #323233;
  }
  .value {
    color: darkgray;
    text-align: right;
  }
}

.score-rules {
  height: 180px;
  margin-top: 20px;
  .item {
    height: 180px;
    display: flex;
    flex-direction: column;
    .content {
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .more {
      height: 30px;
      padding: 10px 0;
    }
  }
}
</style>
