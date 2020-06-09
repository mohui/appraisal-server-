<template>
  <div>
    省、市下级区域排行
    <!--顶部表头-->
    <el-card class="header-box-card" shadow="never">
      <div class="header-title" style="float: left">
        {{ totalData.name }}两卡制管理
      </div>
      <div class="kpiSum-select">
        <span style="margin-left:20px; font-size: 17px">纬度：</span>
        <el-button-group style="">
          <el-button
            :class="{'el-button--primary': params.listFlag === 'quality'}"
            @click="latTypeChanged('quality')"
          >
            质量系数
          </el-button>
          <el-button
            :class="{'el-button--primary': params.listFlag === 'score'}"
            @click="latTypeChanged('score')"
          >
            工分值
          </el-button>
        </el-button-group>
      </div>
    </el-card>
  </div>
</template>
<script>
export default {
  name: 'index',
  data() {
    return {
      params: {
        listFlag: 'score', // quality(质量系数) | score（工分值）
        id: this.$settings.user.code
      },
      date: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).$format(
        'YYYY-MM-DD'
      )
    };
  },
  computed: {
    //总计工分和质量系数数据
    totalData() {
      return {
        id: this.totalServerData.id,
        score: Math.round(this.totalServerData.score),
        rate: this.totalServerData.rate,
        fixedDecimalRate: Number(this.totalServerData.rate.toFixed(2)),
        name: this.totalServerData.name
      };
    }
  },
  asyncComputed: {
    //获取服务器上该地区/机构的总计工分和系数
    totalServerData: {
      async get() {
        return await this.$api.Score.total(this.$settings.user.code);
      },
      default() {
        return {
          id: '',
          name: '',
          score: 0,
          rate: 0
        };
      }
    }
  },
  methods: {
    //纬度切换
    latTypeChanged(type) {
      if (type !== this.params.listFlag) {
        this.params.listFlag = type;
        this.$router.push({
          query: {
            ...this.params
          }
        });
      }
    }
  }
};
</script>

<style scoped lang="scss">
.header-box-card {
  width: auto;

  .header-title {
    font: bold 20px/2 Arial;
    color: #0090dc;
  }
  .kpiSum-select {
    width: 100%;
    height: 35px;
    line-height: 40px;
  }
}
</style>
