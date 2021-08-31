<template>
  <div>
    <div class="grid-content bg-fff">
      <div
        ref="charts"
        :class="{'cursor-pointer': onClick}"
        :style="{width: '100%', height: '300px'}"
      ></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TwoCardCircle',
  props: {
    coefficient: Number,
    pointDate: String,
    onClick: Function,
    text: {
      type: String,
      default: ''
    },
    color: {
      type: String,
      default: '#409EFF'
    }
  },
  data() {
    return {
      chartId: {},
      chart: {
        title: {
          show: true,
          text: '质量系数(%)',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bolder',
            color: this.color
          }
        },
        tooltip: {formatter: '{a} <br/>{b} : {c}%'},
        series: [
          {
            name: '质量系数',
            type: 'gauge',
            startAngle: 180,
            endAngle: 0,
            min: 0,
            max: 100,
            splitNumber: 2,
            radius: '70%',
            center: ['50%', '65%'],
            itemStyle: {
              color: this.color
            },
            progress: {
              show: true,
              roundCap: true,
              width: 20
            },
            axisLine: {
              roundCap: true,
              lineStyle: {
                width: 20,
                color: [[1, '#f6f7fa']]
              }
            },
            axisTick: {show: false},
            axisLabel: {
              show: true,
              distance: -45,
              textStyle: {color: '#000'}
            },
            splitLine: {show: false},
            pointer: {show: false},
            title: {
              offsetCenter: [0, '30%'],
              textStyle: {color: this.color, fontSize: '15'}
            },
            detail: {
              show: true,
              formatter: '{value}',
              offsetCenter: [0, '-30%'],
              textStyle: {color: this.color, fontSize: '30', fontWeight: '600'}
            },
            data: [
              {
                value: '',
                name: ''
              }
            ]
          }
        ]
      }
    };
  },
  watch: {
    coefficient: function() {
      this.circleChart();
    }
  },
  mounted() {
    this.chartId = this.$echarts.init(this.$refs['charts']);
    this.circleChart();
    window.addEventListener('resize', this.chartId.resize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.chartId.resize);
  },
  methods: {
    circleChart() {
      this.chart.series[0].data[0].value = this.coefficient
        ? this.coefficient
        : 0;
      this.chart.series[0].data[0].name = this.text;
      this.chartId.setOption(this.chart);
      this.chartId.getZr().off('click');
      this.chartId.getZr().on('click', () => this.onClick?.());
    }
  }
};
</script>

<style scoped>
::v-deep .cursor-pointer canvas {
  cursor: pointer;
}
</style>
