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
        <span>产后42天健康检查记录表</span>
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
            姓名：<strong>{{ detailDate.pregnantwomenname }}</strong>
          </el-col>
          <el-col :span="6">编号：{{ detailDate.examineno }}</el-col>
        </el-row>
        <table class="record-postpartum-42-days-check">
          <tbody>
            <tr>
              <td colspan="4">随访日期</td>
              <td colspan="20">
                {{ detailDate.visitdate.$format('YYYY-MM-DD') }}
              </td>
            </tr>
            <tr>
              <td colspan="4">分娩日期</td>
              <td colspan="8">暂无数据</td>
              <td colspan="4">出院日期</td>
              <td colspan="8">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">一般健康情况</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">一般心理状况</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">血 压(mmHg)</td>
              <td colspan="20">{{ detailDate.diastolicpressure }}</td>
            </tr>
            <tr>
              <td colspan="4">乳 房</td>
              <td colspan="20">{{ detailDate.breast }}</td>
            </tr>
            <tr>
              <td colspan="4">恶 露</td>
              <td colspan="20">{{ detailDate.lochia }}</td>
            </tr>
            <tr>
              <td colspan="4">子 宫</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">伤 口</td>
              <td colspan="20">{{ detailDate.perinealincision }}</td>
            </tr>
            <tr>
              <td colspan="4">其 他</td>
              <td colspan="20">{{ detailDate.other }}</td>
            </tr>
            <tr>
              <td colspan="4">分 类</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">指 导</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">处 理</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">随访医生签名</td>
              <td colspan="20">{{ detailDate.doctor }}</td>
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
  name: 'record-postpartum-42-days-check',
  data() {
    return {
      code: null
    };
  },
  created() {
    this.code = this.$route.query.id;
  },
  computed: {
    detailDate() {
      return this.detailServerDate;
    }
  },
  asyncComputed: {
    detailServerDate: {
      //体检记录
      async get() {
        return await this.$api.Person.recordPostpartum42DaysCheck(this.code);
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
.record-postpartum-42-days-check {
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
