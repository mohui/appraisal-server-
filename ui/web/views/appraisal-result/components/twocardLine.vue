<template>
  <div>
    <div class="grid-content bg-fff">
      <div id="lineChart" :style="{width: '100%', height: '300px'}"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'twocardLine',
  props: {
    xAxisData: Array,
    yAxisData: Array,
    lineText: String,
    listFlag: String
  },
  data() {
    let that = this;
    return {
      lineOption: {
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            if (
              that.listFlag === 'coefficient' ||
              that.listFlag === 'quality'
            ) {
              return params[0].axisValue + '</br>' + params[0].data + '%';
            } else if (that.listFlag === 'score') {
              return params[0].axisValue + '</br>' + params[0].data + '分';
            }
          }
        },
        title: {
          show: true,
          text: '历史趋势',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bolder',
            color: '#409EFF'
          },
          top: '0px',
          left: '5px'
        },
        grid: {
          top: 80
        },
        color: '#409EFF',
        legend: {
          data: [],
          left: '85%',
          top: '10%',
          textStyle: {
            //图例文字的样式
            fontSize: 14
          },
          icon: 'circle',
          itemHeight: 15 //改变圆圈大小
        },
        calculable: true,
        xAxis: [
          {
            type: 'category',
            boundaryGap: false,
            splitLine: {
              //设置网格线，写在哪个轴就是哪个轴的网格线
              show: true,
              lineStyle: {
                type: 'dotted',
                color: '#eee'
              }
            },
            data: []
          }
        ],
        yAxis: [
          {
            type: 'value',
            axisLabel: {
              formatter: function(value) {
                if (
                  that.listFlag === 'coefficient' ||
                  that.listFlag === 'quality'
                ) {
                  return value + '%';
                } else if (that.listFlag === 'score') {
                  return value + '分';
                }
              }
            },
            splitLine: {
              //设置网格线，写在哪个轴就是哪个轴的网格线
              show: true,
              lineStyle: {
                type: 'dotted',
                color: '#eee'
              }
            }
          }
        ],
        series: [
          {
            type: 'line',
            name: '质量系数',
            smooth: true,
            symbolSize: 10,
            itemStyle: {
              //折线的样式设置
              normal: {
                lineStyle: {
                  //折线线条的设置
                  color: '#409EFF',
                  width: 3 //折线的线条宽度
                }
              }
            },
            data: []
          }
        ]
      }
    };
  },
  mounted() {
    this.lineChart();
  },
  methods: {
    lineChart() {
      if (this.listFlag === 'coefficient') {
        this.lineOption.legend.data = ['质量系数'];
      } else if (this.listFlag === 'score') {
        this.lineOption.legend.data = ['工分值'];
      }
      this.lineOption.xAxis[0].data = this.xAxisData;
      this.lineOption.series[0].data = this.yAxisData;
      let chart = this.$echarts.init(document.getElementById('lineChart'));
      window.addEventListener('resize', function() {
        chart.resize(); //使图表适应
      });
      chart.setOption(this.lineOption);
    }
  },
  watch: {
    yAxisData: function() {
      this.lineChart();
    }
  }
};
</script>

<style scoped></style>
