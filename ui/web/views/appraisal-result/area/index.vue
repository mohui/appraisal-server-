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
    <el-row :gutter="20" style="margin: 20px -10px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="score-detail" v-if="params.listFlag === 'score'">
            <p style="font-size:22px; margin:0; text-align:left;">
              工分值
            </p>
            <p style="color: #6C7177; font-size:16px; margin:10px 0;">校正后</p>
            <h3 style="font-size: 30px; margin:0; display:inline-block">
              {{
                Math.round(
                  this.totalServerData.rate * this.totalServerData.score
                )
              }}
            </h3>
            <span>分</span>
            <p style="margin:10px 0;">{{ date }}</p>
            <p style="font-size:13px;">{{ totalData.name }}</p>
            <table style="width: 100%;margin-top: 20px;color: #666;">
              <tr>
                <td style="width: 33%;text-align: center">
                  <p>{{ Math.round(totalData.score) }}分</p>
                  <p>校正前</p>
                </td>
                <td
                  style="width: 33%;text-align: center;vertical-align: middle;"
                >
                  X
                </td>
                <td style="text-align: center">
                  <p>{{ totalData.fixedDecimalRate * 100 }}%</p>
                  <p>质量系数</p>
                </td>
              </tr>
            </table>
          </div>
          <div class=" score-detail" v-if="params.listFlag === 'quality'">
            <two-card-circle
              :coefficient="totalData.fixedDecimalRate"
              :pointDate="date"
              :subtitle="totalData.name"
              :text="totalData.name"
            ></two-card-circle>
            <span
              style="bottom: 20px;position: absolute;left: 50%;margin-left: -90px;"
            >
              (计算时校正系数：{{ totalData.fixedDecimalRate * 100 }}%)
            </span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16" v-if="params.listFlag === 'quality'">
        <el-card shadow="hover">
          <div class="score-detail">
            历史趋势（待实现）
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script>
import twoCardCircle from '../../appraisal-indicators/components/twocardCircle';
export default {
  name: 'index',
  components: {
    twoCardCircle
  },
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
.score-detail {
  position: relative;
  height: 300px;
  text-align: center;
  box-sizing: border-box;
  color: #1096d0;
}
</style>
