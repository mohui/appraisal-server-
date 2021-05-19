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
            <div class="card" style="height: 200px">
              b
            </div>
            <div class="card" style="height: 200px ; margin-top: 20px">
              c
            </div>
          </el-col>
        </el-row>
      </div>
      <div class="card" style="height: 300px ; margin-top: 20px">
        d
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
      dataSource: {name: '张三', score: 200, rate: 80}
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
            radius: '50%',
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
