<template>
  <div>
    <!--顶部表头-->
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
        <el-button
          plain
          style="float:right; margin: 0 30px;"
          type="primary"
          @click="handleBack"
          v-if="params.isInstitution"
          >返回
        </el-button>
      </div>
    </el-card>
    <el-row :gutter="20" style="margin: 20px -10px">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="score-detail">
            <p style="font-size:22px; margin:0; text-align:left;">
              工分值
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
            历史趋势（待实现）
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
              人脸采集信息（待实现）
            </div>
          </el-card>
        </el-col>
      </div>
    </el-row>
    <!--机构排行-->
    <div v-if="!params.isInstitution">
      <el-card
        shadow="hover"
        :style="{height: totalShowMore ? 'auto' : 300 + 'px'}"
      >
        <h3 class="ins-ranking-title">
          机构排行（含一级机构及下属二级机构）
        </h3>
        <div v-for="(item, index) of workpointRankData" :key="item.code">
          <!--质量系数机构排行-->
          <accordion
            v-if="params.listFlag === 'quality'"
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
              <el-progress
                :text-inside="true"
                :stroke-width="18"
                :percentage="Math.round(item.rate * 100)"
              >
              </el-progress>
            </div>
            <div slot="First" style="padding: 0 20px">
              <ul>
                <li
                  class="pointer"
                  v-for="(i, index) of item.child"
                  :key="index"
                  @click="handleClickInstitution(i.id)"
                >
                  {{ i.name }} {{ Math.round(i.rate * 100) }}%
                </li>
              </ul>
            </div>
          </accordion>
          <!--工分值机构排行-->
          <accordion
            v-if="params.listFlag === 'score'"
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
                  item.score != 0
                    ? Math.round((item.score / maxScore) * 100)
                    : 0
                "
                style="padding:0 20px;"
              >
              </progress-score>
            </div>
            <div slot="First" style="padding: 0 20px">
              <ul>
                <li
                  class="pointer"
                  style="margin: 8px 0; font-size: 14px"
                  v-for="(i, index) of item.child"
                  :key="index"
                  @click="handleClickInstitution(i.id)"
                >
                  {{ i.name }} {{ i.score }}分
                </li>
              </ul>
            </div>
          </accordion>
        </div>
      </el-card>
      <!--机构排行底部【收起】/【显示更多】按钮-->
      <div
        v-show="workpointRankData.length > 3"
        class="show-more"
        @click="totalShowMore = !totalShowMore"
      >
        {{ totalShowMore ? '收起' : '显示更多' }}
      </div>
      <!--一、二级机构排行-->
      <el-row :gutter="20" style="margin-top: 20px">
        <!--一级机构排行-->
        <el-col :span="12">
          <el-card shadow="hover">
            <h3 class="ins-ranking-title">一级机构排行</h3>
            <div
              v-for="(item, index) of firstLevelWorkpointRankData"
              :key="item.id"
            >
              <!--一级机构质量系数排行-->
              <div
                v-if="params.listFlag === 'quality'"
                class="pointer"
                @click="handleClickInstitution(item.id)"
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
                @click="handleClickInstitution(item.id)"
              >
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
        <!--二级机构排行-->
        <el-col :span="12">
          <el-card shadow="hover">
            <h3 class="ins-ranking-title">二级机构排行</h3>
            <div
              v-for="(item, index) of secondLevelWorkpointRankData"
              :key="item.id"
            >
              <!--二级机构质量系数排行-->
              <div
                v-if="params.listFlag === 'quality'"
                class="pointer"
                @click="handleClickInstitution(item.id)"
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
              <!--二级机构工分值排行-->
              <div
                class="pointer"
                v-else-if="params.listFlag === 'score'"
                @click="handleClickInstitution(item.id)"
              >
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
    <!--考核指标规则-->
    <el-row
      class="appraisal-indicators-rule"
      v-if="params.isInstitution && params.listFlag === 'quality'"
    >
      <el-col :span="24">
        <div>
          <div style="width: 100%; height:40px;">
            <div class="appraisal-indicators-rule-title" style="float:left">
              {{ appraisalIndicatorsData.checkName }}
              <span style="color: #666;font-size: 14px;"
                >{{ appraisalIndicatorsData.ruleScore }}分</span
              >
            </div>
          </div>
          <div
            v-for="(item, index) in appraisalIndicatorsData.children"
            :key="index"
          >
            <div class="check-table-title">
              <span>{{ item.ruleName }}</span>
            </div>
            <el-table :data="item.children" show-summary style="width: 100%">
              <el-table-column
                type="index"
                align="center"
                label="序号"
              ></el-table-column>
              <el-table-column prop="ruleName" align="center" label="考核内容">
              </el-table-column>
              <el-table-column
                prop="ruleScore"
                align="center"
                width="50px"
                label="分值"
              >
              </el-table-column>
              <el-table-column
                prop="checkStandard"
                align="center"
                width="284px"
                label="考核标准"
              >
              </el-table-column>
              <el-table-column
                prop="checkMethod"
                align="center"
                label="考核方法"
              >
              </el-table-column>
              <el-table-column
                prop="evaluateStandard"
                align="center"
                label="评分标准"
              >
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>
    </el-row>
    <el-row
      v-if="params.isInstitution && params.listFlag === 'score'"
      :gutter="20"
      style="margin-top: 20px"
    >
      <el-col :span="12">
        <el-card shadow="hover">
          <p style="color:#1096d0; font-size:20px; font-weight:500;">
            医生工分
          </p>
          <el-table
            :data="doctorWorkpointRankData"
            :header-cell-style="{background: '#e4e2df', color: '#333'}"
          >
            <el-table-column type="expand" prop="children">
              <template slot-scope="scope">
                <el-table :data="scope.row.children" :show-header="false">
                  <el-table-column type="index" align="center">
                  </el-table-column>
                  <el-table-column prop="name" align="center"></el-table-column>
                  <el-table-column
                    prop="score"
                    align="center"
                  ></el-table-column>
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="序号" align="center">
              <template slot-scope="scope">
                <span>【{{ scope.$index + 1 }}】</span>
              </template>
            </el-table-column>
            <el-table-column label="医生" align="center">
              <template slot-scope="scope">
                <span>{{ scope.row.doctorname }}</span>
              </template>
            </el-table-column>
            <el-table-column align="center" label="工分值">
              <template slot-scope="scope">
                <span>{{ scope.row.score }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover">
          <p style="color:#1096d0; font-size:20px; font-weight:500;">
            工分项目
          </p>
          <el-table
            :data="categoryWorkpointRankData"
            :header-cell-style="{background: '#e4e2df', color: '#333'}"
            ref="refTable"
          >
            <el-table-column type="expand" prop="children">
              <template slot-scope="scope">
                <el-table :data="scope.row.children" :show-header="false">
                  <el-table-column type="index" align="center">
                  </el-table-column>
                  <el-table-column
                    prop="doctorname"
                    align="center"
                  ></el-table-column>
                  <el-table-column
                    prop="score"
                    align="center"
                  ></el-table-column>
                </el-table>
              </template>
            </el-table-column>
            <el-table-column label="序号" align="center">
              <template slot-scope="scope">
                <span>【{{ scope.$index + 1 }}】</span>
              </template>
            </el-table-column>
            <el-table-column label="工分目录" align="center">
              <template slot-scope="scope">
                <span>{{ scope.row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column align="center" label="工分值">
              <template slot-scope="scope">
                <span>{{ scope.row.score }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
<script>
import twoCardBar from './components/twocardBar';
import accordion from './components/twocardAccordion';
import progressScore from './components/progressScore';

const code = '340203';

export default {
  name: 'index',
  components: {
    twoCardBar,
    accordion,
    progressScore
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
      subtitle: '芜湖市-弋江区',
      params: {
        listFlag: 'score', // quality(质量系数) | score（工分值）
        isInstitution: false, // 是否机构
        id: ''
      },
      date: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).$format(
        'YYYY-MM-DD'
      ),
      totalShowMore: false
    };
  },
  methods: {
    initParams(route) {
      this.params.listFlag = route.query.listFlag ?? 'score';
      // TODO: 是否显示机构视图和code, 日后将由用户权限控制
      this.params.isInstitution =
        JSON.parse(route.query.isInstitution) ?? false;
      this.params.id = route.query.id ?? code;
    },
    //纬度切换
    latTypeChanged(type) {
      console.log('latTypeChanged', type);
      if (type !== this.params.listFlag) {
        this.params.listFlag = type;
        this.params.id = this.$route.query.id;
        this.$router.push({query: this.params});
      }
    },
    handleClickInstitution(id) {
      console.log(id);
      this.params.isInstitution = true;
      this.params.id = id;
      if (this.params.listFlag === 'score') {
        this.$router.push({
          query: {
            ...this.params
          }
        });
      } else if (this.params.listFlag === 'quality') {
        this.$router.push({
          query: {
            ...this.params
          }
        });
      }
    },
    //返回
    handleBack() {
      console.log('query', this.$route.query);
      this.params.isInstitution = false;
      this.params.id = code;
      this.$router.push({
        query: {
          ...this.params
        }
      });
    }
  },
  computed: {
    sysCode() {
      return this.$route.query.id || code;
    },
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
    afterCorrectionScore() {
      return (
        Math.round(
          this.workpointTotalServerData.rate *
            this.workpointTotalServerData.score
        ) | 0
      );
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
          //累加质量系数
          returnValue.rate = returnValue.child.reduce(
            (result, current) => (result += current.rate),
            0
          );
          returnValue.rate = returnValue.rate / returnValue.child.length;
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
    },
    //医生工分排行数据
    doctorWorkpointRankData() {
      console.log(
        'doctorWorkpointRankServerData',
        this.doctorWorkpointRankServerData
      );
      let returnValue = this.doctorWorkpointRankServerData
        .reduce((result, current) => {
          // let item = result.find(it => it.doctorid === current.doctorid);
          let item;
          for (const it of result) {
            if (it.doctorid === current.doctorid) {
              item = it;
              break;
            }
          }
          if (item) {
            // 医生已存在
            item.score += current.score;
            item.children.push(current);
          } else {
            // 不存在
            item = {
              doctorid: current.doctorid,
              doctorname: current.doctorname,
              score: current.score,
              children: [current]
            };
            result.push(item);
          }

          return result;
        }, [])
        .sort((a, b) => b.score - a.score);
      console.log('retureValue', returnValue);
      return returnValue;
    },
    //工分项目数据
    categoryWorkpointRankData() {
      return this.doctorWorkpointRankServerData.reduce((result, current) => {
        let item = result.find(it => it.name === current.name);
        if (item) {
          //类别已存在
          item.score += current.score;
          item.children.push(current);
        } else {
          //类别不存在
          item = {
            name: current.name,
            score: current.score,
            children: [current]
          };
          result.push(item);
        }
        return result;
      }, []);
    },
    //绩效考核指标的规则和评分数据
    appraisalIndicatorsData() {
      return this.appraisalIndicatorsServerData;
    }
  },
  asyncComputed: {
    //获取服务器的医生工分值数据
    doctorWorkpointServerData: {
      async get() {
        return await this.$phApi.SystemPoint.doctorPoint(this.sysCode);
      },
      shouldUpdate() {
        return this.params.listFlag === 'score' && !this.params.isInstitution;
      },
      default() {
        return [];
      }
    },
    //获取服务器的工分值数据
    workpointTotalServerData: {
      async get() {
        return await this.$api.WorkPoint.total(this.sysCode);
      },
      shouldUpdate() {
        return this.params.listFlag === 'score' && !this.params.isInstitution;
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
        return await this.$api.Score.rank(this.sysCode);
      },
      shouldUpdate() {
        return !this.params.isInstitution;
      },
      default() {
        return [];
      }
    },
    //获取服务器的医生工分和工分项目数据
    doctorWorkpointRankServerData: {
      async get() {
        return await this.$api.Hospital.workpoints(this.sysCode);
      },
      shouldUpdate() {
        return this.params.listFlag === 'score' && this.params.isInstitution;
      },
      default() {
        return [];
      }
    },
    //获取服务器绩效考核指标的规则和评分数据
    appraisalIndicatorsServerData: {
      async get() {
        return await this.$api.Hospital.checks(this.sysCode);
      },
      shouldUpdate() {
        return this.params.listFlag === 'quality' && this.params.isInstitution;
      },
      default() {
        return {};
      }
    }
  }
};
</script>

<style scoped lang="scss">
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

.appraisal-indicators-rule {
  padding-top: 20px;
  .appraisal-indicators-rule-title {
    color: #1a95d7;
    font-size: 20px;
    margin-top: 0;
    margin-bottom: 20px;
  }

  .check-table-title {
    background: #ccc;
    width: 100%;
    line-height: 40px;
    padding-left: 20px;
    float: left;
    box-sizing: border-box;
  }
}
</style>
