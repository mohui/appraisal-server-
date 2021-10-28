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
        <span>12～30月龄儿童健康检查记录表</span>
        <el-button
          style="float: right; margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div v-hidden-scroll style="flex-grow: 1; height: 0; overflow-y: auto;">
        <el-row type="flex" justify="space-between" class="record-head">
          <el-col :span="6">
            姓名：<strong>{{ detailDate.childname }}</strong>
          </el-col>
          <el-col :span="6">编号：{{ detailDate.medicalcode }}</el-col>
        </el-row>
        <table class="record-toddler-health-check">
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
              <td colspan="4">身长(高)/cm</td>
              <td colspan="20">
                {{ detailDate.height }}
              </td>
            </tr>
            <tr>
              <td rowspan="13" colspan="1">体格检查</td>
              <td colspan="3">面 色</td>
              <td colspan="20">
                {{ detailDate.face }}
              </td>
            </tr>
            <tr>
              <td colspan="3">皮肤</td>
              <td colspan="20">{{ detailDate.skin }}</td>
            </tr>
            <tr>
              <td colspan="3">前 囟</td>
              <td colspan="20">
                {{ detailDate.fontanelle }}
              </td>
            </tr>
            <tr>
              <td colspan="3">眼 睛</td>
              <td colspan="20">
                {{ detailDate.eyes }}
              </td>
            </tr>
            <tr>
              <td colspan="3">耳外观</td>
              <td colspan="20">{{ detailDate.ear }}</td>
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
              <td colspan="3">出牙/龋齿数（颗）</td>
              <td colspan="20">暂无数据</td>
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
              <td colspan="3">四 肢</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="3">步 态</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="3">可疑佝偻病体征</td>
              <td colspan="20">
                {{ detailDate.signsrickets }}
              </td>
            </tr>
            <tr>
              <td colspan="3">血红蛋白值</td>
              <td colspan="20">
                {{ detailDate.hemoglobin }}
              </td>
            </tr>
            <tr>
              <td colspan="4">户外活动</td>
              <td colspan="20">
                {{ detailDate.outdoortime }}
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
            1．填表时，按照项目栏的文字表述，根据查体结果在对应的序号上划“√”。“——”
            表示本次随访时该项目不用检查。若失访，在随访日期处写明失访原因；若死亡，写明死亡
            日期和死亡原因。
          </p>
          <p>
            2．体重、身长（高）：指检查时实测的具体数值。并根据国家卫生计生委选用的儿童生
            长发育评价标准，判断儿童体格发育情况，在相应的“上”、“中”、“下”上划“√”。
          </p>
          <p>
            3．体格检查
            皮肤：当无皮疹、湿疹、增大的体表淋巴结等，判断为“未见异常”，否则为“异常”。
            前囟：如果未闭，请填写具体的数值。
            眼睛：结膜无充血、无溢泪、无流脓判断为“未见异常”，否则为“异常”。
            耳外观：外耳无湿疹、畸形、外耳道无异常分泌物，判断为“未见异常”，否则为“异
            常”。
            听力：使用行为测听的方法进行听力筛查。检查时应避开小儿的视线，分别从不同的方
            向给予不同强度的声音，观察孩子的反应，根据所给声音的大小，大致地估测听力正常与否。
            出牙/龋齿数（颗）：填入出牙颗数和龋齿颗数。出现褐色或黑褐色斑点或斑块，表面粗
            糙，甚至出现明显的牙体结构破坏为龋齿。
            胸部：当未闻及心脏杂音，肺部呼吸音也无异常时，判断为“未见异常”，否则为“异
            常”。 腹部：肝脾触诊无异常，判断为“未见异常”，否则为“异常”。
            四肢：上下肢活动良好且对称，判断为“未见异常”，否则为“异常”。
            步态：无跛行，判断为“未见异常”，否则为“异常”。
            可疑佝偻病体征：根据体征的有无在对应选项上划“√”。 血红蛋白值：18
            月和 30 月可分别免费测一次血常规（或血红蛋白）。
          </p>
          <p>
            4．户外活动：询问家长儿童在户外活动的平均时间后填写。
          </p>
          <p>
            5．服用维生素 D：填写具体的维生素 D
            名称、每日剂量，按实际补充量填写，未补充， 填写“0”。
          </p>
          <p>
            6.
            发育评估：发现发育问题在相应序号上打“√”。该年龄段任何一条预警征象阳性，
            提示有发育偏异的可能。
          </p>
          <p>
            7．两次随访间患病情况：填写上次随访到本次随访间儿童所患疾病情况，若有，填写
            具体疾病名称。
          </p>
          <p>
            8．转诊建议：转诊无、有在相应数字上划“√”。并将转诊原因及接诊机构名称填入。
          </p>
          <p>
            9．指导：做了哪些指导请在对应的选项上划“√”，可以多选，未列出的其他指导请具
            体填写。
          </p>
          <p>
            10．下次随访日期：根据儿童情况确定下次随访的日期，并告知家长。
          </p>
          <p>
            11．12 月（满 12 月至 12 月 29 天）；18 月（满 18 月至 18 月 29
            天）；24 月（满 24 月 至 24 月 29 天）；30 月（满 30 月至 30 月 29
            天），其他月龄段的健康检查内容可以增加健康
            检查记录表，标注随访月龄和随访时间。
          </p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-toddler-health-check',
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

.record-toddler-health-check {
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
