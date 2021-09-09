<template>
  <div>
    <div
      ref="faceCollectionInfoGauge"
      :style="{width: '100%', height: '300px'}"
    ></div>
  </div>
</template>

<script>
export default {
  name: 'FaceCollectionInfoGauge',
  props: {
    //图表名
    title: String,
    text: {
      type: String,
      default: ''
    },
    rate: {
      type: Number,
      default: 0
    },
    faceNumber: {
      type: Number,
      default: 0
    },
    faceTotal: {
      type: Number,
      default: 0
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
          text: '人脸采集信息',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal',
            color: '#40415a'
          }
        },
        tooltip: {formatter: '{a} <br/>{b} : {c}%'},
        series: [
          {
            type: 'gauge',
            startAngle: 90,
            endAngle: -270,
            min: 0,
            max: 100,
            radius: '60%',
            center: ['50%', '47%'],
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
              show: false,
              distance: -45,
              textStyle: {color: '#000'}
            },
            splitLine: {show: false},
            pointer: {show: false},
            title: {
              offsetCenter: [0, '-25%'],
              textStyle: {
                color: '#7a7d95',
                fontSize: '14',
                lineHeight: 20
              }
            },
            detail: {
              show: true,
              formatter: '{value}',
              offsetCenter: [0, '20%'],
              textStyle: {color: '#40415a', fontSize: '26'}
            },
            data: [
              {
                value: 0,
                name: ''
              }
            ]
          }
        ]
      }
    };
  },
  watch: {
    faceNumber: function() {
      this.circleChart();
    }
  },
  mounted() {
    this.chartId = this.$echarts.init(this.$refs['faceCollectionInfoGauge']);
    this.circleChart();
    window.addEventListener('resize', this.chartId.resize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.chartId.resize);
  },
  methods: {
    circleChart() {
      // max不能为0
      this.chart.series[0].max = this.faceTotal || 1;
      this.chart.series[0].data[0].value = this.faceNumber || 0;
      this.chart.series[0].data[0].name =
        this.text + '\n' + '(' + this.rate + '%' + ')';
      this.chartId.setOption(this.chart);
    }
  }
};
</script>

<style scoped>
::v-deep .cursor-pointer canvas {
  cursor: pointer;
}
</style>
