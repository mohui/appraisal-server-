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
      <div v-hidden-scroll style="flex-grow: 1;height: 0; overflow-y: auto;">
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
                {{ detailDate.visitdate }}
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
            1．一般健康状况：对产妇一般情况进行检查，具体描述并填写。
          </p>
          <p>
            2.一般心理状况：评估是否有产后抑郁的症状。
          </p>
          <p>
            3．血压：如有必要，测量产妇血压，填写具体数值。
          </p>
          <p>
            4．乳房、恶露、子宫、伤口：对产妇进行检查，若有异常，具体描述。
          </p>
          <p>
            5．分类：根据此次随访情况，对产妇进行分类，若为未恢复，具体写明情况。
          </p>
          <p>
            6．指导：可以多选，未列出的其他指导请具体填写。
          </p>
          <p>
            7．处理：若产妇已恢复正常，则结案。若有需转诊的情况，具体填写。
          </p>
          <p>
            8．随访医生签名：检查完毕，核查无误后检查医生签名。
          </p>
          <p>
            9．若失访，在随访日期处写明失访原因；若死亡，写明死亡日期和死亡原因。
          </p>
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
      const date = this.detailServerDate;
      date.visitdate = date.visitdate?.$format('YYYY-MM-DD');
      return date;
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
