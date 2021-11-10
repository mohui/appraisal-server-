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
      default: '#5168f6'
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
            fontSize: 16,
            fontWeight: 'normal',
            color: '#40415a'
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
            radius: '60%',
            center: ['50%', '55%'],
            itemStyle: {
              color: this.$echarts.graphic.LinearGradient(1, 0, 0, 0, [
                {offset: 0, color: '#4e89ff'},
                {offset: 1, color: this.color}
              ]),
              shadowColor: this.color,
              shadowBlur: 10
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
              offsetCenter: [0, '40%'],
              textStyle: {color: '#7a7d95', fontSize: '13'}
            },
            detail: {
              show: true,
              formatter: '{value}',
              offsetCenter: [0, '-22%'],
              textStyle: {color: '#40415a', fontSize: '26'}
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
