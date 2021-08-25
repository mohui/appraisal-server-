<template>
  <div style="height: 100%;">
    <el-row :gutter="10" style="height: 100%;">
      <el-col :span="6" :xs="24">
        <card v-loading="$asyncComputed.document.updating" :patient="person" />
        <el-alert
          title="注意: 档案内容为最近一次同步数据, 与年度无关!"
          type="error"
          center
          :closable="false"
          show-icon
        >
        </el-alert>
      </el-col>
      <el-col :span="18" :xs="24" style="height: 100%;">
        <el-card
          v-loading="$asyncComputed.personDetailSeverData.updating"
          shadow="never"
          style="height: 100%;"
          :body-style="{
            height: 'calc(100% - 40px)',
            padding: $settings.isMobile ? '10px 0 0' : '20px'
          }"
          ><el-button
            style="position: absolute;top:15px;right:30px;z-index: 9;"
            size="small"
            type="primary"
            @click="$router.go(-1)"
            >返回
          </el-button>
          <el-tabs
            v-model="activeTab"
            class="patient-tab-list"
            :style="{width: $settings.isMobile ? '100%' : 'calc(100% - 70px)'}"
          >
            <el-tab-pane
              label="个人基本信息表"
              name="personal"
              v-if="personDetailSeverData.length"
            >
              <div>
                <div style="padding: 5px;">
                  <div style="float: right;">
                    编号：{{ personDetailData.id }}
                  </div>
                  姓名：<strong>{{ personDetailData.name }}</strong>
                </div>

                <table class="base-info-table">
                  <tbody>
                    <tr>
                      <td colspan="4">性别</td>
                      <td colspan="12">
                        1男 2女 9未说明的性别 0未知的性别
                        <em>{{ personDetailData.gender }}</em>
                      </td>
                      <td colspan="4">出生日期</td>
                      <td colspan="4">
                        <em>{{ personDetailData.birth }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">身份证号</td>
                      <td colspan="8">
                        <em>{{ personDetailData.idCard }}</em>
                      </td>
                      <td colspan="4">工作单位</td>
                      <td colspan="8">
                        <em>{{ personDetailData.workUnit }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">本人电话</td>
                      <td colspan="4">
                        <em>{{ personDetailData.phone }}</em>
                      </td>
                      <td colspan="4">联系人姓名</td>
                      <td colspan="4">
                        <em>{{ personDetailData.contactName }}</em>
                      </td>
                      <td colspan="4">联系人电话</td>
                      <td colspan="4">
                        <em>{{ personDetailData.contactPhone }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">常住类型</td>
                      <td colspan="8">
                        <el-radio-group
                          v-model="personDetailData.livingConditions"
                        >
                          <el-radio label="1">1户籍</el-radio>
                          <el-radio label="2">2非户籍</el-radio>
                        </el-radio-group>
                      </td>
                      <td colspan="4">民族</td>
                      <td colspan="8">
                        1汉族 2少数民族
                        <em>{{ personDetailData.national }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">血型</td>
                      <td colspan="20">
                        <el-radio-group v-model="personDetailData.blood">
                          <el-radio label="1">A型</el-radio>
                          <el-radio label="2">B型</el-radio>
                          <el-radio label="3">O型</el-radio>
                          <el-radio label="4">AB型</el-radio>
                          <el-radio label="5">不详</el-radio>
                        </el-radio-group>
                        /
                        <el-radio-group v-model="personDetailData.RH">
                          <el-radio label="1">阴性</el-radio>
                          <el-radio label="2">阳性</el-radio>
                          <el-radio label="3">不详</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">文化程度</td>
                      <td colspan="20">
                        <el-radio-group v-model="personDetailData.education">
                          <el-radio label="1">研究生</el-radio>
                          <el-radio label="2">大学本科</el-radio>
                          <el-radio label="3">大学专科和专科学校</el-radio>
                          <el-radio label="4">中等专业学校</el-radio>
                          <el-radio label="5">技工学校</el-radio>
                          <el-radio label="6">高中</el-radio>
                          <el-radio label="7">初中</el-radio>
                          <el-radio label="8">小学</el-radio>
                          <el-radio label="9">文盲或半文盲</el-radio>
                          <el-radio label="10">不详</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">职业</td>
                      <td colspan="20">
                        <el-radio-group v-model="personDetailData.profession">
                          <el-radio label="0"
                            >国家机关、党群组织、企业、事业单位负责人</el-radio
                          >
                          <el-radio label="1">专业技术人员</el-radio>
                          <el-radio label="2">办事人员和有关人员</el-radio>
                          <el-radio label="3">商业、服务业人员</el-radio>
                          <el-radio label="4"
                            >农、林、牧、渔、水利业生产人员</el-radio
                          >
                          <el-radio label="5">
                            生产、运输设备操作人 员及有关人员</el-radio
                          >
                          <el-radio label="6">军人</el-radio>
                          <el-radio label="7">不便分类的其他从业人员</el-radio>
                          <el-radio label="8">无职业</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">婚姻状况</td>
                      <td colspan="20">
                        <el-radio-group v-model="personDetailData.marrage">
                          <el-radio label="1">未婚</el-radio>
                          <el-radio label="2">已婚</el-radio>
                          <el-radio label="3">丧偶</el-radio>
                          <el-radio label="4">离婚</el-radio>
                          <el-radio label="5">未说明婚姻状况</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">医疗费用支付方式</td>
                      <td colspan="20">
                        1城镇职工基本医疗保险 2城镇居民基本医疗保险
                        3新型农村合作医疗 4贫困救助 5商业医疗保险 6全公费
                        7全自费 8其他
                        <em>{{ personDetailData.medicalPayType }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">药物过敏史</td>
                      <td colspan="20">
                        1无 2青霉素 3磺胺 4链霉素 5其他
                        <em>{{ personDetailData.drugAllergy }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">暴露史</td>
                      <td colspan="20">
                        1无 2化学品 3毒物 4射线
                        <em>{{ personDetailData.exposureHistory }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td rowspan="4" colspan="2">既往史</td>
                      <td colspan="2">疾病</td>
                      <td colspan="20">
                        1无 2高血压 3糖尿病 4冠心病 5慢性阻塞性肺疾病 6恶性肿瘤
                        7脑卒中 8严重精神障碍 9结核病 10肝炎 11其他法定传染病
                        12职业病 13其他
                        <em>{{ personDetailData.diseaseHistory }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2">手术</td>
                      <td colspan="20">
                        <el-radio-group
                          v-model="personDetailData.isSurgeryHistory"
                        >
                          <el-radio :label="false">1无</el-radio>
                          <el-radio :label="true">2有</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2">外伤</td>
                      <td colspan="20">
                        <el-radio-group
                          v-model="personDetailData.isTraumaticHistory"
                        >
                          <el-radio :label="false">1无</el-radio>
                          <el-radio :label="true">2有</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2">输血</td>
                      <td colspan="20">
                        <el-radio-group
                          v-model="personDetailData.isTransfusionHistory"
                        >
                          <el-radio :label="false">1无</el-radio>
                          <el-radio :label="true">2有</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td rowspan="3" colspan="4">家族史</td>
                      <td colspan="4">父亲</td>
                      <td colspan="6">
                        <em>{{ personDetailData.fatherHistory }}</em>
                      </td>
                      <td colspan="4">母亲</td>
                      <td colspan="6">
                        <em>{{ personDetailData.motherHistory }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">兄弟姐妹</td>
                      <td colspan="6">
                        <em>{{ personDetailData.siblingHistory }}</em>
                      </td>
                      <td colspan="4">子女</td>
                      <td colspan="6">
                        <em>{{ personDetailData.childrenHistory }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="20">
                        1无 2高血压 3糖尿病 4冠心病 5慢性阻塞性肺疾病 6恶性肿瘤
                        7脑卒中 8严重精神障碍 9结核病 10肝炎 11先天畸形 12其他
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">遗传病史</td>
                      <td colspan="20">
                        <el-radio-group
                          v-model="personDetailData.isGeneticHistory"
                        >
                          <el-radio :label="false">1无</el-radio>
                          <el-radio :label="true">2有</el-radio>
                        </el-radio-group>
                        疾病名称：<em>{{ personDetailData.geneticDisease }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">残疾情况</td>
                      <td colspan="20">
                        1无残疾 2视力残疾 3听力残疾 4言语残疾 5肢体残疾
                        6智力残疾 7精神残疾 8其他残疾
                        <em>{{ personDetailData.isDisability }}</em>
                      </td>
                    </tr>
                    <tr>
                      <td rowspan="5" colspan="4">生活环境*</td>
                      <td colspan="4">厨房排风措施</td>
                      <td colspan="16">
                        <el-radio-group
                          v-model="personDetailData.kitchenVentilation"
                        >
                          <el-radio label="1">1无</el-radio>
                          <el-radio label="2">2油烟机</el-radio>
                          <el-radio label="3">3换气扇</el-radio>
                          <el-radio label="4">4烟囱</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">燃料类型</td>
                      <td colspan="16">
                        <el-radio-group v-model="personDetailData.FuelType">
                          <el-radio label="1">1液化气</el-radio>
                          <el-radio label="2">2煤</el-radio>
                          <el-radio label="3">3天然气</el-radio>
                          <el-radio label="4">4沼气</el-radio>
                          <el-radio label="5">5柴火</el-radio>
                          <el-radio label="6">6其他</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">饮水</td>
                      <td colspan="16">
                        <el-radio-group v-model="personDetailData.water">
                          <el-radio label="1">1自来水</el-radio>
                          <el-radio label="2">2经净化过滤的水</el-radio>
                          <el-radio label="3">3井水</el-radio>
                          <el-radio label="4">4河湖水</el-radio>
                          <el-radio label="5">5塘水</el-radio>
                          <el-radio label="6">6其他</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">厕所</td>
                      <td colspan="16">
                        <el-radio-group v-model="personDetailData.toilet">
                          <el-radio label="1">1卫生厕所</el-radio>
                          <el-radio label="2">2一格或二格粪池式</el-radio>
                          <el-radio label="3">3马桶</el-radio>
                          <el-radio label="4">4露天粪坑</el-radio>
                          <el-radio label="5">5简易棚厕</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="4">禽畜栏</td>
                      <td colspan="16">
                        <el-radio-group v-model="personDetailData.livestock">
                          <el-radio label="1">1无</el-radio>
                          <el-radio label="2">2单设</el-radio>
                          <el-radio label="3">3室内</el-radio>
                          <el-radio label="4">4室外</el-radio>
                        </el-radio-group>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </el-tab-pane>
            <el-tab-pane
              v-for="(item, index) in titleList"
              :key="index"
              :name="item.code"
              :disabled="item.disabled"
            >
              <span slot="label">
                <i
                  :class="item.updating ? 'el-icon-loading' : 'el-icon-s-order'"
                />
                {{ item.label }}
              </span>

              <div v-show="item.code === 'physical'">
                <div
                  class="notes"
                  v-for="(item, index) of healthyList"
                  :key="index"
                  @click="
                    $router.push({
                      name: 'record-healthy',
                      query: {
                        id: item.id
                      }
                    })
                  "
                >
                  <div class="notes-block">
                    <span class="hospital">体检时间：{{ item.updateAt }}</span>
                  </div>
                  <p>
                    身高：{{ item.stature }} 体重：{{ item.weight }} 体温：{{
                      item.temperature
                    }}
                    症状：{{ item.symptom }}
                  </p>
                </div>
              </div>

              <div v-show="item.code === 'hypertension'">
                <div
                  class="notes"
                  v-for="(item, index) of hypertensions"
                  :key="index"
                  @click="
                    $router.push({
                      name: 'record-hypertension',
                      query: {
                        id: item.id
                      }
                    })
                  "
                >
                  <div class="notes-block">
                    <span class="hospital">随访医生：{{ item.doctor }}</span>
                    <span class="visitTime"
                      >随访时间：{{ item.followDate }}</span
                    >
                  </div>
                  <p>
                    随访方式：{{ item.followWay }}；收缩压：{{
                      item.systolicPressure
                    }}；舒张压：{{ item.assertPressure }}
                  </p>
                </div>
              </div>

              <div v-show="item.code === 'diabetes'">
                <div
                  class="notes"
                  v-for="(item, index) of diabetesList"
                  :key="index"
                  @click="
                    $router.push({
                      name: 'record-diabetes',
                      query: {
                        id: item.id
                      }
                    })
                  "
                >
                  <div class="notes-block">
                    <span class="hospital">随访医生：{{ item.doctor }}</span>
                    <span class="visitTime"
                      >随访时间：{{ item.followDate }}</span
                    >
                  </div>
                  <p>
                    随访方式：{{ item.followWay }}；空腹血糖：{{
                      item.fastingGlucose
                    }}；随机血糖：{{ item.postprandialGlucose }}
                  </p>
                </div>
              </div>

              <div v-show="item.code === 'oldManSelfCare'">
                <div
                  class="notes"
                  v-for="(item, index) of oldManSelfCareList"
                  :key="'old' + index"
                  @click="
                    $router.push({
                      name: 'record-oldManSelfCare',
                      query: {
                        id: item.id
                      }
                    })
                  "
                >
                  <div class="notes-block">
                    <span class="hospital">
                      [老年人生活自理评分] 总分：{{ item.total }}
                    </span>
                    <span class="visitTime">
                      评估时间：{{ item.checkDate }}
                    </span>
                  </div>
                  <p>
                    进餐得分：{{ item.mealScore }}；梳洗得分：{{
                      item.washScore
                    }}；穿衣得分：{{ item.dressScore }}；如厕得分：{{
                      item.toiletScore
                    }}；活动得分：{{ item.activityScore }}
                  </p>
                </div>

                <div
                  class="notes"
                  v-for="(item, index) of questionnaireList"
                  :key="index"
                  @click="
                    $router.push({
                      name: 'record-old-constitution',
                      query: {
                        id: item.id
                      }
                    })
                  "
                >
                  <div class="notes-block">
                    <span class="hospital">
                      [老年人中医药健康管理服务记录表]
                    </span>
                    <span class="visitTime"> 问卷时间：{{ item.date }} </span>
                  </div>
                  <p>
                    机构名称：{{ item.hospitalName }}； 医生姓名：{{
                      item.doctor
                    }}
                  </p>
                </div>
              </div>

              <div v-show="item.code === 'maternal'">
                <div v-for="(item, index) of maternalData" :key="index">
                  <div style="font-size: 22px; margin:20px 0">
                    第{{ index + 1 }}次生产记录
                  </div>
                  <div>
                    <div
                      style="font-size: 20px; margin:10px 0"
                      v-for="(it, itIndex) in item"
                      :key="itIndex"
                    >
                      <div>{{ it.name }}</div>
                      <div
                        class="notes"
                        style="font-size: 18px; margin:10px 0"
                        v-for="(record, recordIndex) of it.records"
                        :key="recordIndex"
                        @click="handleGotoDetailse(record, it.type)"
                      >
                        <div class="notes-block">
                          <span class="hospital">
                            <span v-if="it.type === 'newlyDiagnosed'">
                              填表日期：{{
                                record.newlydiagnoseddate.$format('YYYY-MM-DD')
                              }}
                            </span>
                            <span v-else-if="it.type === 'prenatalCare'">
                              随访日期：{{
                                record.checkdate.$format('YYYY-MM-DD')
                              }}
                            </span>
                            <span
                              v-else-if="
                                it.type === 'maternalVisits' ||
                                  it.type === 'examine42thDay'
                              "
                            >
                              访视日期：{{
                                record.visitdate.$format('YYYY-MM-DD')
                              }}
                            </span>
                          </span>
                        </div>
                        <p>
                          <span v-if="it.type === 'newlyDiagnosed'">
                            年龄：{{ record.age }} 体重：{{ record.weight }}kg
                          </span>
                          <span
                            v-if="
                              it.type === 'prenatalCare' ||
                                it.type === 'examine42thDay' ||
                                it.type === 'maternalVisits'
                            "
                          >
                            医生姓名：{{ record.doctor }}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-show="item.code === 'children'">
                <div
                  v-for="(item, index) of childrenHealthCheckData"
                  :key="index"
                >
                  <div style="font-size: 22px; margin:20px 0">
                    {{ item.name }}
                  </div>
                  <div v-if="item.type === 'newbornVisit'">
                    <div
                      v-for="record of item.records"
                      :key="record.visitno"
                      class="notes"
                      style="font-size: 18px; margin:10px 0"
                      @click="handleGotoDetailse(record, item.type)"
                    >
                      <div class="notes-block">
                        <div>访视医生：{{ record.doctor }}</div>
                        <div class="visitTime">
                          访视日期：{{ record.visitdate.$format('YYYY-MM-DD') }}
                        </div>
                        <div>
                          <p>
                            新生儿姓名：{{ record.newbornname }} 体温：{{
                              record.temperaturedegrees.toFixed(1)
                            }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else-if="item.type === 'childCheck'">
                    <div v-for="(it, i) of item.records" :key="i">
                      <div style="margin: 20px 0;">
                        <span style="font-size: 18px">
                          儿童姓名：{{ it[i].childname }}
                        </span>
                        <span
                          style="cursor: pointer; margin-left: 20px; color: #409eff"
                          @click="
                            handleGotoDevelopmentMonitoring(
                              it[i].childhealthbooksno
                            )
                          "
                        >
                          生长发育监测图
                        </span>
                      </div>
                      <div
                        v-for="record of it"
                        :key="record.medicalcode"
                        class="notes"
                        style="font-size: 18px; margin:10px 20px"
                        @click="handleGotoDetailse(record, item.type)"
                      >
                        <div></div>
                        <div class="notes-block">
                          <div style="font-size: 16px">
                            检查医生：{{ record.checkdoctor }}
                          </div>
                          <div class="visitTime">
                            检查日期：{{
                              record.checkdate.$format('YYYY-MM-DD')
                            }}
                          </div>
                          <div>
                            <p>
                              月龄: {{ record.chronologicalage }} 身高：{{
                                record.height
                              }}cm 体重：{{ record.weight }}kg
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-show="item.code === 'chronicDiseaseOther'">
                <div
                  class="notes"
                  v-for="(item, index) of chronicDiseaseOtherData"
                  :key="index"
                  @click="
                    $router.push({
                      name: 'chronic-disease-other-visit',
                      query: {
                        id: item.id
                      }
                    })
                  "
                >
                  <div class="notes-block">
                    <span class="hospital">随访医生：{{ item.doctor }}</span>
                    <span class="visitTime"
                      >随访时间：{{ item.followDate }}</span
                    >
                  </div>
                  <p>
                    随访方式：{{ item.followWay }}；当前症状：{{
                      item.presentSymptoms
                    }}
                  </p>
                </div>
              </div>

              <div v-show="item.code === 'chronicDiseaseHigh'">
                <div
                  class="notes"
                  v-for="(item, index) of chronicDiseaseHighData"
                  :key="index"
                  @click="
                    $router.push({
                      name: 'chronic-disease-high-visit',
                      query: {
                        id: item.id
                      }
                    })
                  "
                >
                  <div class="notes-block">
                    <span class="hospital">随访医生：{{ item.doctor }}</span>
                    <span class="visitTime"
                      >随访时间：{{ item.followDate }}</span
                    >
                  </div>
                  <p>
                    随访方式：{{ item.followWay }}；当前症状：{{
                      item.riskFactorsName
                    }}
                  </p>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import card from './components/card';
import {getTagsList} from '../../../../common/person-tag.ts';
export default {
  name: 'Patient',
  components: {card},
  data() {
    return {
      id: null,
      activeTab: 'personal'
    };
  },
  created() {
    const id = this.$route.query.id;
    if (!id) this.$router.push('/person');
    this.id = id;
  },
  computed: {
    person() {
      return getTagsList(this.document);
    },
    hypertensions() {
      return this.hypertension.map(it => {
        it.followDate = it.followDate
          ? it.followDate.$format('YYYY-MM-DD')
          : '';
        return it;
      });
    },
    healthyList() {
      return this.healthy.map(it => {
        it.updateAt = it.updateAt ? it.updateAt.$format() : '';
        return it;
      });
    },
    diabetesList() {
      return this.diabetes.map(it => {
        it.followDate = it.followDate
          ? it.followDate.$format('YYYY-MM-DD')
          : '';
        return it;
      });
    },
    personDetailData() {
      return this.personDetailSeverData.map(it => {
        it.birth = it.birth.$format('YYYY-MM-DD');
        return it;
      })[0];
    },
    questionnaireList() {
      return this.questionnaire.map(it => {
        it.date = it.date ? it.date.$format('YYYY-MM-DD') : '';
        return it;
      });
    },
    oldManSelfCareList() {
      return this.oldManSelfCare.map(it => {
        it.checkDate = it.checkDate ? it.checkDate.$format('YYYY-MM-DD') : '';
        return it;
      });
    },
    maternalData() {
      return this.maternalServerData;
    },
    // 儿童健康管理记录数据
    childrenHealthCheckData() {
      return this.childrenHealthCheckServerData;
    },
    // 高危人群规范管理列表数据
    chronicDiseaseHighData() {
      return this.chronicDiseaseHighServerData.map(it => ({
        ...it,
        followDate: it.followDate?.$format('YYYY-MM-DD')
      }));
    },
    // 其它慢病规范管理列表数据
    chronicDiseaseOtherData() {
      return this.chronicDiseaseOtherServerData.map(it => ({
        ...it,
        followDate: it.followDate ? it.followDate.$format('YYYY-MM-DD') : ''
      }));
    },
    // 添加默认排序
    titleList() {
      return [
        {
          code: 'physical',
          label: '体检记录',
          disabled: this.healthyList.length < 1,
          updating: this.$asyncComputed.healthy.updating
        },
        {
          code: 'hypertension',
          label: '高血压随访记录',
          disabled: this.hypertensions.length < 1,
          updating: this.$asyncComputed.hypertension.updating
        },
        {
          code: 'diabetes',
          label: '糖尿病随访记录',
          disabled: this.diabetesList.length < 1,
          updating: this.$asyncComputed.diabetes.updating
        },
        {
          code: 'oldManSelfCare',
          label: '老年人特殊健康管理服务记录',
          disabled:
            this.oldManSelfCareList.length < 1 &&
            this.questionnaireList.length < 1,
          updating: this.$asyncComputed.oldManSelfCare.updating
        },
        {
          code: 'chronicDiseaseHigh',
          label: '高危人群管理记录',
          disabled: this.chronicDiseaseHighData.length < 1,
          updating: this.$asyncComputed.chronicDiseaseHighServerData.updating
        },
        {
          code: 'chronicDiseaseOther',
          label: '其它慢病管理记录',
          disabled: this.chronicDiseaseOtherData.length < 1,
          updating: this.$asyncComputed.chronicDiseaseOtherServerData.updating
        },
        {
          code: 'maternal',
          label: '孕产妇健康管理记录',
          disabled: this.maternalData.length < 1,
          updating: this.$asyncComputed.maternalServerData.updating
        },
        {
          code: 'children',
          label: '儿童健康检查管理记录',
          disabled: this.childrenHealthCheckData.length < 1,
          updating: this.$asyncComputed.childrenHealthCheckServerData.updating
        }
      ].sort((a, b) => a.disabled - b.disabled);
    }
  },
  asyncComputed: {
    document: {
      async get() {
        return await this.$api.Person.document(this.id);
      },
      default() {
        return {
          id: '',
          name: '',
          address: '',
          census: '', //户籍地址
          phone: '', //联系电话
          operateOrganization: {
            //建档机构
            id: '',
            name: ''
          },
          organization: {
            id: '',
            name: ''
          },
          fileDate: '' //建档日期
        };
      }
    },
    healthy: {
      //体检记录
      async get() {
        return await this.$api.Person.healthy(this.id);
      },
      default() {
        return [];
      }
    },
    hypertension: {
      //高血压随访
      async get() {
        return await this.$api.Person.hypertensions(this.id);
      },
      default() {
        return [];
      }
    },
    diabetes: {
      //糖尿病随访
      async get() {
        return await this.$api.Person.diabetes(this.id);
      },
      default() {
        return [];
      }
    },
    personDetailSeverData: {
      async get() {
        return await this.$api.Person.personDetail(this.id);
      },
      default() {
        return [];
      }
    },
    questionnaire: {
      async get() {
        return await this.$api.Person.questionnaire(this.id);
      },
      default() {
        return [];
      }
    },
    oldManSelfCare: {
      async get() {
        return await this.$api.Person.oldManSelfCare(this.id);
      },
      default() {
        return [];
      }
    },
    maternalServerData: {
      async get() {
        return await this.$api.Person.maternalHealthCheck(this.id);
      },
      default() {
        return [];
      }
    },
    childrenHealthCheckServerData: {
      async get() {
        return await this.$api.Person.childrenHealthCheck(this.id);
      },
      default() {
        return [];
      }
    },
    // 高危人群规范管理列表数据
    chronicDiseaseHighServerData: {
      async get() {
        return await this.$api.Person.chronicDiseaseHighList(this.id);
      },
      default() {
        return [];
      }
    },
    // 其他慢病规范管理列表数据
    chronicDiseaseOtherServerData: {
      async get() {
        return await this.$api.Person.chronicDiseaseOtherList(this.id);
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    handleBack() {
      this.$router.go(-1);
    },

    // 跳转到生长发育监测表详情
    handleGotoDevelopmentMonitoring(bookNo) {
      this.$router.push({
        name: 'development-monitoring-chart',
        query: {
          id: bookNo
        }
      });
    },

    // 跳转到相应的体检表详情
    handleGotoDetailse(record, type) {
      let routerName = '';
      let code = '';
      if (type === 'newlyDiagnosed') {
        //第一次产前检查信息表
        routerName = 'record-first-prenatal-check';
        code = record.newlydiagnosedcode;
      } else if (type === 'prenatalCare') {
        //第2~5次产前随访服务信息表
        routerName = 'record-prenatal-follow-up';
        code = record.prenatalcarecode;
      } else if (type === 'maternalVisits') {
        //产后访视记录表
        routerName = 'record-postpartum-visit';
        code = record.visitcode;
      } else if (type === 'examine42thDay') {
        //产后42天健康检查记录表
        routerName = 'record-postpartum-42-days-check';
        code = record.examineno;
      } else if (type === 'newbornVisit') {
        // 新生儿家庭访视记录表
        routerName = 'record-newborn-visit';
        code = record.visitno;
      } else if (type === 'childCheck') {
        // 0-6岁儿童体检表
        code = record.medicalcode;
        if (Number(record.chronologicalage) < 12) {
          // 1～8月龄儿童健康检查记录表
          routerName = 'record-infant-health-check';
        } else if (Number(record.chronologicalage) < 36) {
          // 12～30月龄儿童健康检查记录表
          routerName = 'record-toddler-health-check';
        } else {
          // 3～6岁儿童健康检查记录表
          routerName = 'record-child-health-check';
        }
      }
      if (routerName && code) {
        this.$router.push({
          name: routerName,
          query: {
            id: code
          }
        });
      }
    }
  }
};
</script>

<style lang="scss">
@media screen and (max-width: 414px) {
  .patient-tab-list {
    table {
      td {
        display: block;
        margin-left: 4px;
        width: calc(100% - 36px);
        border-left: none !important;
        font-size: 14px;
      }
    }
    .notes {
      padding: 0 10px;
    }
  }
}
.patient-tab-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  .el-tabs__content {
    height: 100%;
    flex: 1;
    .el-tab-pane {
      height: 100%;
      position: relative;

      & > div {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        overflow-x: hidden;
        overflow-y: auto;
      }
    }
  }
}
</style>
<style lang="scss" scoped>
.notes {
  cursor: pointer;
  border-bottom: 1px solid #eee;
  margin-bottom: 10px;
  p {
    font-size: 14px;
  }
  .notes-block {
    span {
      display: block;
    }
    .visitTime {
      font-size: 12px;
      color: #777;
    }
  }
}
.base-info-head {
  width: 100%;
  max-width: 1200px;
  margin-bottom: 10px;
}

.base-info-table {
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
</style>
