<template>
  <div
    style="height: 100%"
    v-loading="$asyncComputed.detailServerDate.updating"
  >
    <el-card
      class="box-card"
      style="height: 100%"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header">
        <span>慢病高危规范记录表</span>
        <el-button
          style="float: right; margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div style="flex-grow: 1; height: 0; overflow-y: auto;">
        <el-row type="flex" justify="space-between" class="record-head">
          <el-col :span="6">
            姓名：<strong>{{ detailDate.name }}</strong>
          </el-col>
          <el-col :span="6">编号：{{ detailDate.No }}</el-col>
        </el-row>
        <table class="chronic-disease-high-visit">
          <tbody>
            <tr>
              <td colspan="4">随访日期</td>
              <td colspan="8">
                <em>{{ detailDate.followDate }}</em>
              </td>
              <td colspan="4">随访方式</td>
              <td colspan="8">
                <em>{{ detailDate.followWay }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">危险因数</td>
              <td colspan="20">
                <em>{{ detailDate.riskFactorsName }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="8" colspan="2">体征</td>
              <td colspan="2">血 压</td>
              <td colspan="20">
                <em>{{ detailDate.systolicPressure }}</em
                >/<em>{{ detailDate.assertPressure }}</em> mmHg
              </td>
            </tr>
            <tr>
              <td colspan="2">血脂</td>
              <td colspan="20">
                <em>{{ detailDate.bloodFat }}</em> mmol/L
              </td>
            </tr>
            <tr>
              <td colspan="2">体重</td>
              <td colspan="20">
                <em>{{ detailDate.weight }}</em> kg
              </td>
            </tr>
            <tr>
              <td colspan="2">腰围</td>
              <td colspan="20">
                <em>{{ detailDate.waist }}</em> cm
              </td>
            </tr>
            <tr>
              <td colspan="2">空腹血糖</td>
              <td colspan="20">
                <em>{{ detailDate.kfxt }}</em> mmol/L
              </td>
            </tr>
            <tr>
              <td colspan="2">随机血糖</td>
              <td colspan="20">
                <em>{{ detailDate.sjxt }}</em> mmol/L
              </td>
            </tr>
            <tr>
              <td colspan="2">是否吸烟</td>
              <td colspan="20">
                <em>{{ detailDate.isSmoke ? '是' : '否' }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">吸烟量</td>
              <td colspan="20">
                <em>{{ detailDate.daySmoke }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="4" colspan="2">生活方式指导</td>
              <td colspan="2">膳食指导</td>
              <td colspan="9">
                <em>{{ detailDate.isDiet ? '是' : '否' }}</em>
              </td>
              <td colspan="2">指导描述</td>
              <td colspan="9">
                <em>{{ detailDate.dietDescription }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">身体活动指导</td>
              <td colspan="9">
                <em>{{ detailDate.isPhysicalActivity ? '是' : '否' }}</em>
              </td>
              <td colspan="2">指导描述</td>
              <td colspan="9">
                <em>{{ detailDate.physicalActivityDesc }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">戒烟指导</td>
              <td colspan="9">
                <em>{{ detailDate.isQuitSmoking ? '是' : '否' }}</em>
              </td>
              <td colspan="2">指导描述</td>
              <td colspan="9">
                <em>{{ detailDate.quitSmokingDesc }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">限酒指导</td>
              <td colspan="9">
                <em>{{ detailDate.isLimitDrink ? '是' : '否' }}</em>
              </td>
              <td colspan="2">指导描述</td>
              <td colspan="9">
                <em>{{ detailDate.limitDrinkDesc }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="1" colspan="2">是否失防</td>
              <td colspan="2">是否失防</td>
              <td colspan="9">
                <em>{{ detailDate.isVisit ? '是' : '否' }}</em>
              </td>
              <td colspan="2">失防描述</td>
              <td colspan="9">
                <em>{{ detailDate.visitReason }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">下次随访日期</td>
              <td colspan="20">
                <em>{{ detailDate.nextVisitDate }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">随访医生</td>
              <td colspan="20">
                <em>{{ detailDate.doctor }}</em>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="explain">
          <p class="title">填表说明：</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'chronic-disease-high-visit',
  data() {
    return {
      code: null
    };
  },
  computed: {
    detailDate() {
      return {
        ...this.detailServerDate,
        followDate: this.detailServerDate.followDate?.$format('YYYY-MM-DD'),
        nextVisitDate: this.detailServerDate.nextVisitDate?.$format(
          'YYYY-MM-DD'
        )
      };
    }
  },
  created() {
    this.code = this.$route.query.id;
  },
  asyncComputed: {
    detailServerDate: {
      // 产后访视记录表详情
      async get() {
        return await this.$api.Person.chronicDiseaseHighVisit(this.code);
      },
      default() {
        return [];
      }
    }
  }
};
</script>

<style scoped lang="scss">
.record-head {
  width: 100%;
  max-width: 1200px;
  margin-bottom: 10px;
}

.chronic-disease-high-visit {
  width: 100%;
  max-width: 1200px;
  background-color: #fff;
  border-collapse: collapse;
  border-right: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  line-height: 2;
  tr {
    td {
      padding: 3px 10px;
      border-top: 1px solid #ccc;
      border-left: 1px solid #ccc;
      em {
        color: #409eff;
      }
      sub {
        vertical-align: bottom;
      }
      &[rowspan] + td {
        text-align: center;
      }
    }
    :first-child {
      text-align: center;
      line-height: normal;
    }
    :last-child {
      text-align: left;
    }
  }
}

.explain {
  width: 100%;
  max-width: 1200px;
  font-size: 12px;
  .title {
    font-weight: bold;
    font-size: 16px;
  }
}
</style>
