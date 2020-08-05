<template>
  <div style="height: 100%; width: 100%;">
    <div ref="scoreLine" :style="{width: '100%', height: '100%'}"></div>
  </div>
</template>

<script>
export default {
  name: 'scoreLine',
  props: {
    lineData: Array,
    days: Array,
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
        color: [
          '#73DDFF',
          '#F56948',
          '#9E87FF',
          '#37a2da',
          '#9fe6b8',
          '#ffdb5c',
          '#ff9f7f',
          '#fb7293',
          '#e7bcf3',
          '#8378ea',
          '#ff7f50',
          '#87cefa',
          '#da70d6',
          '#32cd32',
          '#6495ed',
          '#ff69b4',
          '#ba55d3',
          '#cd5c5c',
          '#ffa500',
          '#40e0d0',
          '#1e90ff',
          '#ff6347',
          '#7b68ee',
          '#d0648a',
          '#ffd700',
          '#6b8e23',
          '#4ea397',
          '#3cb371',
          '#b8860b',
          '#7bd9a5'
        ],
        title: {
          text: '工分值年度记录'
        },
        tooltip: {
          trigger: 'axis'
        },
        grid: {
          left: '3%',
          right: '3%',
          bottom: '3%',
          width: 'auto',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: []
        },
        yAxis: {
          type: 'value'
        },
        series: []
      }
    };
  },
  mounted() {
    this.chart = this.$echarts.init(this.$refs['scoreLine']);
    this.updataChart();
    window.addEventListener('resize', this.chart.resize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.chart.resize);
  },
  methods: {
    updataChart() {
      this.option.xAxis.data = this.days;
      this.option.series = this.lineData;
      console.log('list', this.lineData);
      console.log(this.days);
      if (this.color.length > 0) {
        this.option.color = this.color;
      }
      this.chart.setOption(this.option);
    }
  },
  watch: {
    lineData: function() {
      this.updataChart();
    }
  }
};
</script>

<style scoped></style>
