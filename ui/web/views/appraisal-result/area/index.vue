<template>
  <div>
    <!--顶部表头-->
    <el-card class="header-box-card" shadow="never">
      <div class="header-title" style="float: left">
        {{ totalData.name }}两卡制管理
      </div>
      <div class="kpiSum-select">
        <el-button-group style="margin-left: 20px">
          <el-button
            size="small"
            :class="{'el-button--primary': params.listFlag === 'quality'}"
            @click="latTypeChanged('quality')"
          >
            质量系数
          </el-button>
          <el-button
            size="small"
            :class="{'el-button--primary': params.listFlag === 'score'}"
            @click="latTypeChanged('score')"
          >
            工分值
          </el-button>
        </el-button-group>
      </div>
    </el-card>
    <el-row :gutter="20" style="margin: 20px -10px">
      <el-col :span="8" v-loading="$asyncComputed.totalServerData.updating">
        <el-card shadow="hover">
          <div class="score-detail" v-if="params.listFlag === 'score'">
            <p class="second-title" style="margin:0; text-align:left;">
              工分值
            </p>
            <p style="color: #6C7177; font-size:16px; margin:10px 0;">校正后</p>
            <h3 style="font-size: 30px; margin:0; display:inline-block">
              {{ totalData.score }}
            </h3>
            <span>分</span>
            <p style="margin:10px 0;">{{ date }}</p>
            <p style="font-size:13px;">{{ totalData.name }}</p>
            <div style="padding-top: 40px">
              <p>校正前 {{ totalData.originalScore }}分</p>
            </div>
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
              (计算时校正系数：{{ totalData.fixedDecimalRate }}%)
            </span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16" v-if="params.listFlag === 'quality'">
        <el-card shadow="hover">
          <div class="score-detail">
            <div class="second-title" style="float: left">
              历史趋势（待实现）
            </div>
          </div>
        </el-card>
      </el-col>
      <div v-else>
        <el-col :span="10">
          <el-card
            shadow="hover"
            v-loading="$asyncComputed.areaRankServerData.updating"
          >
            <div class="score-detail">
              <two-card-bar
                :barxAxisData="workpointBarData.xAxisData"
                :baryAxisData="workpointBarData.yAxisData"
              ></two-card-bar>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="score-detail">
              <div class="second-title" style="float: left">
                人脸采集信息（待实现）
              </div>
            </div>
          </el-card>
        </el-col>
      </div>
    </el-row>
    <el-col :span="24">
      <el-card
        shadow="hover"
        v-loading="$asyncComputed.areaRankServerData.updating"
      >
        <h3 class="area-ranking-title">下级地区排行</h3>
        <div v-for="(item, index) of areaRankData" :key="item.id">
          <!--下级质量系数排行-->
          <div
            v-if="params.listFlag === 'quality'"
            class="pointer"
            @click="handleClickSubordinateArea(item.id, item.level)"
          >
            <p>
              {{ index + 1 }}、{{ item.name }}
              <span style="float:right"
                >{{ Math.round(item.rate * 100) }}% 考核办法</span
              >
            </p>
            <el-progress
              :text-inside="true"
              :stroke-width="18"
              :percentage="Math.round(item.rate * 100)"
            >
            </el-progress>
          </div>
          <!--一级机构工分值排行-->
          <div
            class="pointer"
            v-else-if="params.listFlag === 'score'"
            @click="handleClickSubordinateArea(item.id, item.level)"
          >
            <p>{{ index + 1 }}、{{ item.name }}</p>
            <progress-score
              :label="item.score"
              :height="18"
              :percentage="
                item.score != 0 ? Math.round((item.score / maxScore) * 100) : 0
              "
              style="padding:0 20px;"
            >
            </progress-score>
          </div>
        </div>
      </el-card>
    </el-col>
  </div>
</template>
<script>
import twoCardCircle from '../components/twocardCircle';
import twoCardBar from '../components/twocardBar';
import ProgressScore from '../components/progressScore';
import decimal from 'decimal.js';

export default {
  name: 'index',
  components: {
    twoCardCircle,
    twoCardBar,
    ProgressScore
  },
  beforeRouteUpdate(to, from, next) {
    this.initParams(to);
    next();
  },
  created() {
    this.initParams(this.$route);
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
    //工分值数据，用于柱状图显示
    workpointBarData() {
      let value = {xAxisData: [], yAxisData: []};
      let array = [];
      array = this.areaRankData.slice(0, 3);
      value.xAxisData = array.map(it => it.name);
      value.yAxisData = array.map(it => it.score);
      return value;
    },
    //总计工分和质量系数数据
    totalData() {
      return {
        ...this.totalServerData,
        fixedDecimalRate: decimal(
          Number((this.totalServerData.rate * 100).toFixed(2))
        ).toNumber()
      };
    },
    //区域排行数据
    areaRankData() {
      const result = this.areaRankServerData.map(item => item);
      if (this.params.listFlag === 'score') {
        return result.sort((a, b) => b.score - a.score);
      } else {
        return result.sort((a, b) => b.rate - a.rate);
      }
    },
    //最大得分值数
    maxScore() {
      return Math.max(...this.areaRankData.map(it => it.score));
    }
  },
  asyncComputed: {
    //获取服务器上该地区/机构的总计工分和系数
    totalServerData: {
      async get() {
        return await this.$api.Score.total(this.params.id);
      },
      default() {
        return {
          id: '',
          name: '',
          originalScore: 0,
          score: 0,
          rate: 0
        };
      }
    },
    areaRankServerData: {
      async get() {
        return await this.$api.Score.areaRank(this.params.id);
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    initParams(route) {
      this.params.listFlag = route.query.listFlag ?? 'score';
      this.params.id = route.query.id ?? this.$settings.user.code;
    },
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
    },
    //进入下级地区
    handleClickSubordinateArea(id, level) {
      if (level < 3) {
        //进入下级地区
        this.params.id = id;
        this.$router.push({
          query: {
            ...this.params
          }
        });
      } else {
        //进入区级行政区和机构页
        this.$router.push({
          path: 'appraisal-result-institutions',
          query: {id: id}
        });
      }
    }
  }
};
</script>
<style scoped lang="scss">
@import '../../../styles/vars';

.second-title {
  font-size: 18px;
  font-weight: bold;
}
.header-box-card {
  width: auto;

  .header-title {
    font: bold 20px/2 Arial;
    color: $color-primary;
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
  color: $color-primary;
}

.area-ranking-title {
  margin: 0;
  color: $color-primary;
  font-size: 18px;
  font-weight: bold;
}
</style>
