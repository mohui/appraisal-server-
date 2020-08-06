<template>
  <div style="height: 100%; width: 100%;">
    <div ref="scoreLine" :style="{width: '100%', height: '100%'}"></div>
  </div>
</template>

<script>
export default {
  name: 'scoreLine',
  props: {
    title: String,
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
        color: [],
        title: {
          text: '图表标题'
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            let astr = '';
            params.forEach(ele => {
              astr += `
                    <div style="display: block;height:20px;width: 33.33%;float:left;">
                      <i style="width: 10px;height: 10px;display: inline-block;background: ${ele.color};border-radius: 10px;"></i>
                      <span>${ele.seriesName}: ${ele.value}</span>
                    </div>
                 `;
            });
            return `<div style="width: 800px; height: auto;">
                      <div>${params[0].name}</div>
                      ${astr}</div>`;
          }
        },
        legend: {
          bottom: '0',
          left: '3%',
          right: '3%',
          data: []
        },
        grid: {
          top: '1%',
          left: '3%',
          right: '3%',
          bottom: '20%',
          width: 'auto',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: []
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '{value} 次'
          }
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
      this.option.title.text = this.title;
      this.option.xAxis.data = this.days;
      this.option.legend.data = this.lineData.map(it => it.name);
      this.option.series = this.lineData;
      this.option.color = this.color.length
        ? this.color
        : Array(this.lineData.length)
            .fill()
            .map(() => '#' + Math.floor(Math.random() * 0xffffff).toString(16));
      this.chart.setOption(this.option, true);
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
