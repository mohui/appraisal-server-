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
                  v-for="(value, key) in personInfo"
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

export default {
  name: 'index',
  data() {
    return {
      dataSource: {name: '张三', score: 200, rate: 80},
      personInfo: {
        name: '张三',
        gender: '男',
        birth: '1993-03-01',
        idCard: '4305353199303016567',
        empNo: '4235',
        department: '门诊部',
        tel: '4305353199303016567',
        medicareNo: '340608083803'
      }
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
        color: ['#409eff', '#ea9d42', '#9e68f5'],
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
            data: [
              {value: 40, name: '手术'},
              {value: 38, name: '针灸'},
              {value: 32, name: '处方'}
            ]
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
      let option;
      option = {
        //设置颜色
        color: ['#409eff', '#ea9d42', '#9e68f5'],
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            // 坐标轴指示器，坐标轴触发有效
            type: 'shadow' // 默认为直线，可选为：'line' | 'shadow'
          }
        },
        legend: {
          data: [
            '手术',
            '针灸',
            '处方',
            '手术质量系数',
            '针灸质量系数',
            '处方质量系数'
          ],
          // 设置图例选中状态表
          selected: {
            手术: true,
            针灸: false,
            处方: false,
            手术质量系数: true,
            针灸质量系数: false,
            处方质量系数: false
          }
        },
        xAxis: {
          type: 'category',
          data: ['10-01', '10-02', '10-03', '10-04', '10-05', '10-06', '10-07']
        },
        yAxis: [
          {
            type: 'value',
            name: '质量系数',
            axisLabel: {
              formatter: '质量系数：{value}%'
            }
          },
          {
            type: 'value',
            name: '工分',
            axisLabel: {
              formatter: '工分：{value}'
            }
          }
        ],
        series: [
          {
            name: '手术辅助',
            type: 'bar',
            yAxisIndex: 1,
            stack: '手术',
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
            data: [0, 900, 1000, 1300, 1500, 1700, 1800]
          },
          {
            name: '手术',
            type: 'bar',
            yAxisIndex: 1,
            stack: '手术',
            label: {
              show: true,
              position: 'top'
            },
            data: [900, 100, 300, 200, 200, 100, 500]
          },
          {
            name: '针灸辅助',
            type: 'bar',
            yAxisIndex: 1,
            stack: '针灸',
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
            data: [0, 400, 500, 800, 1100, 1500, 1700]
          },
          {
            name: '针灸',
            type: 'bar',
            yAxisIndex: 1,
            stack: '针灸',
            label: {
              show: true,
              position: 'top'
            },
            data: [400, 100, 300, 300, 400, 200, 300]
          },
          {
            name: '处方辅助',
            type: 'bar',
            yAxisIndex: 1,
            stack: '处方',
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
            data: [0, 200, 300, 600, 800, 1000, 1100]
          },
          {
            name: '处方',
            type: 'bar',
            yAxisIndex: 1,
            stack: '处方',
            label: {
              show: true,
              position: 'top'
            },
            data: [200, 100, 300, 200, 200, 100, 200]
          },

          {
            name: '手术质量系数',
            data: [50, 70, 65, 78, 85, 47, 60],
            type: 'line'
          },
          {
            name: '针灸质量系数',
            data: [56, 77, 55, 68, 85, 77, 50],
            type: 'line'
          },
          {
            name: '处方质量系数',
            data: [66, 67, 75, 34, 57, 74, 85],
            type: 'line'
          }
        ]
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
