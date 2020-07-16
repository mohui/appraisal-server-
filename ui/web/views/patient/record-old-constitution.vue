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
        <span>老年人中医药健康管理服务记录表</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="$router.go(-1)"
          >返回
        </el-button>
      </div>
      <div
        v-loading="isLoading"
        v-show="!isError"
        style="flex-grow: 1;height: 0; overflow-y: auto;"
      >
        <el-row type="flex" class="record-head" justify="space-between">
          <el-col :span="6">
            姓名：<strong>{{ person.constitution.name }}</strong>
          </el-col>
          <el-col :span="6">编号：{{ id }}</el-col>
        </el-row>
        <table class="record-old-table">
          <thead>
            <tr>
              <th>请根据近一年的体验和感觉，回答以下问题。</th>
              <th>没有 (根本不/从 来没有)</th>
              <th>很少 (有一点/偶尔)</th>
              <th>有时 (有些/少数时间)</th>
              <th>经常 (相当/多数时间)</th>
              <th>总是 (非常/每天)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) of person.questionnaire" :key="index">
              <td>{{ item.question }}</td>
              <td :class="{selected: item.optionCode === '1'}">
                1
              </td>
              <td :class="{selected: item.optionCode === '2'}">2</td>
              <td :class="{selected: item.optionCode === '3'}">3</td>
              <td :class="{selected: item.optionCode === '4'}">4</td>
              <td :class="{selected: item.optionCode === '5'}">5</td>
            </tr>
          </tbody>
        </table>
        <table class="record-old-table">
          <thead>
            <tr>
              <th>体质类型</th>
              <th
                v-for="(item, index) of typeList"
                :key="index"
                :class="{selected: item.isTrue || item.possible}"
              >
                {{ item.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>体质辨识</th>
              <td v-for="(item, index) of typeList" :key="index">
                1．得分
                <span class="selected">
                  {{ item.total }}
                </span>
                <br />
                <span :class="{selected: item.isTrue}">
                  2．是
                </span>
                <br /><span :class="{selected: item.possible}">
                  3．倾向是
                </span>
              </td>
            </tr>
            <tr>
              <th>中医药保健指导</th>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
              <td>
                1．情志调摄 2．饮食调养 3．起居调摄 4．运动保健 5．穴位保健
                6．其他：
              </td>
            </tr>
            <tr>
              <td colspan="2">填表日期</td>
              <td colspan="3">{{ person.constitution.date }}</td>
              <td colspan="2">医生签名</td>
              <td colspan="3">{{ person.constitution.doctor }}</td>
            </tr>
          </tbody>
        </table>
        <div class="explain">
          <p class="title">
            填表说明：
          </p>
          <p>
            1．该表采集信息时要能够反映老年人近一年来平时的感受，避免采集老年人的即时感受。
          </p>
          <p>2．采集信息时要避免主观引导老年人的选择。</p>
          <p>3．记录表所列问题不能空项，须全部询问填写。</p>
          <p>4．询问结果应在相应分值内划“√”，并将计算得分填写在相应空格内。</p>
          <p>
            5．体质辨识：医务人员应根据体质判定标准表（附件
            2）进行辨识结果判定，偏颇体质为“是”、“倾向是”，平和体质为“是”、“基本是”，并在相应选
            项上划 “√”。
          </p>
          <p>
            6．中医药保健指导：请在所提供指导对应的选项上划“√”，可多选。其他指导请注明。
          </p>
        </div>

        <p>（附件 2）体质判定标准表</p>
        <table class="record-old-table">
          <thead>
            <tr>
              <th>体质类型及对应条目</th>
              <th>条 件</th>
              <th>判定结果</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td rowspan="3">
                气虚质（2）（3）（4）（14） <br />阳虚质（11）（12）（13）（29）
                <br />阴虚质（10）（21）（26）（31）
                <br />痰湿质（9）（16）（28）（32）
                <br />湿热质（23）（25）（27）（30）
                <br />血瘀质（19）（22）（24）（33）
                <br />气郁质（5）（6）（7）（8）
                <br />特禀质（15）（17）（18）（20）
              </td>
              <td>各条目得分相加≥11 分</td>
              <td>是</td>
            </tr>
            <tr>
              <td>各条目得分相加 9～10 分</td>
              <td>倾向是</td>
            </tr>
            <tr>
              <td>各条目得分相加≤8 分</td>
              <td>否</td>
            </tr>
            <tr>
              <td rowspan="3">
                平和质（1）（2）（4）（5）（13）<br />
                （其中，（2）（4）（5）（13）反向计分， 即
                1→5，2→4，3→3，4→2，5→1）
              </td>
              <td>各条目得分相加≥17 分，同时其他 8 种体质得分都≤8 分</td>
              <td>是</td>
            </tr>
            <tr>
              <td>各条目得分相加≥17 分，同时其他 8 种体质得分都≤10 分</td>
              <td>基本是</td>
            </tr>
            <tr>
              <td>不满足上述条件者</td>
              <td>否</td>
            </tr>
          </tbody>
        </table>
        <div class="explain">
          <p class="title">
            填表说明：
          </p>
          <p>
            1．该表不用纳入居民的健康档案。
          </p>
          <p>
            2．体质辨识结果的准确性取决于接受服务者回答问题准确程度，如果出现自相矛盾的
            问题回答，则会出现自相矛盾的辨识结果，需要提供服务者核对其问题回答的准确性。
          </p>
          <p>处理 方案有以下几种：</p>
          <p>（1）在回答问题过程中及时提醒接受服务者理解所提问题。</p>
          <p>
            （2）出现两种及以上判定结果即兼夹体质是正常的，比如气阴两虚，则两个体质都如
            实记录，以分数高的为主要体质进行指导。
          </p>
          <p>
            （3）如果出现判定结果分数一致，则由中医师依据专业知识判定，然后进行指导。
          </p>
          <p>
            （4）如果出现既是阴虚又是阳虚这样的矛盾判定结果，要返回查找原因，帮助老年人
            准确采集信息，必要时候由中医师进行辅助判定。
          </p>
          <p>
            （5）如果出现每种体质都不是或者无法判断体质类型等情况，则返回查找原因，或需
            2 周后重新采集填写。
          </p>
        </div>
      </div>
      <div v-show="isError">
        数据请求出错，请及时联系管理员。
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-old-constitution',
  data() {
    return {
      id: null,
      isLoading: false,
      isError: false,
      typeList: [
        {
          name: '气虚质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [2, 3, 4, 14]
        },
        {
          name: '阳虚质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [11, 12, 13, 29]
        },
        {
          name: '阴虚质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [10, 21, 26, 31]
        },
        {
          name: '痰湿质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [9, 16, 28, 32]
        },
        {
          name: '湿热质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [23, 25, 27, 30]
        },
        {
          name: '血瘀质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [19, 22, 24, 33]
        },
        {
          name: '气郁质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [5, 6, 7, 8]
        },
        {
          name: '特禀质',
          also: '特秉质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [15, 17, 18, 20]
        },
        {
          name: '平和质',
          isTrue: false,
          possible: false,
          total: 0,
          range: [1, 2, 4, 5, 13]
        }
      ],
      person: {
        questionnaire: [
          {
            option: '',
            optionCode: '',
            question: '(1)您精力充沛吗？（指精神头足，乐于做事）',
            questionCode: '1',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(2)您容易疲乏吗？（指体力如何，是否稍微活动一下或做一点家务劳动就感到累）',
            questionCode: '2',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(3)您容易气短，呼吸短促，接不上气吗？',
            questionCode: '3',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(4)您说话声音低弱无力吗?（指说话没有力气）',
            questionCode: '4',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(5)您感到闷闷不乐、情绪低沉吗?（指心情不愉快，情绪低落）',
            questionCode: '5',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(6)您容易精神紧张、焦虑不安吗?（指遇事是否心情紧张）',
            questionCode: '6',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(7)您因为生活状态改变而感到孤独、失落吗？',
            questionCode: '7',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(8)您容易感到害怕或受到惊吓吗?',
            questionCode: '8',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(9)您感到身体超重不轻松吗?(感觉身体沉重) [BMI指数=体重（kg）/身高 2（m）]',
            questionCode: '9',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(10)您眼睛干涩吗?',
            questionCode: '10',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(11)您手脚发凉吗?（不包含因周围温度低或穿的少导致的手脚发冷）',
            questionCode: '11',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              ' (12)您胃脘部、背部或腰膝部怕冷吗？（指上腹部、背部、腰部或膝关节等，有一处或多处怕冷）',
            questionCode: '12',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(13)您比一般人耐受不了寒冷吗？（指比别人容易害怕冬天或是夏天的冷空调、电扇等）',
            questionCode: '13',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(14)您容易患感冒吗?（指每年感冒的次数）',
            questionCode: '14',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(15)您没有感冒时也会鼻塞、流鼻涕吗?',
            questionCode: '15',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(16)您有口粘口腻，或睡眠打鼾吗？',
            questionCode: '16',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(17)您容易过敏(对药物、食物、气味、花粉或在季节交替、气候变化时)吗?',
            questionCode: '17',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(18)您的皮肤容易起荨麻疹吗? (包括风团、风疹块、风疙瘩)',
            questionCode: '18',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(19)您的皮肤在不知不觉中会出现青紫瘀斑、皮下出血吗?（指皮肤在没有外伤的情况下出现青一块紫一块的情况）',
            questionCode: '19',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(20)您的皮肤一抓就红，并出现抓痕吗?（指被指甲或钝物划过后皮肤的反应）',
            questionCode: '20',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(21)您皮肤或口唇干吗?',
            questionCode: '21',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(22)您有肢体麻木或固定部位疼痛的感觉吗？',
            questionCode: '22',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(23)您面部或鼻部有油腻感或者油亮发光吗?（指脸上或鼻子）',
            questionCode: '23',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(24)您面色或目眶晦黯，或出现褐色斑块/斑点吗?',
            questionCode: '24',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(25)您有皮肤湿疹、疮疖吗？',
            questionCode: '25',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(26)您感到口干咽燥、总想喝水吗？',
            questionCode: '26',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(27)您感到口苦或嘴里有异味吗?（指口苦或口臭）',
            questionCode: '27',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(28)您腹部肥大吗?（指腹部脂肪肥厚）',
            questionCode: '28',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(29)您吃(喝)凉的东西会感到不舒服或者怕吃(喝)凉的东西吗？（指不喜欢吃凉的食物，或吃了凉的食物后会不舒服）',
            questionCode: '29',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(30)您有大便黏滞不爽、解不尽的感觉吗?(大便容易粘在马桶或便坑壁上)',
            questionCode: '30',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question: '(31)您容易大便干燥吗?',
            questionCode: '31',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(32)您舌苔厚腻或有舌苔厚厚的感觉吗?（如果自我感觉不清楚可由调查员观察后填写）',
            questionCode: '32',
            score: 0
          },
          {
            option: '',
            optionCode: '',
            question:
              '(33)您舌下静脉瘀紫或增粗吗？（可由调查员辅助观察后填写）',
            questionCode: '33',
            score: 0
          }
        ],
        constitution: {}
      }
    };
  },
  created() {
    const id = this.$route.query.id;
    if (!id) this.$router.go(-1);
    this.id = id;
    this.getQuestionnaireDetail(id);
  },
  methods: {
    async getQuestionnaireDetail(id) {
      this.isLoading = true;
      try {
        const {
          questionnaire,
          constitution
        } = await this.$api.Person.questionnaireDetail(id);

        this.person.constitution = Object.assign({}, constitution, {
          date: constitution?.date?.$format('YYYY-MM-DD')
        });

        this.person.questionnaire = this.person.questionnaire.map(it => {
          let cur = questionnaire.filter(
            item => item.questionCode === it.questionCode
          );
          if (cur.length > 0) {
            it.option = cur[0].option;
            it.optionCode = cur[0].optionCode;
            it.score = cur[0].score;
            it.secondScore = cur[0].secondScore;
          }
          return it;
        });
        this.typeList = this.typeList.map(it => {
          it.isTrue =
            constitution?.constitutiontype?.indexOf(it.name) > -1 ||
            constitution?.constitutiontype?.indexOf(it.also) > -1;

          it.possible =
            constitution?.constitutiontypepossible?.indexOf(it.name) > -1 ||
            constitution?.constitutiontypepossible?.indexOf(it.also) > -1;

          it.total = it.range
            .map(its => {
              return questionnaire
                .filter(item => +item.questionCode === its)
                .map(item =>
                  it.name !== '平和质' ? +item.score : +item.secondScore
                );
            })
            .flat()
            .reduce((acc, cur) => acc + cur, 0);
          return it;
        });
      } catch (e) {
        this.$message.error(e.message);
        this.isError = true;
      } finally {
        this.isLoading = false;
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
.record-old-table {
  width: 100%;
  max-width: 1200px;
  background-color: #fff;
  border-collapse: collapse;
  border-right: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  line-height: 2;
  tr {
    td,
    th {
      padding: 0 10px;
      border-top: 1px solid #ccc;
      border-left: 1px solid #ccc;
      sub {
        vertical-align: bottom;
      }
      &.selected,
      .selected {
        color: #409eff;
      }
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
