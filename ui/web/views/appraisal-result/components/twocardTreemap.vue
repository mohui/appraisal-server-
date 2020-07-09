<template>
  <div>
    <div>sgsg</div>
    <div class="grid-content bg-fff">
      <div id="twoCardTreeMap" :style="{width: '100%', height: '300px'}"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'twoCardTreeMap',
  props: {
    mapData: Array
  },
  data() {
    return {
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
            nodeClick: false, //点击节点后的行为,false无反应
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
              },

              emphasis: {
                label: {
                  show: true
                }
              }
            },
            data: this.mapData
          }
        ]
      }
    };
  },
  mounted() {
    this.barChart();
  },
  methods: {
    barChart() {
      let chart = this.$echarts.init(document.getElementById('twoCardTreeMap'));
      window.addEventListener('resize', function() {
        chart.resize(); //使图表适应
      });
      chart.setOption(this.barOption);
    }
  },
  watch: {
    mapData: function() {
      this.barChart();
    }
  }
};
</script>

<style scoped></style>
