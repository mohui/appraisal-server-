<template>
  <div class="wrapper">
    <div>
      <!--顶部表头-->
      <el-card v-sticky shadow="never">
        <span class="header-title">
          中心绩效考核
        </span>
      </el-card>
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="8" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
            <el-card shadow="hover">
              <el-col :span="12">
                <div class="score-detail">
                  <div class="total-score-title">总分</div>
                  <div class="total-score">
                    {{ dataSource.afterCorrectionWorkPoint }}
                  </div>
                  <div>校正后</div>
                  <div class="before-correction">
                    校正前工分: {{ dataSource.beforeCorrectionWorkPoint }}
                  </div>
                </div>
              </el-col>
              <el-col :span="12">
                <div>
                  <two-card-circle
                    :coefficient="dataSource.rate"
                  ></two-card-circle>
                </div>
              </el-col>
            </el-card>
          </el-col>
          <el-col :span="16" :xs="24" :sm="16" :md="16" :lg="16" :xl="16">
            <el-card shadow="hover">
              员工列表
            </el-card>
          </el-col>
        </el-row>
      </div>
      <el-card shadow="hover">
        项目得分表
      </el-card>
    </div>
  </div>
</template>

<script>
import VueSticky from 'vue-sticky';
import twoCardCircle from '../appraisal-result/components/twocardCircle';
export default {
  name: 'index',
  data() {
    return {
      dataSource: {
        beforeCorrectionWorkPoint: 30000,
        afterCorrectionWorkPoint: 25000,
        rate: 56
      }
    };
  },
  components: {
    twoCardCircle
  },

  directives: {
    sticky: VueSticky
  }
};
</script>

<style scoped lang="scss">
@import '../../styles/vars';
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

.header-title {
  font: bold 20px/2 Arial;
  color: $color-primary;
  margin-right: 10px;
}

.score-detail {
  height: 300px;
  font-size: 15px;
  text-align: center;
  .total-score-title {
    font-size: 22px;
    margin: 10px;
  }
  .total-score {
    font-size: 22px;
    color: $color-primary;
    margin: 10px;
  }
  .before-correction {
    color: darkgray;
    font-size: 12px;
    margin: 10px;
  }
}
</style>
