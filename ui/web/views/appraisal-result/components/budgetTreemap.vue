<template>
  <div>
    <div class="grid-content bg-fff">
      <div id="budgetTreeMap" :style="{width: '100%', height: '300px'}"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'budgetTreeMap',
  props: {
    mapData: Array
  },
  data() {
    return {
      barOption: {
        color: [
          '#37a2da',
          '#32c5e9',
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
    this.barChart();
  },
  methods: {
    barChart() {
      this.barOption.series[0].data = this.mapData;
      let chart = this.$echarts.init(document.getElementById('budgetTreeMap'));
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
