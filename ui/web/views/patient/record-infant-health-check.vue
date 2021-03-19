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
        <span>1～8月龄儿童健康检查记录表</span>
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
        <table class="record-infant-health-check">
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
              <td colspan="4">身 长/cm</td>
              <td colspan="20">
                {{ detailDate.height }}
              </td>
            </tr>
            <tr>
              <td colspan="4">头 围/cm</td>
              <td colspan="20">
                {{ detailDate.headcircumference }}
              </td>
            </tr>
            <tr>
              <td rowspan="16" colspan="1">体格检查</td>
              <td colspan="3">面 色</td>
              <td colspan="20">
                {{ detailDate.face }}
              </td>
            </tr>
            <tr>
              <td colspan="3">皮 肤</td>
              <td colspan="20">
                {{ detailDate.skin }}
              </td>
            </tr>
            <tr>
              <td colspan="3">前 囟</td>
              <td colspan="20">
                {{ detailDate.fontanelle }}
              </td>
            </tr>
            <tr>
              <td colspan="3">颈部包块</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="3">眼 睛</td>
              <td colspan="20">
                {{ detailDate.eyes }}
              </td>
            </tr>
            <tr>
              <td colspan="3">耳</td>
              <td colspan="20">
                {{ detailDate.ear }}
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
              <td colspan="3">口 腔</td>
              <td colspan="20">
                {{ detailDate.oral }}
              </td>
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
              <td colspan="3">脐 部</td>
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
              <td colspan="3">可疑佝偻病症状</td>
              <td colspan="20">
                {{ detailDate.ricketsSeems }}
              </td>
            </tr>
            <tr>
              <td colspan="3">可疑佝偻病体征</td>
              <td colspan="20">
                暂无数据
              </td>
            </tr>
            <tr>
              <td colspan="3">肛门/外生殖器</td>
              <td colspan="20">
                {{ detailDate.genitaliainfo }}
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
            1．姓名：填写新生儿的姓名。如没有取名则填写母亲姓名＋之男或之女。若不是以新
            生儿的身份纳入管理，则填写该表至“出生情况”一栏后，按照对应月龄填写其他的检查记
            录表。
          </p>
          <p>
            2．出生日期：按照年（4 位）、月（2 位）、日（2 位）顺序填写，如
            20080101。
          </p>
          <p>
            3．身份证号：填写新生儿身份证号，若无，可暂时空缺，待户口登记后再补填。
          </p>
          <p>
            4．父亲、母亲情况：分别填写新生儿父母的姓名、职业、联系电话、出生日期。
          </p>
          <p>
            5．出生孕周：指新生儿出生时母亲怀孕周数。
          </p>
          <p>
            6．助产机构名称：对于非住院分娩的情况写无。
          </p>
          <p>
            7．新生儿听力筛查：询问是否做过新生儿听力筛查，将询问结果相应在“通过”、“未
            通过”、“未筛查”上划“√”。若不清楚在“不详”上划“√”
          </p>
          <p>
            8.新生儿疾病筛查：询问是否做过新生儿甲低、新生儿苯丙酮尿症及其他遗传代谢病的
            筛查，筛查过的在相应疾病上面划“√”；若进行了其他遗传代谢病检查，将筛查的疾病名
            称填入。可多选。
          </p>
          <p>
            9. 喂养方式：将询问结果在相应方式上划“√”。 纯母乳喂养
            指只给婴儿喂母乳，而不给其他任何的液体和固体食物。但允许在有医学
            指征的情况下，加喂药物、维生素和矿物质。 混合喂养
            指婴儿喂母乳同时，喂其他乳类及乳制品。 人工喂养
            指无母乳，完全给婴儿喂其他乳类和代乳品
          </p>
          <p>
            10．吃奶量和吃奶次数：纯母乳或混合喂养儿童不必填写吃奶量。
          </p>
          <p>
            11．黄疸部位：可多选。
          </p>
          <p>
            12.查体
            眼睛：婴儿有目光接触，眼球能随移动的物体移动，结膜无充血、溢泪、溢脓时，判断
            为“未见异常”，否则为“异常”。
            耳外观：当外耳无畸形、外耳道无异常分泌物，无外耳湿疹，判断为“未见异常”，否
            则为“异常”。
            鼻：当外观正常且双鼻孔通气良好时，判断为“未见异常”，否则为“异常”。
            口腔：当无唇腭裂、高腭弓、诞生牙、口炎及其他口腔异常时，判断为“未见异常”，
            否则为“异常”。
            胸部：当未闻及心脏杂音，心率和肺部呼吸音无异常时，判断为“未见异常”，否则为
            “异常”。 腹部：肝脾触诊无异常时，判断为“未见异常”，否则为“异常”。
            四肢活动度：上下肢活动良好且对称，判断为“未见异常”，否则为“异常”。
            颈部包块:触摸颈部是否有包块，根据触摸结果，在“有”或“无”上划“√”。
            皮肤：当无色素异常，无黄疸、发绀、苍白、皮疹、包块、硬肿、红肿等，腋下、颈部、
            腹股沟部、臀部等皮肤皱褶处无潮红或糜烂时，判断为“未见异常”，可多选。
            肛门：当肛门完整无畸形时，判断为“未见异常”，否则为“异常”。
            外生殖器：当男孩无阴囊水肿、鞘膜积液、隐睾，女孩无阴唇粘连，外阴颜色正常时，
            判断为“未见异常”，否则为“异常”。
          </p>
          <p>
            13．脐带：可多选。
          </p>
          <p>
            14
            指导：做了哪些指导请在对应的选项上划“√”，可以多选，未列出的其他指导请具
            体填写。
          </p>
          <p>
            15．下次随访日期：根据儿童情况确定下次随访的日期，并告知家长。
          </p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'record-infant-health-check',
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

.record-infant-health-check {
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
