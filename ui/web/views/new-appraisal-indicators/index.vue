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
  </div>
</template>
<script>
import twoCardBar from '../appraisal-indicators/components/twocardBar';

const sysCode = '340203';

export default {
  name: 'index',
  components: {
    twoCardBar
  },
  data() {
    return {
      subtitle: '芜湖市-弋江区',
      params: {
        listFlag: 'score'
      },
      //TODO:两个临时写死的变量
      afterCorrectionScore: 24234,
      date: '2020-06-02'
    };
  },
  methods: {
    latTypeChanged(type) {
      console.log('latTypeChanged', type);
      this.params.listFlag = type;
    }
  },
  computed: {
    doctorWorkpointData() {
      console.log('dd', this.doctorWorkpointServerData);
      return {
        xAxisData: this.doctorWorkpointServerData.map(it => it.doctorName),
        yAxisData: this.doctorWorkpointServerData.map(it => it.workScore)
      };
    },
    workpointTotalData() {
      return {
        score: Math.round(this.workpointTotalServerData.score)
      };
    }
  },
  asyncComputed: {
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
</style>
