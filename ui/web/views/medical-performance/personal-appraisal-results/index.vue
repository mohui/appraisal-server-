<template>
  <div class="wrapper">
    <div>
      <!--顶部表头-->
      <div class="card" v-sticky>
        <span>
          {{ dataSource.name }}
        </span>
        <span> 校正后总得分（分）：{{ dataSource.score }} </span>
        <span> 质量系数：{{ dataSource.rate }}% </span>
      </div>
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="8" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
            <div class="card">
              <div
                id="projectWorkPointPie"
                :style="{width: '100%', height: '460px'}"
              ></div>
            </div>
          </el-col>
          <el-col :span="16" :xs="24" :sm="16" :md="16" :lg="16" :xl="16">
            <div
              class="card"
              style="height: 200px; display: flex; flex-direction: column"
            >
              <div>个人信息</div>
              <el-row :gutter="10" style="height: 100%">
                <el-col
                  v-for="(value, key) in personInfo"
                  :key="key"
                  :span="12"
                  style="padding:  0 8%"
                >
                  <el-row style="margin: 5px; padding: 5px; font-size: 15px">
                    <el-col :span="10" style="color: #323233"
                      >{{ key }}：</el-col
                    >
                    <el-col
                      :span="14"
                      style="color: darkgray; text-align: right"
                      >{{ value }}</el-col
                    >
                  </el-row>
                </el-col>
              </el-row>
            </div>
            <div class="card" style="height: 200px ; margin-top: 20px">
              c
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
    // 项目工分柱状，质量系数折线图
    drawProjectWorkPointBarRateLine() {
      // 基于准备好的dom，初始化echarts实例
      const myChart = this.$echarts.init(
        document.getElementById('projectWorkPointBarRateLine')
      );
      let option;
      option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            // 坐标轴指示器，坐标轴触发有效
            type: 'shadow' // 默认为直线，可选为：'line' | 'shadow'
          }
        },
        legend: {
          data: ['手术', '针灸', '处方'],
          // 设置图例选中状态表
          selected: {
            手术: false,
            针灸: true,
            处方: false
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
            name: '手术',
            data: [50, 70, 65, 78, 85, 47, 60],
            type: 'line'
          },
          {
            name: '针灸',
            data: [56, 77, 55, 68, 85, 77, 50],
            type: 'line'
          },
          {
            name: '处方',
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
  //overflow: hidden;
  color: #303133;
  transition: 0.3s;
  padding: 20px;
}
</style>
