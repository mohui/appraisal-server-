<template>
  <div>
    <el-card class="box-card" shadow="never">
      <div class="header-title" style="float: left">
        {{ subtitle }}两卡制管理
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
            type="default"
            :class="{'el-button--primary': params.listFlag === 'score'}"
            @click="latTypeChanged('score')"
          >
            工分值
          </el-button>
        </el-button-group>
      </div>
    </el-card>
    <el-row :gutter="20" style="margin: 5px 10px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="score-detail">
            <p style="font-size:22px; margin:0; text-align:left;">
              工分值
              <el-button plain style="float: right" size="small" type="primary"
                >查询工分
              </el-button>
            </p>
            <p style="color: #6C7177; font-size:16px; margin:10px 0;">校正后</p>
            <h3 style="font-size: 30px; margin:0; display:inline-block">
              {{ afterCorrectionScore }}
            </h3>
            <span>分</span>
            <p style="margin:10px 0;">{{ date }}</p>
            <p style="font-size:13px;">{{ subtitle }}</p>
            <div style="padding-top: 40px">
              <p>校正前 {{ workpointTotalData.score }}分</p>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16" v-if="params.listFlag === 'quality'">
        <el-card shadow="hover">
          <div class="score-detail">
            fff
          </div>
        </el-card>
      </el-col>
      <div v-else>
        <el-col :span="10">
          <el-card shadow="hover">
            <div class="score-detail">
              <two-card-bar
                :barxAxisData="doctorWorkpointData.xAxisData"
                :baryAxisData="doctorWorkpointData.yAxisData"
              ></two-card-bar>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover">
            <div class="score-detail">
              fff
            </div>
          </el-card>
        </el-col>
      </div>
    </el-row>
    <el-card
      shadow="hover"
      :style="{height: totalShowMore ? 'auto' : 300 + 'px'}"
    >
      <h3 class="ins-ranking-title">
        机构排行（含一级机构及下属二级机构）
      </h3>
      <div v-for="(item, index) of workpointRankData" :key="item.code">
        <accordion
          :Accordionindex="0"
          :AccordionData="`${index + 1}、${item.name}`"
        >
          <div
            slot="Sizes"
            style="float: right; width: 80px; text-align: right;"
          >
            {{ item.child.length }}家
          </div>
          <div slot="Progress" style="padding: 10px 20px 0;">
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
          <div slot="First" style="padding: 0 20px">
            <ul>
              <li class="pointer" v-for="(i, index) of item.child" :key="index">
                {{ i.name }} {{ i.score }}分
              </li>
            </ul>
          </div>
        </accordion>
      </div>
    </el-card>
    <div
      v-show="workpointRankData.length > 3"
      class="show-more"
      @click="totalShowMore = !totalShowMore"
    >
      {{ totalShowMore ? '收起' : '显示更多' }}
    </div>
    <el-row style="margin-top: 10px">
      <el-col :span="12">
        <el-card shadow="hover">
          <h3 class="ins-ranking-title">一级机构排行</h3>
          <div
            v-for="(item, index) of firstLevelWorkpointRankData"
            :key="item.code"
          >
            <div class="pointer">
              <p>{{ index + 1 }}、{{ item.name }}</p>
              <progress-score
                :label="item.score"
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
      <el-col :span="12">
        <el-card shadow="hover">
          <h3 class="ins-ranking-title">二级机构排行</h3>
          <div
            v-for="(item, index) of secondLevelWorkpointRankData"
            :key="item.code"
          >
            <div class="pointer">
              <p>{{ index + 1 }}、{{ item.name }}</p>
              <progress-score
                :label="item.score"
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
</template>
<script>
import twoCardBar from '../appraisal-indicators/components/twocardBar';
import accordion from '../appraisal-indicators/components/twocardAccordion';
import progressScore from '../appraisal-indicators/components/progressScore';

const sysCode = '340203';

