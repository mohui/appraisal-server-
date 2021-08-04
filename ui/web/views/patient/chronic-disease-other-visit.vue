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
        <table class="chronic-disease-other-visit">
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
              <td colspan="4">症状</td>
              <td colspan="20">
                <em>{{ detailDate.symptoms }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="7" colspan="2">体征</td>
              <td colspan="2">血 压</td>
              <td colspan="20">
                <em>{{ detailDate.systolicPressure }}</em
                >/<em>{{ detailDate.assertPressure }}</em> mmHg
              </td>
            </tr>
            <tr>
              <td colspan="2">体重</td>
              <td colspan="20">
                <em>{{ detailDate.weight }}</em
                >/<em>{{ detailDate.weightSuggest }}</em> kg
              </td>
            </tr>
            <tr>
              <td colspan="2">血糖</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="2">身高</td>
              <td colspan="20">
                <em>{{ detailDate.stature }}</em> cm
              </td>
            </tr>
            <tr>
              <td colspan="2">BMI</td>
              <td colspan="20">
                <em>{{ detailDate.BMI }}</em
                >/<em>{{ detailDate.BMISuggest }}</em> Kg/m2
              </td>
            </tr>
            <tr>
              <td colspan="2">心率</td>
              <td colspan="20">
                <em>{{ detailDate.HeartRate }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">其他</td>
              <td colspan="20">
                <em>{{ detailDate.other }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="7" colspan="2">生活方式指导</td>
              <td colspan="2">日吸烟量</td>
              <td colspan="20">
                <em>{{ detailDate.daySmoke }}</em
                >/<em>{{ detailDate.daySmokeSuggest }}</em
                >支
              </td>
            </tr>
            <tr>
              <td colspan="2">日饮酒量</td>
              <td colspan="20">
                <em>{{ detailDate.dayDrink }}</em
                >/<em>{{ detailDate.dayDrinkSuggest }}</em
                >两
              </td>
            </tr>
            <tr>
              <td colspan="2">运动</td>
              <td colspan="20">
                <em>{{ detailDate.exerciseWeek }}</em> 次/周；
                <em>{{ detailDate.exerciseMinute }}</em> 分钟/次
                <br />
                <em>{{ detailDate.exerciseWeekSuggest }}</em> 次/周；
                <em>{{ detailDate.exerciseMinuteSuggest }}</em> 分钟/次
              </td>
            </tr>
            <tr>
              <td colspan="2">摄盐情况</td>
              <td colspan="20">
                <em>{{ detailDate.saltSituation }}</em
                >/<em>{{ detailDate.saltSituationSuggest }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">心理调整</td>
              <td colspan="20">
                <em>{{ detailDate.mental }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">遵医行为</td>
              <td colspan="20">
                <em>{{ detailDate.doctorStatue }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">其它注意事项</td>
              <td colspan="20">
                <em>{{ detailDate.qtzysx }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="4" colspan="2">辅助检查</td>
              <td colspan="2">辅助检查</td>
              <td colspan="20">
                <em>{{ detailDate.fzjc }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">服药依从性</td>
              <td colspan="20">
                <em>{{ detailDate.medicationAdherence }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">药物不良反应</td>
              <td colspan="20">
                <em>{{ detailDate.adverseReactions }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">此次随访分类</td>
              <td colspan="20">
                <em>{{ detailDate.visitClass }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="5" colspan="2">用药情况</td>
              <td colspan="2">药物名称1</td>
              <td colspan="9">
                <em>{{ detailDate.drugName1 }}</em>
              </td>
              <td colspan="2">用法用量</td>
              <td colspan="9">
                每日<em>{{ detailDate.dailyTimesDrugName1 }}</em> 每次<em>{{
                  detailDate.usageDrugName1
                }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">药物名称2</td>
              <td colspan="9">
                <em>{{ detailDate.drugName2 }}</em>
              </td>
              <td colspan="2">用法用量</td>
              <td colspan="9">
                每日<em>{{ detailDate.dailyTimesDrugName2 }}</em> 每次<em>{{
                  detailDate.usageDrugName2
                }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">药物名称3</td>
              <td colspan="9">
                <em>{{ detailDate.drugName3 }}</em>
              </td>
              <td colspan="2">用法用量</td>
              <td colspan="9">
                每日<em>{{ detailDate.dailyTimesDrugName3 }}</em> 每次<em>{{
                  detailDate.usageDrugName3
                }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">药物名称4</td>
              <td colspan="9">
                <em>{{ detailDate.otherDrugName }}</em>
              </td>
              <td colspan="2">用法用量</td>
              <td colspan="9">
                每日<em>{{ detailDate.otherDailyTimesDrugName }}</em> 每次<em>{{
                  detailDate.otherUsageDrugName
                }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">备注</td>
              <td colspan="22">
                <em>{{ detailDate.remark }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">是否建议转诊</td>
              <td colspan="22">
                <em>{{ detailDate.isVisit ? '是' : '否' }}</em>
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
  name: 'chronic-disease-other-visit',
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
        return await this.$api.Person.chronicDiseaseOtherVisit(this.code);
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

.chronic-disease-other-visit {
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
