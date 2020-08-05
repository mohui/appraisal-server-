<template>
  <div style="height: 100%; width: 100%;">
    <div ref="scoreBar" :style="{width: '100%', height: '100%'}"></div>
  </div>
</template>

<script>
export default {
  name: 'scoreBar',
  props: {
    barData: Array,
    emptyText: {
      type: String,
      default() {
        return '暂无数据';
      }
    },
    color: {
      type: Array,
      default() {
        return [];
      }
    }
  },
  data() {
    return {
      chart: {},
      option: {
        grid: [
          {
            top: 40,
            left: 40,
            right: 20,
            bottom: 140
          },
          {
            bottom: 50
          }
        ],
        legend: {
          show: false
        },
        tooltip: {
          trigger: 'axis',
          formatter: (comp, value) => {
            const [serie] = comp;

            return `${serie.seriesName} ${serie.name}: 难度系数 ${Math.round(
              serie.value
            )} `;
          },
          axisPointer: {
            show: true,
            status: 'shadow',
            z: -1,
            shadowStyle: {
              color: '#E6F7FF'
            },
            type: 'shadow'
          }
        },
        xAxis: [
          {
            position: 'bottom',
            type: 'category',
            axisLine: {
              show: true,
              lineStyle: {
                color: '#ECF1F6'
              }
            },
            axisTick: {
              show: false
            },
            axisLabel: {
              show: true,
              rotate: 45,
              fontSize: 12,
              color: '#3A3A3C'
            },
            splitLine: {
              show: true,
              lineStyle: {
                color: ['#ECF1F6', '#ECF1F6'],
                width: 0,
                type: 'dashed'
              }
            },
            gridIndex: 0,
            data: []
          },
          {
            type: 'category',
            gridIndex: 1,
            show: false
          }
        ],
        yAxis: [
          {
            type: 'value',
            position: 'left',
            axisLine: {
              show: false
            },
            axisTick: {
              show: false
            },
            axisLabel: {
              show: true,
              rotate: 0,
              fontSize: 12,
              color: '#6E7D9C'
            },
            splitLine: {
              show: true,
              lineStyle: {
                color: ['#ECF1F6', '#ECF1F6'],
                width: 1,
                type: 'solid'
              }
            },
            gridIndex: 0
          },
          {
            gridIndex: 1,
            min: 0,
            max: 1,
            show: false
          }
        ],
        series: [
          {
            name: '底部backdrop',
            xAxisIndex: 1,
            yAxisIndex: 1,
            type: 'bar',
            data: [1, 1, 1, 1, 1, 1, 1, 1].map(value => {
              return {
                value,
                itemStyle: {
                  color: 'transparent'
                }
              };
            }),
            barMaxWidth: '100%',
            silent: true,
            z: 2
          },
          {
            name: '工分项',
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
              color: '#43A7FF'
            },
            type: 'bar',
            data: [0.3, 0.4, 0.5, 0.8, 0.7, 0.7, 0.5, 0.8],
            barMaxWidth: '20%',
            z: 3
          }
        ]
      }
    };
  },
  mounted() {
    this.chart = this.$echarts.init(this.$refs['scoreBar']);
    this.updataChart();
    window.addEventListener('resize', this.chart.resize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.chart.resize);
  },
  methods: {
    updataChart() {
      this.option.xAxis[0].data = this.barData.map(it => it.name);
      this.option.series[1].data = this.barData.map(it => it.value);
      if (this.color.length > 0) {
        this.option.color = this.color;
      }
      this.chart.setOption(this.option);
      console.log(JSON.stringify(this.option));
    }
  },
  watch: {
    barData: function() {
      this.updataChart();
    }
  }
};
</script>

<style scoped></style>