export default {
  name: 'index',
  components: {
    twoCardBar,
    accordion,
    progressScore
  },
  data() {
    return {
      subtitle: '芜湖市-弋江区',
      params: {
        listFlag: 'score'
      },
      //TODO:两个临时写死的变量
      afterCorrectionScore: 24234,
      date: '2020-06-02',
      totalShowMore: false
    };
  },
  methods: {
    //纬度切换
    latTypeChanged(type) {
      console.log('latTypeChanged', type);
      this.params.listFlag = type;
    }
  },
  computed: {
    //医生工分值数据，用于柱状图显示
    doctorWorkpointData() {
      return {
        xAxisData: this.doctorWorkpointServerData.map(it => it.doctorName),
        yAxisData: this.doctorWorkpointServerData.map(it => it.workScore)
      };
    },
    //校正前工分值的总值
    workpointTotalData() {
      return {
        score: Math.round(this.workpointTotalServerData.score)
      };
    },
    //机构排行数据
    workpointRankData() {
      console.log('workpointRankServerData', this.workpointRankServerData);
      const result = this.workpointRankServerData
        //过滤，只取一级机构（name中含'中心'）的值
        .filter(item => item.name.endsWith('中心'))
        //添加child
        .map(item => {
          const returnValue = Object.assign({}, item, {
            child: [
              item,
              ...this.workpointRankServerData.filter(
                it => it.parent === item.id
              )
            ]
          });
          //累加分数
          returnValue.score = returnValue.child.reduce(
            (result, current) => (result += current.score),
            0
          );
          return returnValue;
        })
        .sort((a, b) => b.score - a.score);
      console.log('result', result);
      return result;
    },
    //一级机构排行数据
    firstLevelWorkpointRankData() {
      return this.workpointRankData
        .map(item => item.child)
        .reduce((result, current) => result.concat(current), [])
        .filter(item => item.name.endsWith('中心'))
        .sort((a, b) => b.score - a.score);
    },
    //二级机构排行数据
    secondLevelWorkpointRankData() {
      return this.workpointRankData
        .map(item => item.child)
        .flat()
        .filter(item => !item.name.endsWith('中心'))
        .sort((a, b) => b.score - a.score);
    },
    //最大得分值数
    maxScore() {
      return Math.max(...this.workpointRankData.map(it => it.score));
    }
  },
  asyncComputed: {
    //获取服务器的医生工分值数据
    doctorWorkpointServerData: {
      async get() {
        return await this.$phApi.SystemPoint.doctorPoint(sysCode);
      },
      shouldUpdate() {
        return this.params.listFlag === 'score';
      },
      default() {
        return [];
      }
    },
    //获取服务器的工分值数据
    workpointTotalServerData: {
      async get() {
        return await this.$api.WorkPoint.total(sysCode);
      },
      default() {
        return {
          id: '',
          name: '',
          score: 0
        };
      }
    },
    //获取服务器的机构排行数据
    workpointRankServerData: {
      async get() {
        return await this.$api.WorkPoint.rank(sysCode);
      },
      default() {
        return [];
      }
    }
  }
};
</script>

<style scoped>
.header-title {
  font: bold 20px/2 Arial;
  color: #0090dc;
}

.kpiSum-select {
  width: 100%;
  height: 35px;
  line-height: 40px;
}

.box-card {
  width: auto;
}

.score-detail {
  position: relative;
  height: 300px;
  text-align: center;
  box-sizing: border-box;
  color: #1096d0;
}

.pointer {
  cursor: pointer;
}

.ins-ranking-title {
  margin: 0;
  color: #1096d0;
  font-size: 20px;
}

.show-more {
  width: 100%;
  line-height: 30px;
  text-align: center;
  padding: 10px 0;
  background-color: #f5f5f5;
  border: 1px solid #f5f5f5;
  border-top: none;
  border-color: rgba(162, 162, 162, 0.1);
  color: #6c7177;
  font-size: 14px;
  cursor: pointer;
}
</style>
