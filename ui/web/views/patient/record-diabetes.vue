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
        <span>2 型糖尿病患者随访服务记录表</span>
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
            姓名：<strong>{{ person.name }}</strong>
          </el-col>
          <el-col :span="6">编号：{{ person.No }}</el-col>
        </el-row>
        <table class="record-table">
          <colgroup>
            <col width="50" />
            <col width="160" />
            <col />
          </colgroup>
          <tbody>
            <tr>
              <td colspan="2">随访日期</td>
              <td>{{ person.followUpDate }}</td>
            </tr>
            <tr>
              <td colspan="2">随访方式</td>
              <td>
                <el-radio-group v-model="person.followUpWay">
                  <el-radio label="01">1 门诊</el-radio>
                  <el-radio label="02">2 家庭</el-radio>
                  <el-radio label="03">3 电话</el-radio>
                </el-radio-group>
              </td>
            </tr>
            <tr>
              <td rowspan="2">症状</td>
              <td rowspan="2" style="text-align: left;">
                1 无症状 <br />2 多饮 <br />3 多食 <br />4 多尿 <br />5 视力模糊
                <br />6 感染 <br />7 手脚麻木 <br />8 下肢浮肿 <br />9
                体重明显下降
              </td>
              <td>
                <el-checkbox-group v-model="person.symptoms">
                  <el-checkbox label="无症状"></el-checkbox>
                  <el-checkbox label="多饮"></el-checkbox>
                  <el-checkbox label="多食"></el-checkbox>
                  <el-checkbox label="多尿"></el-checkbox>
                  <el-checkbox label="视力模糊"></el-checkbox>
                  <el-checkbox label="感染"></el-checkbox>
                  <el-checkbox label="手脚麻木"></el-checkbox>
                  <el-checkbox label="下肢浮肿"></el-checkbox>
                  <el-checkbox label="体重明显下降"></el-checkbox>
                </el-checkbox-group>
              </td>
            </tr>
            <tr>
              <td>其它 <br /><br /><br /><br /><br /><br /><br /><br /></td>
            </tr>
            <tr>
              <td rowspan="5">体征</td>
              <td>血 压<sub>（mmHg）</sub></td>
              <td>
                收缩压: {{ person.systolicPressure }} 舒张压:
                {{ person.assertPressure }}
              </td>
            </tr>
            <tr>
              <td>体 重<sub>（kg）</sub></td>
              <td>{{ person.weight }}</td>
            </tr>
            <tr>
              <td>体质指数<sub>（kg/m2）</sub></td>
              <td>{{ person.BMI }}</td>
            </tr>
            <tr>
              <td>足背动脉搏动</td>
              <td>
                {{ person.arterial }} 1 触及正常 □ <br />2 减弱（双侧 左侧
                右侧） <br />3 消失（双侧 左侧 右侧）
              </td>
            </tr>
            <tr>
              <td>其 他</td>
              <td>{{ person.other }}</td>
            </tr>
            <tr>
              <td rowspan="6">生活方式指导</td>
              <td>日吸烟量</td>
              <td>{{ person.daySmoke }} / 支</td>
            </tr>
            <tr>
              <td>日饮酒量</td>
              <td>{{ person.dayDrink }} / 两</td>
            </tr>
            <tr>
              <td>运 动</td>
              <td>
                {{ person.exerciseWeek }}次/周
                {{ person.exerciseMinute }}分钟/次 <br />建议：{{
                  person.exerciseWeekSuggest
                }}次/周 {{ person.exerciseMinuteSuggest }}分钟/次
              </td>
            </tr>
            <tr>
              <td>主食<sub>（克/天）</sub></td>
              <td>
                {{ person.principalFood }}
              </td>
            </tr>
            <tr>
              <td>心理调整</td>
              <td>1 良好 2 一般 3 差 □</td>
            </tr>
            <tr>
              <td>遵医行为</td>
              <td>1 良好 2 一般 3 差 □</td>
            </tr>
            <tr>
              <td rowspan="2">辅助检查</td>
              <td>
                空腹血糖值
              </td>
              <td>mmol/L</td>
            </tr>
            <tr>
              <td>其他检查*</td>
              <td>
                糖化血红蛋白 ％<br />
                检查日期： 月 日<br /><br /><br /><br /><br />
              </td>
            </tr>
            <tr>
              <td colspan="2">服药依从性</td>
              <td>
                <input type="radio" name="adherence" />1 规律
                <input type="radio" name="adherence" />2 间断
                <input type="radio" name="adherence" />3 不服药
              </td>
            </tr>
            <tr>
              <td colspan="2">药物不良反应</td>
              <td>
                1 无 2 有
              </td>
            </tr>
            <tr>
              <td colspan="2">低血糖反应</td>
              <td>
                1 无 2 偶尔 3 频繁
              </td>
            </tr>
            <tr>
              <td colspan="2">此次随访分类</td>
              <td>
                1控制满意 2控制不满意 <br />
                3不良反应 4并发症
              </td>
            </tr>
            <tr>
              <td rowspan="7">用药情况</td>
              <td>药物名称 1</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>用法用量</td>
              <td>每日 次 每次</td>
            </tr>
            <tr>
              <td>药物名称 2</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>用法用量</td>
              <td>每日 次 每次</td>
            </tr>
            <tr>
              <td>药物名称 3</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td>用法用量</td>
              <td>每日 次 每次</td>
            </tr>
            <tr>
              <td>胰岛素</td>
              <td>
                种类：<br />
                用法和用量：
              </td>
            </tr>
            <tr>
              <td rowspan="2">转诊</td>
              <td>
                原 因
              </td>
              <td></td>
            </tr>
            <tr>
              <td>机构及科别</td>
              <td></td>
            </tr>
            <tr>
              <td colspan="2">下次随访日期</td>
              <td>0</td>
            </tr>
            <tr>
              <td colspan="2">随访医生签名</td>
              <td>{{ person.doctor }}</td>
            </tr>
          </tbody>
        </table>
        <div class="explain">
          <p class="title">填表说明：</p>
          <p>
            1．本表为 2
            型糖尿病患者在接受随访服务时由医生填写。每年的健康体检填写健康体
            检表。若失访，在随访日期处写明失访原因；若死亡，写明死亡日期和死亡原因。
          </p>
          <p>
            2．体征：体质指数（BMI)=体重（kg）/身高的平方（m2），体重和体质指数斜线前填写
            目前情况，斜线后填写下次随访时应调整到的目标。如果是超重或是肥胖的患者，要求每次
            随访时测量体重并指导患者控制体重；正常体重人群可每年测量一次体重及体质指数。如有
            其他阳性体征，请填写在“其他”一栏。
          </p>
          <p>
            3．生活方式指导：在询问患者生活方式时，同时对患者进行生活方式指导，与患者共
            同制定下次随访目标。
            日吸烟量：斜线前填写目前吸烟量，不吸烟填“0”，吸烟者写出每天的吸烟量“××支”，
            斜线后填写吸烟者下次随访目标吸烟量“××支”。
            日饮酒量：斜线前填写目前饮酒量，不饮酒填“0”，饮酒者写出每天的饮酒量相当于白
            酒“××两”，斜线后填写饮酒者下次随访目标饮酒量相当于白酒“××两”。（啤酒/10=白
            酒量，红酒/4=白酒量，黄酒/5=白酒量）。
            运动：填写每周几次，每次多少分钟。即“××次／周，××分钟／次”。横线上填写
            目前情况，横线下填写下次随访时应达到的目标。
            主食：根据患者的实际情况估算主食（米饭、面食、饼干等淀粉类食物）的摄入量。为
            每天各餐的合计量。 心理调整：根据医生印象选择对应的选项。
            遵医行为：指患者是否遵照医生的指导去改善生活方式。
          </p>
          <p>
            4．辅助检查：为患者进行空腹血糖检查，记录检查结果、。若患者在上次随访到此次随
            访之间到各医疗机构进行过糖化血红蛋白（控制目标为
            7%，随着年龄的增长标准可适当放 宽）或其他辅助检查，应如实记录。
          </p>
          <p>
            5．服药依从性：“规律”为按医嘱服药，“间断”为未按医嘱服药，频次或数量不足，
            “不服药”即为医生开了处方，但患者未使用此药。
          </p>
          <p>
            6．药物不良反应：如果患者服用的降糖药物有明显的药物不良反应，具体描述哪种药
            物，何种不良反应。
          </p>
          <p>
            7．低血糖反应：根据上次随访到此次随访之间患者出现的低血糖反应情况。
          </p>
          <p>
            8．此次随访分类：根据此次随访时的分类结果，由责任医生在 4
            种分类结果中选择一
            项在“□”中填上相应的数字。“控制满意”是指血糖控制满意，无其他异常、“控制不满意”
            是指血糖控制不满意，无其他异常、“不良反应”是指存在药物不良反应、“并发症”是指出
            现新的并发症或并发症出现异常。如果患者同时并存几种情况，填写最严重的一种情况，同
            时结合上次随访情况确定患者下次随访时间，并告知患者。
          </p>
          <p>
            9．用药情况：根据患者整体情况，为患者开具处方，并填写在表格中，写明用法、用
            量。同时记录其他医疗卫生机构为其开具的处方药。
          </p>
          <p>
            10．转诊：如果转诊要写明转诊的医疗机构及科室类别，如××市人民医院内分泌科，
            并在原因一栏写明转诊原因。
          </p>
          <p>
            11.下次随访日期：根据患者此次随访分类，确定下次随访日期，并告知患者。
          </p>
          <p>12．随访医生签名：随访完毕，核查无误后随访医生签署其姓名。</p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-diabetes',
  data() {
    return {
      id: null,
      person: {
        BMI: '',
        BMISuggest: '',
        No: null,
        arterial: '',
        assertPressure: '',
        checkTime: '',
        dayDrink: 0,
        dayDrinkSuggest: 0,
        daySmoke: '',
        daySmokeSuggest: '',
        doctor: '',
        exerciseMinute: '',
        exerciseMinuteSuggest: '',
        exerciseWeek: '',
        exerciseWeekSuggest: '',
        fastingGlucose: '',
        followUpDate: '',
        followUpWay: '',
        gender: '',
        hemoglobin: null,
        hospital: '',
        id: '',
        idCard: '',
        name: '',
        other: '',
        postprandialGlucose: null,
        principalFood: '',
        principalFoodSuggest: '',
        stature: '',
        symptoms: '',
        systolicPressure: 0,
        updateAt: '',
        weight: 0,
        weightSuggest: 0
      }
    };
  },
  created() {
    const id = this.$route.query.id;
    if (!id) this.$router.go(-1);
    this.id = id;
    this.getDiabetesDetail(id);
  },
  methods: {
    async getDiabetesDetail(id) {
      try {
        let result = await this.$api.Person.diabetesDetail(id);
        console.log(result);
        if (result.length > 0) {
          this.person = Object.assign({}, result[0], {
            followUpDate: result[0].followUpDate.$format('YYYY-MM-DD'),
            updateAt: result[0].updateAt.$format()
          });
        }
      } catch (e) {
        this.$message.error(e.message);
      }
    }
  }
};
</script>

<style lang="scss">
.record-head {
  width: 100%;
  max-width: 1200px;
  margin-bottom: 10px;
}
.record-table {
  width: 100%;
  max-width: 1200px;
  background-color: #fff;
  border-collapse: collapse;
  border-right: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  line-height: 2;
  tr {
    td {
      padding: 0 10px;
      border-top: 1px solid #ccc;
      border-left: 1px solid #ccc;
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
