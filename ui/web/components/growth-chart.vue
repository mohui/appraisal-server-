<template>
  <div ref="growthChart" :style="{width: '100%', height: '100%'}"></div>
</template>

<script>
export default {
  name: 'GrowthChart',
  props: {
    data: {
      type: Object,
      default: () => ({weights: [], heights: []})
    }
  },
  data() {
    return {
      chart: {},
      option: {
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
            data: [],
            type: 'line',
            smooth: true,
            yAxisIndex: 0
          },
          {
            name: '体重',
            data: [],
            type: 'line',
            smooth: true,
            yAxisIndex: 1 // 通过这个判断左右
          }
        ],
        legend: {
          show: true
        }
      }
    };
  },
  watch: {
    data: function() {
      this.upData();
    }
  },
  mounted() {
    this.chart = this.$echarts.init(this.$refs['growthChart']);
    this.upData();
    window.addEventListener('resize', this.chart.resize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.chart.resize);
  },
  methods: {
    upData() {
      this.option.series[0].data = this.data.heights;
      this.option.series[1].data = this.data.weights;
      this.chart.setOption(this.option, true);
    }
  }
};
</script>

<style scoped lang="scss"></style>
