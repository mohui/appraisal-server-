<template>
  <div>
    <div class="grid-content bg-fff">
      <div id="charts" :style="{width: '100%', height: '300px'}"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'twocardCircle',
  props: {
    coefficient: Number,
    pointDate: String,
    subtitle: String,
    text: String,
    color: {
      type: String,
      default: '#409EFF'
    }
  },
  data() {
    return {
      chart: {
        title: {
          show: true,
          text: '质量系数(%)',
          textStyle: {
            fontSize: 18,
            fontWeight: 'bolder',
            color: this.color
          },
          top: 0,
          left: '5px'
        },
        tooltip: {formatter: '{a} <br/>{b} : {c}%'},
        series: [
          {
            name: '质量系数',
            type: 'gauge',
            startAngle: 180,
            endAngle: 0,
            radius: '100%',
            center: ['50%', '70%'],
            axisLine: {
              lineStyle: {
                width: 30,
                color: []
              }
            },
            axisTick: {show: false},
            axisLabel: {
              show: true,
              distance: 5,
              textStyle: {color: '#000'},
              formatter: function(e) {
                switch (e + '') {
                  case '10':
                  case '20':
                  case '30':
                  case '40':
                  case '60':
                  case '70':
                  case '80':
                  case '90':
                    return '';
                  default:
                    return e;
                }
              }
            },
            splitLine: {show: false},
            pointer: {show: false},
            title: {
              offsetCenter: [0, '-4%'],
              textStyle: {color: this.color, fontSize: '14'}
            },
            detail: {
              show: true,
              formatter: '{value}',
              offsetCenter: [0, '-35%'],
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
  mounted() {
    this.circleChart();
  },
  methods: {
    circleChart() {
      this.chart.series[0].axisLine.lineStyle.color = this.coefficient
        ? [
            [this.coefficient / 100, this.color],
            [1, '#f6f7fa']
          ]
        : [
            [0, this.color],
            [1, '#f6f7fa']
          ];
      this.chart.series[0].data[0].value = this.coefficient
        ? this.coefficient
        : 0;
      this.chart.series[0].data[0].name = this.pointDate
        ? this.pointDate + '\n' + this.text
        : '';
      let chart = this.$echarts.init(document.getElementById('charts'));
      window.addEventListener('resize', function() {
        chart.resize(); //使图表适应
      });
      chart.setOption(this.chart);
    }
  },
  watch: {
    subtitle: function() {
      this.circleChart();
    }
  }
};
</script>

<style scoped></style>
