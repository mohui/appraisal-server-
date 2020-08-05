<template>
  <div style="height: 100%; position: relative;">
    <div v-if="!mapData.length" class="no-data">{{ emptyText }}</div>
    <div ref="treeMap" :style="{width: '100%', height: '100%'}"></div>
  </div>
</template>

<script>
export default {
  name: 'twoCardTreeMap',
  props: {
    mapData: Array,
    emptyText: {
      type: String,
      default() {
        return '暂无矩形树状图数据';
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
          formatter: '{b}'
        },
        series: [
          {
            type: 'treemap',
            width: '100%',
            height: '100%',
            roam: false, //是否开启拖拽漫游（移动和缩放）
            nodeClick: 'link', //点击节点后的行为,false无反应
            breadcrumb: {
              show: false
            },
            itemStyle: {
              normal: {
                show: true,
                textStyle: {
                  color: '#fff',
                  fontSize: 16
                },
                borderWidth: 1,
                borderColor: '#fff'
              }
            },
            data: []
          }
        ]
      }
    };
  },
  mounted() {
    this.chart = this.$echarts.init(this.$refs['treeMap']);
    this.updataChart();
    window.addEventListener('resize', this.chart.resize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.chart.resize);
  },
  methods: {
    updataChart() {
      this.barOption.series[0].data = this.mapData;
      if (this.color.length > 0) {
        this.barOption.color = this.color;
      }
      this.chart.setOption(this.barOption);
      this.chart.off('click');
      this.chart.on('click', params => params.data.onClick?.());
    }
  },
  watch: {
    mapData: function() {
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
