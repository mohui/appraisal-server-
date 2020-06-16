<template>
  <div>
    <div class="grid-content bg-fff">
      <div id="barChart" :style="{width: '100%', height: '300px'}"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'twocardBar',
  props: {
    barxAxisData: Array,
    baryAxisData: Array
  },
  data() {
    return {
      barOption: {
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            return params[0].axisValue + '</br>' + params[0].data + '分';
          }
        },
        title: {
          show: true,
          text: '工分值信息',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: 'rgb(64, 158, 255)'
          },
          top: '10px',
          left: '5px'
        },
        grid: {
          top: 80,
          left: 60
        },
        color: 'rgb(64, 158, 255)',
        legend: {
          data: ['工分值'],
          left: '80%',
          top: '15%'
        },
        calculable: true,
        xAxis: [
          {
            type: 'category',
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
              margin: 5,
              formatter: function(value) {
                return value + '分';
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
            type: 'bar',
            name: '工分值',
            barWidth: '20%',
            data: [],
            itemStyle: {
              normal: {
                label: {
                  show: true, //开启显示
                  position: 'top', //在上方显示
                  formatter: '{c}分',
                  textStyle: {
                    //数值样式
                    color: 'black',
                    fontSize: 12
                  }
                }
              }
            }
          }
        ]
      }
    };
  },
  mounted() {
    this.barChart();
  },
  methods: {
    barChart() {
      this.barOption.xAxis[0].data = this.barxAxisData;
      this.barOption.series[0].data = this.baryAxisData;
      let chart = this.$echarts.init(document.getElementById('barChart'));
      window.addEventListener('resize', function() {
        chart.resize(); //使图表适应
      });
      chart.setOption(this.barOption);
    }
  },
  watch: {
    baryAxisData: function() {
      this.barChart();
    }
  }
};
</script>

<style scoped></style>
