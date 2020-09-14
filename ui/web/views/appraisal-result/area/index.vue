<template>
  <div class="wrapper">
    <div>
      <!--顶部表头-->
      <el-card
        v-sticky
        class="header-box-card"
        shadow="never"
        v-loading="
          $asyncComputed.reportListSeverData.updating ||
            $asyncComputed.totalServerData.updating
        "
      >
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
          <el-button
            v-if="reportListData.length === 1"
            size="small"
            type="primary"
            style="margin-left: 30px"
            @click="handleDownloadReport(reportListData[0].url)"
          >
            报告下载
          </el-button>
          <el-dropdown
            v-else-if="reportListData.length > 1"
            @command="handleDownloadReport"
            style="margin-left: 30px"
          >
            <el-button type="primary" size="small">
              报告下载<i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item
                v-for="it of reportListData"
                :command="it.url"
                :key="it.id"
              >
                {{ it.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <el-button
            size="small"
            style="float:right; margin: 4px 0 10px 30px"
            type="primary"
            @click="handleBack"
            v-if="this.params.id !== this.$settings.user.code"
            >返回
          </el-button>
        </div>
      </el-card>
      <el-row :gutter="20" style="margin: 20px -10px">
        <el-col :span="8" v-loading="$asyncComputed.totalServerData.updating">
          <el-card shadow="hover">
            <div class="score-detail" v-if="params.listFlag === 'score'">
              <p class="second-title" style="margin:0; text-align:left;">
                工分值
              </p>
              <p style="color: #6C7177; font-size:16px; margin:10px 0;">
                校正后
              </p>
              <h3 style="font-size: 30px; margin:0; display:inline-block">
                {{ Math.round(totalData.score) }}
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
              ></two-card-circle>
              <span style="position: absolute; bottom: 20px; left: 31%;">
                (计算时校正系数：{{ totalData.fixedDecimalRate }}%)
              </span>
            </div>
          </el-card>
        </el-col>
        <el-col :span="16" v-if="params.listFlag === 'quality'">
          <el-card
            shadow="hover"
            v-loading="
              $asyncComputed.historicalTrendLineChartSeverData.updating
            "
          >
            <div class="score-detail">
              <line-chart
                :xAxisData="historicalTrendLineChartData.xAxisData"
                :yAxisData="historicalTrendLineChartData.yAxisData"
                lineText="%"
                :listFlag="params.listFlag"
              ></line-chart>
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
                <p class="second-title" style="margin:0; text-align:left;">
                  人脸采集信息
                </p>
                <p
                  style="font-size:16px; margin:30px 0; text-align:left; color:#333"
                >
                  人脸采集数：{{ faceCollectData.face }}
                </p>
                <p
                  style="font-size:16px; margin:30px 0; text-align:left; color:#333"
                >
                  人脸采集率：{{ faceCollectData.rateFormat }}
                </p>
              </div>
            </el-card>
          </el-col>
        </div>
      </el-row>
      <el-row>
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
              <!--下级机构工分值排行-->
              <div
                class="pointer"
                v-else-if="params.listFlag === 'score'"
                @click="handleClickSubordinateArea(item.id, item.level)"
              >
                <p>{{ index + 1 }}、{{ item.name }}</p>
                <progress-score
                  :label="item.scoreFormat"
                  :height="18"
                  :percentage="
                    item.score != 0
                      ? Math.round((item.score / maxScore) * 100)
                      : 0
                  "
                  style="padding:0 20px;"
                >
                </progress-score>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>
<script>
import twoCardCircle from '../components/twocardCircle';
import twoCardBar from '../components/twocardBar';
import ProgressScore from '../components/progressScore';
import lineChart from '../components/twocardLine';
import decimal from 'decimal.js';
import VueSticky from 'vue-sticky';
import FileSaver from 'file-saver';

export default {
  name: 'index',
  components: {
    twoCardCircle,
    twoCardBar,
    ProgressScore,
    lineChart
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
  directives: {
    sticky: VueSticky
  },
  computed: {
    //人脸采集信息
    faceCollectData() {
      return {
        face: this.faceCollectSeverData.face,
        rateFormat:
          Number((this.faceCollectSeverData.rate * 100).toFixed(2)) + '%'
      };
    },
    //历史趋势数据，折线图展示
    historicalTrendLineChartData() {
      const data = this.historicalTrendLineChartSeverData;
      let result = {};
      result.xAxisData = data.map(it => {
        return it.date;
      });
      result.yAxisData = data.map(it => {
        return Number((it.rate * 100).toFixed(2));
      });
      return result;
    },
    //工分值数据，用于柱状图显示
    workpointBarData() {
      let value = {xAxisData: [], yAxisData: []};
      let array = [];
      array = this.areaRankData.slice(0, 3);
      value.xAxisData = array.map(it => it.name);
      value.yAxisData = array.map(it => Math.round(it.score));
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
        return result
          .sort((a, b) => b.score - a.score)
          .map(it => {
            //格式化取整后的分数，用于页面显示
            it.scoreFormat = Math.round(it.score);
            return it;
          });
      } else {
        return result.sort((a, b) => b.rate - a.rate);
      }
    },
    //最大得分值数
    maxScore() {
      return Math.max(...this.areaRankData.map(it => it.score));
    },
    //报告下载列表数据
    reportListData() {
      return this.reportListSeverData;
    }
  },
  asyncComputed: {
    //人脸采集数据
    faceCollectSeverData: {
      async get() {
        return await this.$api.Score.faceCollect(this.params.id);
      },
      default() {
        return {
          face: 11,
          rate: 22
        };
      },
      shouldUpdate() {
        return this.params.listFlag === 'score';
      }
    },
    //历史趋势数据
    historicalTrendLineChartSeverData: {
      async get() {
        return await this.$api.Score.history(this.params.id);
      },
      default() {
        return [];
      }
    },
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
    },
    //报告下载列表服务器数据
    reportListSeverData: {
      async get() {
        return await this.$api.Report.list(this.params.id);
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
        this.$router.replace({
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
    },
    //返回
    handleBack() {
      this.$router.go(-1);
    },
    //报告下载
    handleDownloadReport(url) {
      FileSaver.saveAs(url);
    }
  }
};
</script>
<style scoped lang="scss">
@import '../../../styles/vars';

.wrapper {
  height: 100%;
  position: relative;

  & > div {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
}

.pointer {
  cursor: pointer;
}

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

.el-dropdown-link {
  cursor: pointer;
  color: #409eff;
}
</style>
