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
      <div style="flex-grow: 1;height: 0; overflow-y: auto;">
        <table class="record-table">
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
            <tr>
              <td>(1)您精力充沛吗？（指精神头足，乐于做事）</td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (2)您容易疲乏吗？（指体力如何，是否稍微活动一下或做一点家务劳动
                就感到累）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (3)您容易气短，呼吸短促，接不上气吗？
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (4)您说话声音低弱无力吗?（指说话没有力气）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (5)您感到闷闷不乐、情绪低沉吗?（指心情不愉快，情绪低落）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (6)您容易精神紧张、焦虑不安吗?（指遇事是否心情紧张）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (7)您因为生活状态改变而感到孤独、失落吗？
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (8)您容易感到害怕或受到惊吓吗?
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (9)您感到身体超重不轻松吗?(感觉身体沉重) [BMI
                指数=体重（kg）/身高 2（m）]
              </td>
              <td>1 <br />(BMI＜24)</td>
              <td>2 <br />(24≤BMI＜25)</td>
              <td>3 <br />(25≤BMI＜26)</td>
              <td>4 <br />(26≤BMI＜28)</td>
              <td>5 <br />(BMI≥28)</td>
            </tr>
            <tr>
              <td>
                (10)您眼睛干涩吗?
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (11)您手脚发凉吗?（不包含因周围温度低或穿的少导致的手脚发冷）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (12)您胃脘部、背部或腰膝部怕冷吗？（指上腹部、背部、腰部或膝关
                节等，有一处或多处怕冷）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (13)您比一般人耐受不了寒冷吗？（指比别人容易害怕冬天或是夏天的
                冷空调、电扇等）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (14)您容易患感冒吗?（指每年感冒的次数）
              </td>
              <td>1 <br />一年＜2 次</td>
              <td>2 <br />一年感冒2-4 次</td>
              <td>3 <br />一年感冒5-6 次</td>
              <td>4 <br />一年 8 次以上</td>
              <td>5 <br />几乎每月</td>
            </tr>
            <tr>
              <td>
                (15)您没有感冒时也会鼻塞、流鼻涕吗?
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (16)您有口粘口腻，或睡眠打鼾吗？
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (17)您容易过敏(对药物、食物、气味、花粉或在季节交替、气候变化时)
                吗?
              </td>
              <td>1 <br />从来没有</td>
              <td>2 <br />一年 1、2 次</td>
              <td>3 <br />一年 3、4 次</td>
              <td>4 <br />一年 5、6 次</td>
              <td>5 <br />每次遇到上述原因都过敏</td>
            </tr>
            <tr>
              <td>
                (18)您的皮肤容易起荨麻疹吗? (包括风团、风疹块、风疙瘩)
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (19)您的皮肤在不知不觉中会出现青紫瘀斑、皮下出血吗?（指皮肤在没
                有外伤的情况下出现青一块紫一块的情况）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (20)您的皮肤一抓就红，并出现抓痕吗?（指被指甲或钝物划过后皮肤的反应）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (21)您皮肤或口唇干吗?
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (22)您有肢体麻木或固定部位疼痛的感觉吗？
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (23)您面部或鼻部有油腻感或者油亮发光吗?（指脸上或鼻子）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (24)您面色或目眶晦黯，或出现褐色斑块/斑点吗?
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (25)您有皮肤湿疹、疮疖吗？
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (26)您感到口干咽燥、总想喝水吗？
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (27)您感到口苦或嘴里有异味吗?（指口苦或口臭）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (28)您腹部肥大吗?（指腹部脂肪肥厚）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (29)您吃(喝)凉的东西会感到不舒服或者怕吃(喝)凉的东西吗？（指不喜
                欢吃凉的食物，或吃了凉的食物后会不舒服）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (30)您有大便黏滞不爽、解不尽的感觉吗?(大便容易粘在马桶或便坑壁
                上)
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (31)您容易大便干燥吗?
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (32)您舌苔厚腻或有舌苔厚厚的感觉吗?（如果自我感觉不清楚可由调查
                员观察后填写）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
            <tr>
              <td>
                (33)您舌下静脉瘀紫或增粗吗？（可由调查员辅助观察后填写）
              </td>
              <td>1</td>
              <td>2</td>
              <td>3</td>
              <td>4</td>
              <td>5</td>
            </tr>
          </tbody>
        </table>
        <table class="record-old-table">
          <thead>
            <tr>
              <th>体质类型</th>
              <th>气虚质</th>
              <th>阳虚质</th>
              <th>阴虚质</th>
              <th>痰湿质</th>
              <th>湿热质</th>
              <th>血瘀质</th>
              <th>气郁质</th>
              <th>特禀质</th>
              <th>平和质</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>体质辨识</th>
              <td>1．得分 2．是 3．倾向是</td>
              <td>1．得分 2．是 3．倾向是</td>
              <td>1．得分 2．是 3．倾向是</td>
              <td>1．得分 2．是 3．倾向是</td>
              <td>1．得分 2．是 3．倾向是</td>
              <td>1．得分 2．是 3．倾向是</td>
              <td>1．得分 2．是 3．倾向是</td>
              <td>1．得分 2．是 3．倾向是</td>
              <td>1．得分 2．是 3．倾向是</td>
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
              <td colspan="3">年 月 日</td>
              <td colspan="2">医生签名</td>
              <td colspan="3"></td>
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
        <table class="record-table">
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
                平和质（1）（2）（4）（5）（13）
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
    </el-card>
  </div>
</template>

<script>
//script
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
