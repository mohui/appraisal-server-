<template>
  <div style="height: 100%">
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
        <span>3～6岁儿童健康检查记录表</span>
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
            姓名：<strong>{{ detailDate.childname }}</strong>
          </el-col>
          <el-col :span="6">编号：{{ detailDate.medicalcode }}</el-col>
        </el-row>
        <table class="record-child-health-check">
          <tbody>
            <tr>
              <td colspan="4">月 龄</td>
              <td colspan="20">
                {{ detailDate.chronologicalage }}
              </td>
            </tr>
            <tr>
              <td colspan="4">随访日期</td>
              <td colspan="20">
                {{ detailDate.checkdate }}
              </td>
            </tr>
            <tr>
              <td colspan="4">体 重/kg</td>
              <td colspan="20">
                {{ detailDate.weight }}
              </td>
            </tr>
            <tr>
              <td colspan="4">身 高/cm</td>
              <td colspan="20">
                {{ detailDate.height }}
              </td>
            </tr>
            <tr>
              <td colspan="4">体重/身高</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">体格发育评价</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td rowspan="7" colspan="1">体格检查</td>
              <td colspan="3">视 力</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="3">听 力</td>
              <td colspan="20">
                左耳{{ detailDate.lefthearing }} / 右耳{{
                  detailDate.righthearing
                }}
              </td>
            </tr>
            <tr>
              <td colspan="3">牙数（颗）/龋齿数</td>
              <td colspan="20">{{ detailDate.fewteeth }} / 暂无数据</td>
            </tr>
            <tr>
              <td colspan="3">胸 部</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="3">腹 部</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="3">血红蛋白值*</td>
              <td colspan="20">
                {{ detailDate.hemoglobin }}
              </td>
            </tr>
            <tr>
              <td colspan="3">其 他</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">服用维生素 D</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">发育评估</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">两次随访间患病情况</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">转诊建议</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="4">指 导</td>
              <td colspan="20">
                {{ detailDate.guidancetreatment }}
              </td>
            </tr>
            <tr>
              <td colspan="4">下次随访日期</td>
              <td colspan="20">
                {{ detailDate.reservationsdate }}
              </td>
            </tr>
            <tr>
              <td colspan="4">随访医生签名</td>
              <td colspan="20">
                {{ detailDate.checkdoctor }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="explain">
          <p class="title">填表说明：</p>
          <p>
            1．填表时，按照项目栏的文字表述，在对应的选项前划“√”。若有其他异常，请具体
            描述。“——”表示本次随访时该项目不用检查。若失访，在随访日期处写明失访原因；若
            死亡，写明死亡日期和死亡原因。
          </p>
          <p>
            2．体重、身高：指检查时实测的具体数值。并根据国家卫生计生委选用的儿童生长发
            育评价标准，判断儿童体格发育情况，在相应的“上”、“中”、“下”上划“√”。
          </p>
          <p>
            3．体重/身高：身高别体重，根据儿童身高体重评价标准进行判断。
          </p>
          <p>
            4．体格检查 视力：填写具体数据，使用国际视力表或对数视力表均可。
            听力：3
            岁时使用行为测听的方法进行听力筛查，将结果在相应数字上划“√”。
            牙数与龋齿数：据实填写牙齿数和龋齿数。出现褐色或黑褐色斑点或斑块，表面粗糙，
            甚至出现明显的牙体结构破坏为龋齿。
            胸部：当未闻及心脏杂音，肺部呼吸音也无异常时，判断为“未见异常”，否则为“异
            常”。 腹部：肝脾触诊无异常，判断为“未见异常”，否则为“异常”。
            血红蛋白值：填写实际测查数据。4 岁、5 岁和 6
            岁可分别免费测一次血常规（或血红 蛋白）。
            其他：将体格检查中需要记录又不在标目限制范围之内的内容时记录在此。
          </p>
          <p>
            5.
            发育评估：发现发育问题在相应序号上打“√”。该年龄段任何一条预警征象阳性，
            提示有发育偏异的可能。
          </p>
          <p>
            6．两次随访间患病情况：在所患疾病后填写次数。
          </p>
          <p>
            7．其他：当有表格上未列入事宜，但须记录时，在“其他”栏目上填写。
          </p>
          <p>
            8．指导：做了哪些指导请在对应的选项上划“√”，可以多选，未列出的其他指导请具
            体填写。
          </p>
          <p>
            9．下次随访日期：根据儿童情况确定下次随访的日期，并告知家长。
          </p>
          <p>
            10．3 岁（满 3 周岁至 3 周岁 11 个月 29 天）；4 岁（满 4 周岁至 4
            周岁 11 个月 29 天）； 5 岁（满 5 周岁至 5 周岁 11 个月 29 天）；6
            岁（满 6 周岁至 6 周岁 11 个月 29 天），其他年
            龄段的健康检查内容可以增加健康检查记录表，标注随访月龄和随访时间。
          </p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-child-health-check',
  data() {
    return {
      code: null
    };
  },
  computed: {
    detailDate() {
      const date = this.detailServerDate;
      date.checkdate = date.checkdate?.$format('YYYY-MM-DD');
      date.reservationsdate = date.reservationsdate?.$format('YYYY-MM-DD');
      return date;
    }
  },
  created() {
    this.code = this.$route.query.id;
  },
  asyncComputed: {
    detailServerDate: {
      // 产后访视记录表详情
      async get() {
        return await this.$api.Person.childCheckDetail(this.code);
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

.record-child-health-check {
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
