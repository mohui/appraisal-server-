<template>
  <div class="wrapper">
    <div class="container">
      <!--顶部表头-->
      <div class="card" v-sticky>
        <div
          class="header"
          v-loading="
            $asyncComputed.personInfoServerData.updating ||
              $asyncComputed.workScoreListServerData.updating
          "
        >
          <div class="content">
            <div class="item">
              {{ personInfoData.name }}
            </div>
            <div class="item">
              总得分（分）：{{
                workScore.afterCorrectionScore + personInfoData.extra
              }}
            </div>
            <div class="item">
              质量系数：{{ workScore.rateFormat
              }}{{ workScore.rate ? '%' : null }}
            </div>
          </div>
          <div>
            <el-button size="small" @click="$router.go(-1)">返回</el-button>
          </div>
        </div>
      </div>
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="10" :xs="24" :sm="24" :md="24" :lg="10" :xl="10">
            <div
              class="card"
              v-loading="$asyncComputed.workScoreListServerData.updating"
            >
              <div
                id="projectWorkPointPie"
                :style="{width: '100%', height: '420px'}"
              ></div>
            </div>
          </el-col>
          <el-col :span="14" :xs="24" :sm="24" :md="24" :lg="14" :xl="14">
            <div
              class="card person-info"
              v-loading="$asyncComputed.personInfoServerData.updating"
            >
              <div class="title">个人信息</div>
              <el-row :gutter="10" style="height: 100%">
                <el-col
                  v-for="(value, key) in personInfo"
                  :key="key"
                  :span="12"
                  style="padding:  0 8%"
                >
                  <el-row style="margin: 5px; padding: 5px; font-size: 15px">
                    <el-col :span="10">
                      <div class="name">{{ value }}：</div>
                    </el-col>
                    <el-col :span="14">
                      <div class="value">
                        {{ personInfoData[key] | dateFormat }}
                      </div>
                    </el-col>
                  </el-row>
                </el-col>
              </el-row>
            </div>
            <div
              class="card score-rules"
              v-loading="
                $asyncComputed.personInfoServerData.updating ||
                  $asyncComputed.workScoreListServerData.updating
              "
            >
              <div class="title">得分细则</div>
              <div style="text-align: center;">
                <el-row>
                  <el-col :span="6" class="item">
                    <div>校正前工分</div>
                    <div class="content">
                      {{ workScore.beforeCorrectionScore }}
                    </div>
                    <el-button
                      class="more"
                      type="text"
                      @click="
                        dialogWorkScoreTableVisible = true;
                        dialogScoreType = 'before';
                      "
                    >
                      点击查看
                    </el-button>
                  </el-col>
                  <el-col :span="6" class="item">
                    <div>质量系数</div>
                    <div class="content">
                      {{ workScore.rateFormat
                      }}{{ workScore.rate ? '%' : null }}
                    </div>
                    <el-button
                      class="more"
                      type="text"
                      @click="dialogRateTableVisible = true"
                    >
                      点击查看
                    </el-button>
                  </el-col>
                  <el-col :span="6" class="item">
                    <div>校正后工分</div>
                    <div class="content">
                      {{ workScore.afterCorrectionScore }}
                    </div>
                    <el-button
                      class="more"
                      type="text"
                      @click="
                        dialogWorkScoreTableVisible = true;
                        dialogScoreType = 'after';
                      "
                    >
                      点击查看
                    </el-button>
                  </el-col>
                  <el-col :span="6" class="item">
                    <div>附加分</div>
                    <div class="content">
                      <div v-if="!isEditor">{{ personInfoData.extra }}</div>
                      <el-input-number
                        v-else
                        v-model="personInfoData.extra"
                        size="mini"
                        label="附加分"
                      ></el-input-number>
                    </div>
                    <div>
                      <el-button
                        v-if="isEditor"
                        class="more"
                        style="color: #91cc75"
                        type="text"
                        @click="
                          isEditor = false;
                          personInfoData.extra = originExtraScore;
                        "
                      >
                        取消
                      </el-button>
                      <el-button
                        class="more"
                        type="text"
                        :disabled="personInfoData.settle"
                        @click="saveEditorAdditionalPoints"
                      >
                        {{ isEditor ? '完成' : '编辑' }}
                      </el-button>
                    </div>
                  </el-col>
                </el-row>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
    <el-dialog
      :title="dialogScoreType === 'after' ? '校正后工分明细' : '校正前工分明细'"
      :visible.sync="dialogWorkScoreTableVisible"
    >
      <el-table
        :data="workScoreListData"
        height="50vh"
        :header-cell-style="{textAlign: 'center'}"
        :cell-style="{textAlign: 'center'}"
      >
        <el-table-column
          property="name"
          label="名称"
          min-width="200"
        ></el-table-column>
        <el-table-column
          :property="
            dialogScoreType === 'after' ? 'afterCorrectionScore' : 'score'
          "
          label="得分"
          min-width="150"
        ></el-table-column>
      </el-table>
    </el-dialog>
    <el-dialog
      :title="staffCheckData.name"
      :visible.sync="dialogRateTableVisible"
    >
      <el-table
        :data="staffCheckData.list"
        height="50vh"
        :header-cell-style="{textAlign: 'center'}"
        :cell-style="{textAlign: 'center'}"
      >
        <el-table-column
          property="name"
          label="名称"
          width="200"
        ></el-table-column>
        <el-table-column
          property="score"
          label="分值"
          width="150"
        ></el-table-column>
        <el-table-column property="staffScore" label="得分" width="150">
          <template slot-scope="scope">
            <div v-if="scope.row.isRating">
              <el-input-number
                v-model="scope.row.staffScore"
                size="mini"
                :max="scope.row.score"
                label="得分"
              ></el-input-number>
            </div>
            <div v-else>
              {{ scope.row.staffScore }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button
              v-if="!scope.row.auto && scope.row.isRating"
              size="small"
              type="success"
              plain
              @click="scope.row.isRating = false"
            >
              取消
            </el-button>
            <el-button
              v-if="!scope.row.auto"
              size="small"
              type="primary"
              :disabled="personInfoData.settle"
              @click="saveEditorCheckScore(scope.row)"
            >
              {{ scope.row.isRating ? '完成' : '打分' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script>
import VueSticky from 'vue-sticky';

export default {
  name: 'index',
  data() {
    return {
      id: this.$route.query.id,
      curDate: new Date(JSON.parse(this.$route.query.date)),
      isEditor: false,
      dialogWorkScoreTableVisible: false,
      // 弹出工分列表的类型:校正前（before）、校正后(after)
      dialogScoreType: 'before',
      dialogRateTableVisible: false,
      // 记录打分前的附加分
      originExtraScore: 0,
      personInfo: {
        name: '姓名',
        staff: '员工号',
        sex: '性别',
        department: '所在科室',
        birth: '出生日期',
        phone: '联系电话',
        idCard: '身份证号',
        medicareNo: '医保编号'
      },
      chartColors: [
        '#409eff',
        '#ea9d42',
        '#9e68f5',
        '#5470c6',
        '#91cc75',
        '#fac858',
        '#ee6666',
        '#73c0de',
        '#3ba272',
        '#fc8452',
        '#9a60b4',
        '#ea7ccc'
      ]
    };
  },
  directives: {
    sticky: VueSticky
  },
  mounted() {
    this.drawChart();
  },
  watch: {
    workScorePieData: function() {
      this.drawProjectWorkPointPie();
    }
  },
  computed: {
    workScoreListData() {
      return this.workScoreListServerData?.items?.map(it => ({
        ...it,
        score: Number(it.score.toFixed(2)),
        afterCorrectionScore: Number(
          (it.score * (this.workScoreListServerData.rate || 1)).toFixed(2)
        )
      }));
    },
    workScore() {
      const sumScore = this.workScoreListData
        .map(it => it.score)
        .reduce((prev, curr) => prev + curr, 0);
      return {
        beforeCorrectionScore: sumScore,
        rate: this.workScoreListServerData.rate,
        afterCorrectionScore: Number(
          (sumScore * (this.workScoreListServerData.rate || 1)).toFixed(2)
        ),
        rateFormat:
          this.workScoreListServerData.rate === null
            ? '暂未考核'
            : (this.workScoreListServerData.rate * 100).toFixed(2)
      };
    },
    workScorePieData() {
      return this.workScoreListData?.map(it => ({
        value: it.score,
        name: it.name
      }));
    },
    personInfoData() {
      return this.personInfoServerData;
    },
    staffCheckData() {
      const list = this.staffCheckServerData.automations
        .concat(this.staffCheckServerData.manuals)
        .map(it => ({
          ...it,
          isRating: false
        }));
      return {
        ...this.staffCheckServerData,
        list: list
      };
    }
  },
  asyncComputed: {
    workScoreListServerData: {
      async get() {
        return await this.$api.HisStaff.findWorkScoreList(
          this.id,
          this.curDate
        );
      },
      default: {items: [], rate: 0}
    },
    personInfoServerData: {
      async get() {
        return await this.$api.HisStaff.get(this.id, this.curDate);
      },
      default: {}
    },
    staffCheckServerData: {
      async get() {
        return await this.$api.HisStaff.staffCheck(this.id, this.curDate);
      },
      default: {manuals: [], automations: []}
    }
  },
  methods: {
    // 附加分打分
    async saveEditorAdditionalPoints() {
      if (this.isEditor) {
        try {
          await this.$api.HisScore.setExtraScore(
            this.id,
            this.curDate,
            this.personInfoData.extra
          );
          this.isEditor = !this.isEditor;
          this.$message.success('打分成功');
          this.$asyncComputed.personInfoServerData.update();
        } catch (e) {
          this.$message.error(e.message);
        }
      } else {
        this.isEditor = !this.isEditor;
        // 记录原始分，取消时给input-number组件值还原
        this.originExtraScore = this.personInfoData.extra;
      }
    },
    // 手动工分项打分
    async saveEditorCheckScore(row) {
      if (row.isRating) {
        try {
          await this.$api.HisScore.setCheckScore(
            row.id,
            this.id,
            this.curDate,
            row.staffScore
          );
          row.isRating = !row.isRating;
          this.$message.success('打分成功');
          this.$asyncComputed.staffCheckServerData.update();
          this.$asyncComputed.workScoreListServerData.update();
        } catch (e) {
          console.log(e.message);
          this.$message.error(e.message);
        }
      } else {
        row.isRating = !row.isRating;
      }
    },
    // 绘制图表
    drawChart() {
      this.drawProjectWorkPointPie();
    },
    // 项目工分饼状图
    drawProjectWorkPointPie() {
      console.log('this.workScorePieData:', this.workScorePieData);
      // 基于准备好的dom，初始化echarts实例
      const myChart = this.$echarts.init(
        document.getElementById('projectWorkPointPie')
      );
      let option;
      option = {
        //设置颜色
        color: this.chartColors,
        legend: {
          top: 'bottom',
          type: 'scroll'
        },
        series: [
          {
            name: '项目工分值',
            type: 'pie',
            radius: '40%',
            center: ['50%', '40%'],
            label: {
              formatter: '{b|}校正前工分：{c}\n{b|}工分项占比：{d}%',
              backgroundColor: '#F6F8FC',
              borderColor: '#8C8D8E',
              borderWidth: 1,
              borderRadius: 4,
              padding: [0, 5],
              alignTo: 'labelLine',
              rich: {
                b: {
                  fontSize: 14,
                  lineHeight: 23
                }
              }
            },
            itemStyle: {
              borderRadius: 8
            },
            data: this.workScorePieData
          }
        ]
      };
      // 绘制图表
      myChart.setOption(option);

      // 窗口自适应，表图大小随浏览器窗口的缩放自适应
      window.addEventListener('resize', function() {
        myChart.resize();
      });
    }
  }
};
</script>

<style scoped lang="scss">
.wrapper {
  height: 100%;
  position: relative;
  .container {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
}

.card {
  border-radius: 4px;
  border: 1px solid #ebeef5;
  background-color: #ffffff;
  color: #303133;
  transition: 0.3s;
  padding: 20px;
  .title {
    font-weight: 500;
  }
}

.header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  .content {
    display: flex;
    flex-direction: row;

    .item {
      margin-right: 20px;
    }
  }
}

.person-info {
  height: 180px;
  display: flex;
  flex-direction: column;

  .name,
  .value {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .name {
    color: #323233;
  }

  .value {
    color: darkgray;
    text-align: right;
  }
}

.score-rules {
  height: 180px;
  margin-top: 20px;

  .item {
    height: 160px;
    display: flex;
    flex-direction: column;

    .content {
      flex-grow: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .more {
      padding: 10px 0;
    }
  }
}
</style>
