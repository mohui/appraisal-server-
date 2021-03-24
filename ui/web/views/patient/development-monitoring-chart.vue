<template>
  <div style="height: 100%">
    <el-card
      class="box-card"
      style="height: 100%"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header">
        <span>生长发育监测图</span>
        <el-button
          style="float: right; margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div
        style="flex-grow: 1; height: 0; overflow-y: auto;"
        v-loading="isLoading"
      >
        <el-row type="flex" justify="space-between" class="record-head">
          <el-col :span="6">
            姓名：<strong>{{ detailData.childName }}</strong>
          </el-col>
          <el-col :span="6">编号：{{ code }}</el-col>
        </el-row>
        <div ref="main" :style="{width: '85%', height: '90%'}"></div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'development-monitoring-chart',
  data() {
    return {
      code: null,
      detailData: {
        childName: '',
        date: {weights: [], heights: []}
      },
      isLoading: false
    };
  },
  mounted() {
    this.drawChart();
  },
  async created() {
    this.code = this.$route.query.id;
    this.isLoading = true;
    // 获取数据
    const detailServerData = await this.$api.Person.developmentMonitoring(
      this.code
    );
    let childName = '';
    if (detailServerData.length === 0)
      return {
        childName: childName,
        date: {weights: [], heights: []}
      };
    const weights = detailServerData.map(it => {
      return [Number(it.chronologicalage), Number(it.weight)];
    });
    const heights = detailServerData.map(it => {
      return [Number(it.chronologicalage), Number(it.height)];
    });
    childName = detailServerData[0].childname;
    this.detailData = {
      childName: childName,
      date: {weights: weights, heights: heights}
    };
    this.isLoading = false;
    // 重新渲染图表
    this.drawChart();
  },
  methods: {
    drawChart() {
      // 基于准备好的dom，初始化echarts实例
      let myChart = this.$echarts.init(this.$refs['main']);
      // 指定图表的配置项和数据
      let option = {
        tooltip: {
          trigger: 'none',
          axisPointer: {
            type: 'cross'
          }
        },
        xAxis: {
          name: '月龄(月)',
          type: 'value',
          interval: 2,
          max: 36,
          axisPointer: {
            label: {
              formatter: function(params) {
                return '月龄：' + params.value.toFixed(0) + '个月';
              }
            }
          }
        },
        yAxis: [
          {
            name: '身长/身高(cm)',
            type: 'value',
            interval: 5,
            axisPointer: {
              label: {
                formatter: function(params) {
                  return '身长/身高：' + params.value.toFixed(2) + 'cm';
                }
              }
            }
          },
          {
            name: '体重(kg)',
            interval: 2,
            type: 'value',
            axisPointer: {
              label: {
                formatter: function(params) {
                  return '体重：' + params.value.toFixed(2) + 'kg';
                }
              }
            }
          }
        ],
        series: [
          {
            name: '身高',
            data: this.detailData.date.heights,
            type: 'line',
            smooth: true,
            yAxisIndex: 0
          },
          {
            name: '体重',
            data: this.detailData.date.weights,
            type: 'line',
            smooth: true,
            yAxisIndex: 1 // 通过这个判断左右
          }
        ],
        legend: {
          show: true
        }
      };

      // 使用刚指定的配置项和数据显示图表。
      myChart.setOption(option);
    }
  }
};
</script>

<style scoped></style>
