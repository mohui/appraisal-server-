<template>
  <div style="height: 100%; width: 100%;">
    <div ref="scoreBar" :style="{width: '100%', height: '100%'}"></div>
  </div>
</template>

<script>
export default {
  name: 'doctorBar',
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
            top: 20,
            left: 80,
            right: 20,
            bottom: 80
          }
        ],
        legend: {
          show: false
        },
        tooltip: {
          trigger: 'axis',
          formatter: comp => {
            const [serie] = comp;
            return `${serie.name}: ${serie.value} `;
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
        yAxis: [
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
        xAxis: [
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
              color: '#6E7D9C',
              // 使用函数模板，函数参数分别为刻度数值（类目），刻度的索引
              formatter: function(value) {
                let text = value;
                if (value >= 10000) {
                  text = `${value / 10000}万`;
                }
                return text;
              }
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
            xAxisIndex: 0,
            yAxisIndex: 0,
            itemStyle: {
              color: '#5168f6',
              borderRadius: 2
            },
            type: 'bar',
            data: [],
            barWidth: '15',
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
      this.option.yAxis[0].data = this.barData.map(it => it.name);
      this.option.series[0].data = this.barData.map(it => it.value);
      if (this.color.length > 0) {
        this.option.color = this.color;
      }
      this.chart.setOption(this.option, true);
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
