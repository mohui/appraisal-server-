<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>第 1 次产前检查服务记录表</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div style="flex-grow: 1;height: 0; overflow-y: auto;">
        <el-row type="flex" class="record-head" justify="space-between">
          <el-col :span="6">
            姓名：<strong>{{ firstPrenatalCheckDate.name }}</strong>
          </el-col>
          <el-col :span="6"
            >编号：{{ firstPrenatalCheckDate.pre_newlydiagnosedcode }}</el-col
          >
        </el-row>
        <table class="record-first-prenatal-check-table">
          <tbody>
            <tr>
              <td colspan="4">填表日期</td>
              <td colspan="8">
                <em>{{
                  firstPrenatalCheckDate.newlydiagnoseddate.$format(
                    'YYYY-MM-DD'
                  )
                }}</em>
              </td>
              <td colspan="4">孕周</td>
              <td colspan="8">
                <em>
                  {{ firstPrenatalCheckDate.gestationalweeks }} 周
                  {{ firstPrenatalCheckDate.gestationalageday }} 天
                </em>
              </td>
            </tr>
            <tr>
              <td colspan="4">孕妇年龄</td>
              <td colspan="20">
                <em>{{ firstPrenatalCheckDate.age }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">丈夫姓名</td>
              <td colspan="4">
                <em>{{ firstPrenatalCheckDate.fathername }}</em>
              </td>
              <td colspan="4">丈夫年龄</td>
              <td colspan="4">
                <em>{{ firstPrenatalCheckDate.fatherage }}</em>
              </td>
              <td colspan="4">丈夫电话</td>
              <td colspan="4">
                <em>暂无数据</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">孕 次</td>
              <td colspan="4">
                <em>{{ firstPrenatalCheckDate.parity }}</em>
              </td>
              <td colspan="4">产 次</td>
              <td colspan="12">
                阴道分娩
                <em>
                  {{ firstPrenatalCheckDate.vaginaldelivery }}
                </em>
                次 剖宫产
                <em>
                  {{ firstPrenatalCheckDate.cesareansection }}
                </em>
                次
              </td>
            </tr>
            <tr>
              <td colspan="4">末次月经</td>
              <td colspan="4">
                <em>
                  {{
                    firstPrenatalCheckDate.lastmenstrual.$format('YYYY-MM-DD')
                  }}
                </em>
              </td>
              <td colspan="4">预 产 期</td>
              <td colspan="12">
                <em>
                  {{ firstPrenatalCheckDate.birth.$format('YYYY-MM-DD') }}
                </em>
              </td>
            </tr>
            <tr>
              <td colspan="4">既往史</td>
              <td colspan="20">
                <em>{{ firstPrenatalCheckDate.pasthistory }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">家族史</td>
              <td colspan="20">
                <em>{{ firstPrenatalCheckDate.familyhistory }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">个人史</td>
              <td colspan="20"><em>暂无数据</em></td>
            </tr>
            <tr>
              <td colspan="4">妇科手术史</td>
              <td colspan="20">
                <em>{{ firstPrenatalCheckDate.womansurgeryhistory }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">妇产史</td>
              <td colspan="20"><em>暂无数据</em></td>
            </tr>
            <tr>
              <td colspan="4">身高</td>
              <td colspan="8">
                <em>{{ firstPrenatalCheckDate.height }}</em> cm
              </td>
              <td colspan="4">体重</td>
              <td colspan="8">
                <em>{{ firstPrenatalCheckDate.weight }}</em> Kg
              </td>
            </tr>
            <tr>
              <td colspan="4">体质指数（BMI)</td>
              <td colspan="8">
                <em>{{ firstPrenatalCheckDate.height }}</em> kg/m2
              </td>
              <td colspan="4">血压</td>
              <td colspan="8">
                <em>{{ firstPrenatalCheckDate.systolicpressure }}</em> mmHg
              </td>
            </tr>
            <tr>
              <td colspan="4">听 诊</td>
              <td colspan="8">
                心脏： <em>{{ firstPrenatalCheckDate.heart }}</em>
              </td>
              <td colspan="12">
                肺部：<em>{{ firstPrenatalCheckDate.lung }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="3" colspan="4">妇科检查</td>
              <td colspan="5">外阴</td>
              <td colspan="5">
                <em>{{ firstPrenatalCheckDate.deputymilkgenital }}</em>
              </td>
              <td colspan="5">阴道</td>
              <td colspan="5">
                <em>{{ firstPrenatalCheckDate.vagina }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="5">宫颈</td>
              <td colspan="5">
                <em>{{ firstPrenatalCheckDate.cervical }}</em>
              </td>
              <td colspan="5">子宫</td>
              <td colspan="5">
                <em>暂无数据</em>
              </td>
            </tr>
            <tr>
              <td colspan="20">
                附件：<em>{{ firstPrenatalCheckDate.attachment }}</em>
              </td>
            </tr>
            <tr>
              <td rowspan="14" colspan="4">辅助检查</td>
              <td colspan="4">血常规</td>
              <td colspan="16">
                血红蛋白值<em>{{ firstPrenatalCheckDate.hemoglobin }}</em> g/L
                白细胞计数值 <em>{{ firstPrenatalCheckDate.interleukin }}</em
                >/L 血小板计数值
                <em>{{ firstPrenatalCheckDate.plateletcount }}</em
                >/L 其他
              </td>
            </tr>
            <tr>
              <td colspan="4">尿常规</td>
              <td colspan="16">
                尿蛋白<em>{{ firstPrenatalCheckDate.urinaryprotein }} </em>
                尿糖<em>{{ firstPrenatalCheckDate.urine }}</em> 尿酮体<em>{{
                  firstPrenatalCheckDate.ketone
                }}</em>
                尿潜血<em>{{ firstPrenatalCheckDate.urineOccultBlood }}</em>
                其他
              </td>
            </tr>
            <tr>
              <td rowspan="2" colspan="2">血型</td>
              <td colspan="2">ABO</td>
              <td colspan="16">
                <em>{{ firstPrenatalCheckDate.bloodType }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="2">Rh*</td>
              <td colspan="16"><em>暂无数据</em></td>
            </tr>
            <tr>
              <td colspan="4">血糖*</td>
              <td colspan="16">
                <em>{{ firstPrenatalCheckDate.sgpt_fastingplasmaglucose }}</em>
                mmol/L
              </td>
            </tr>
            <tr>
              <td colspan="4">肝功能</td>
              <td colspan="16">
                血清谷丙转氨酶
                <em>{{ firstPrenatalCheckDate.sgpt_alt }}</em> U/L
                血清谷草转氨酶
                <em>{{ firstPrenatalCheckDate.sgpt_ast }}</em> U/L 白蛋白
                <em>{{ firstPrenatalCheckDate.sgpt_alb }}</em> g/L 总胆红素
                <em>{{ firstPrenatalCheckDate.sgpt_tbili }}</em> μmol/L
                结合胆红素 <em>暂无数据</em> mmol/L
              </td>
            </tr>
            <tr>
              <td colspan="4">肾功能</td>
              <td colspan="16">
                血清肌酐
                <em>{{ firstPrenatalCheckDate.intoxicated }}</em> μmol/L 血尿素
                <em>{{ firstPrenatalCheckDate.urea }}</em> mmol/L
              </td>
            </tr>
            <tr>
              <td rowspan="2" colspan="4">阴道分泌物*</td>
              <td colspan="16">
                <em>{{ firstPrenatalCheckDate.vaginasecrete }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="16">阴道清洁度：<em>暂无数据</em></td>
            </tr>
            <tr>
              <td colspan="4">乙型肝炎</td>
              <td colspan="16">
                乙型肝炎表面抗原
                <em>{{ firstPrenatalCheckDate.hbsagin }}</em> 乙型肝炎表面抗体*
                <em>{{ firstPrenatalCheckDate.hbsab }}</em> 乙型肝炎 e 抗原*
                <em>{{ firstPrenatalCheckDate.hbeag }}</em> 乙型肝炎 e 抗体*
                <em>{{ firstPrenatalCheckDate.kanghbe }}</em> 乙型肝炎核心抗体*
                <em>{{ firstPrenatalCheckDate.kanghbc }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">梅毒血清学试验*</td>
              <td colspan="16">
                <em>{{ firstPrenatalCheckDate.rprscreen }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">HIV 抗体检测*</td>
              <td colspan="16">
                <em>{{ firstPrenatalCheckDate.hivscreening }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">B 超*</td>
              <td colspan="16">
                <em>{{ firstPrenatalCheckDate.bultrasonography }}</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">其他</td>
              <td colspan="16"><em>暂无数据</em></td>
            </tr>
            <tr>
              <td colspan="4">总体评估</td>
              <td colspan="20">
                <em>暂无数据</em>
              </td>
            </tr>
            <tr>
              <td colspan="4">保健指导</td>
              <td colspan="20">
                <em>暂无数据</em>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="explain">
          <p class="title">填表说明：</p>
          <p>
            1．本表由医生在第一次接诊孕妇（尽量在孕 13
            周前）时填写。若未建立居民健康档
            案，需同时建立。随访时填写各项目对应情况的数字。
          </p>
          <p>
            2．孕周：填写此表时孕妇的怀孕周数。
          </p>
          <p>
            3．孕次：怀孕的次数，包括本次妊娠。
          </p>
          <p>
            4．产次：指此次怀孕前，孕期超过 28 周的分娩次数。
          </p>
          <p>
            5．末次月经：此怀孕前最后一次月经的第一天。
          </p>
          <p>
            6．预产期：可按照末次月经推算，为末次月经日期的月份加 9 或减
            3，为预产期月 份数；天数加 7，为预产期日。
          </p>
          <p>
            7．既往史：孕妇曾经患过的疾病，可以多选。
          </p>
          <p>
            8．家族史：填写孕妇父亲、母亲、丈夫、兄弟姐妹或其他子女中是否曾患遗传性疾
            病或精神疾病，若有，请具体说明。
          </p>
          <p>
            9．个人史：可以多选。
          </p>
          <p>
            10．妇产科手术史：孕妇曾经接受过的妇科手术和剖宫产手术。
          </p>
          <p>11. 孕产史：根据具体情况填写，若有，填写次数，若无，填写“0”。</p>
          <p>12．体质指数（BMI）=体重（kg）/身高的平方（m2）。</p>
          <p>
            13．体格检查、妇科检查及辅助检查：进行相应检查，并填写检查结果。标有*的项
            目尚未纳入国家基本公共卫生服务项目，其中梅毒血清学试验、HIV
            抗体检测检查为重大 公共卫生服务免费测查项目。
          </p>
          <p>
            14．总体评估：根据孕妇总体情况进行评估，若发现异常，具体描述异常情况。
          </p>
          <p>15．保健指导：填写相应的保健指导内容，可以多选。</p>
          <p>16．转诊：若有需转诊的情况，具体填写。</p>
          <p>17．下次随访日期：根据孕妇情况确定下次随访日期，并告知孕妇。</p>
          <p>18．随访医生签名：随访完毕，核查无误后随访医生签署其姓名。</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-first-prenatal-check',
  data() {
    return {
      code: null
    };
  },
  created() {
    this.code = this.$route.query.id;
  },
  computed: {
    firstPrenatalCheckDate() {
      return this.firstPrenatalCheckServerDate;
    }
  },
  asyncComputed: {
    firstPrenatalCheckServerDate: {
      //体检记录
      async get() {
        return await this.$api.Person.firstPrenatalCheck(this.code);
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
.record-first-prenatal-check-table {
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
