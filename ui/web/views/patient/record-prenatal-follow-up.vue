<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: $settings.isMobile ? 'calc(100% - 60px)' : 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '0' : '20px'
      }"
    >
      <div slot="header" class="clearfix">
        <span>产前随访服务信息表</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div v-hidden-scroll style="flex-grow: 1;height: 0; overflow-y: auto;">
        <div class="record-head">
          <div style="float: right;">
            编号：{{ detailDate.prenatalcarecode }}
          </div>
          姓名：<strong>{{ detailDate.name }}</strong>
        </div>
        <table class="record-table">
          <tbody>
            <tr>
              <td colspan="4">(随访/督促)日期</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">孕 周</td>
              <td colspan="20">{{ detailDate.diseasehistory }}</td>
            </tr>
            <tr>
              <td colspan="4">主 诉</td>
              <td colspan="20">{{ detailDate.chiefcomplaint }}</td>
            </tr>
            <tr>
              <td colspan="4">体重（kg）</td>
              <td colspan="20">{{ detailDate.weight }}</td>
            </tr>
            <tr>
              <td rowspan="4" colspan="2">产科检查</td>
              <td colspan="2">宫底高度（cm）</td>
              <td colspan="20">{{ detailDate.uterinehigh }}</td>
            </tr>
            <tr>
              <td colspan="2">腹围（cm）</td>
              <td colspan="20">{{ detailDate.abdominalcircumference }}</td>
            </tr>
            <tr>
              <td colspan="2">胎 位</td>
              <td colspan="20">{{ detailDate.fetalposition }}</td>
            </tr>
            <tr>
              <td colspan="2">胎心率（次/分钟）</td>
              <td colspan="20">{{ detailDate.fetalheartrate }}</td>
            </tr>
            <tr>
              <td colspan="4">血压（mmHg）</td>
              <td colspan="20">{{ detailDate.assertpressure }}</td>
            </tr>
            <tr>
              <td colspan="4">血红蛋白（g/L）</td>
              <td colspan="20">{{ detailDate.hemoglobin }}</td>
            </tr>
            <tr>
              <td colspan="4">尿蛋白</td>
              <td colspan="20">{{ detailDate.urinaryprotein }}</td>
            </tr>
            <tr>
              <td colspan="4">其他辅助检查*</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">分 类</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">指 导</td>
              <td colspan="20">{{ detailDate.guide }}</td>
            </tr>
            <tr>
              <td colspan="4">转 诊</td>
              <td colspan="20">暂无数据</td>
            </tr>
            <tr>
              <td colspan="4">下次随访日期</td>
              <td colspan="20">{{ detailDate.nextappointmentdate }}</td>
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
            1．孕周：此次随访时的妊娠周数。
          </p>
          <p>
            2．主诉：填写孕妇自述的主要症状和不适。
          </p>
          <p>
            3．体重：填写此次测量的体重。
          </p>
          <p>
            4．产科检查：按照要求进行产科检查，填写具体数值。
          </p>
          <p>
            5．血红蛋白、尿蛋白：填写血红蛋白、尿蛋白检测结果。
          </p>
          <p>
            6．其他辅助检查：若有，填写此处。
          </p>
          <p>
            7．分类：根据此次随访的情况，对孕妇进行分类，若发现异常，写明具体情况。
          </p>
          <p>
            8．指导：可以多选，未列出的其他指导请具体填写。
          </p>
          <p>
            9．转诊：若有需转诊的情况，具体填写。
          </p>
          <p>
            10．下次随访日期：根据孕妇情况确定下次随访日期，并告知孕妇。
          </p>
          <p>
            11．随访医生签名：随访完毕，核查无误后医生签名。
          </p>
          <p>
            12．第 2～5
            次产前随访服务，应该在确定好的有助产技术服务资质的医疗卫生机构
            进行相应的检查，并填写相关结果；没有条件的基层医疗卫生机构督促孕产妇前往有资质
            的机构进行相关随访，注明督促日期，无需填写相关记录。
          </p>
          <p>
            13.
            若失访，在随访日期处写明失访原因；若死亡，写明死亡日期和死亡原因。
          </p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-prenatal-follow-up',
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
        return await this.$api.Person.recordPrenatalFollowUp(this.code);
      },
      default() {
        return [];
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import './detail.scss';
</style>
