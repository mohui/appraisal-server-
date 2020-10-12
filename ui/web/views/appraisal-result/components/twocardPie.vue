<template>
  <div style="height: 100%; position: relative;">
    <div v-if="!pieData.length" class="no-data">{{ emptyText }}</div>
    <div ref="pie" :style="{width: '100%', height: '100%'}"></div>
  </div>
</template>

<script>
export default {
  name: 'twoCardPie',
  props: {
    pieName: String,
    pieData: Array,
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
      barOption: {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        series: [
          {
            name: '',
            type: 'pie',
            radius: ['60%', '74%'],
            avoidLabelOverlap: false,
            label: {
              show: false,
              position: 'center',
              formatter: ['{b|{b}}', '{c|{c}}', '{d|({d}%)}'].join('\n'),
              rich: {
                b: {fontSize: 14, color: '#aaa'},
                c: {fontSize: 22, lineHeight: 30},
                d: {fontSize: 14, color: '#96c9ff'}
              }
            },
            emphasis: {
              label: {
                show: true,
                fontSize: '20'
              }
            },
            labelLine: {
              show: false
            },
            data: []
          }
        ]
      }
    };
  },
  mounted() {
    this.chart = this.$echarts.init(this.$refs['pie']);
    this.updataChart();
    window.addEventListener('resize', this.chart.resize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.chart.resize);
  },
  methods: {
    updataChart() {
      let index = 0;
      this.barOption.series[0].data = this.pieData;
      if (this.color.length > 0) {
        this.barOption.color = this.color;
      }
      this.chart.setOption(this.barOption);
      this.chart.dispatchAction({
        type: 'highlight',
        seriesIndex: 0,
        dataIndex: 0
      }); //设置默认选中高亮部分

      this.chart.on('mouseover', e => {
        this.chart.dispatchAction({
          type: 'downplay',
          seriesIndex: 0,
          dataIndex: 0
        });
        if (e.dataIndex !== index) {
          this.chart.dispatchAction({
            type: 'downplay',
            seriesIndex: 0,
            dataIndex: index
          });
        }
        if (e.dataIndex == 0) {
          this.chart.dispatchAction({
            type: 'highlight',
            seriesIndex: 0,
            dataIndex: e.dataIndex
          });
        }
      });

      this.chart.on('mouseout', e => {
        index = e.dataIndex;
        this.chart.dispatchAction({
          type: 'highlight',
          seriesIndex: 0,
          dataIndex: 0
        });
      });

      this.chart.off('click');
      this.chart.on('click', params => params.data.onClick?.());
    }
  },
  watch: {
    pieData: function() {
      this.updataChart();
    }
  }
};
</script>

<style scoped>
.no-data {
  position: absolute;
  top: 50%;
  width: 100%;
  z-index: 9;
}
</style>
