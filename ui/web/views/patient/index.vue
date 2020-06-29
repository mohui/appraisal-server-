<template>
  <div style="height: 100%;">
    <el-row :gutter="20" style="height: 100%;">
      <el-col :span="6" :xs="24">
        <card :patient="document" :tags="tags" :personTags="personTags" />
      </el-col>
      <el-col :span="18" :xs="24" style="height: 100%;">
        <el-card
          shadow="never"
          style="height: 100%;"
          :body-style="{
            height: 'calc(100% - 40px)'
          }"
          ><el-button
            style="position: absolute;top:15px;right:30px;z-index: 99999;"
            size="small"
            type="primary"
            @click="$router.go(-1)"
            >返回
          </el-button>
          <el-tabs v-model="activeTab">
            <el-tab-pane
              label="个人基本信息表"
              name="personal"
              v-if="personDetailSeverData.length"
            >
              <el-row type="flex" class="record-head" justify="space-between">
                <el-col :span="6">
                  姓名：<strong>{{ personDetailData.name }}</strong>
                </el-col>
                <el-col :span="6">编号：{{ personDetailData.id }}</el-col>
              </el-row>
              <table class="record-he-table">
                <tbody>
                  <tr>
                    <td colspan="4">性别</td>
                    <td colspan="6">
                      <em>
                        {{ personDetailData.gender }}
                      </em>
                    </td>
                    <td colspan="2">出生日期</td>
                    <td colspan="2">
                      <em>
                        {{ personDetailData.birth }}
                      </em>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="4">身份证号</td>
                    <td colspan="4">
                      <em>
                        {{ personDetailData.idCard }}
                      </em>
                    </td>
                    <td colspan="2">工作单位</td>
                    <td colspan="4">
                      <em>
                        {{ personDetailData.workUnit }}
                      </em>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="4">本人电话</td>
                    <td colspan="2">
                      <em>
                        {{ personDetailData.phone }}
                      </em>
                    </td>
                    <td colspan="2">联系人姓名</td>
                    <td colspan="2">
                      <em>
                        {{ personDetailData.contactName }}
                      </em>
                    </td>
                    <td colspan="2">联系人电话</td>
                    <td colspan="2">
                      <em>
                        {{ personDetailData.contactPhone }}
                      </em>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="4">常住类型</td>
                    <td colspan="4"></td>
                    <td colspan="2">民族</td>
                    <td colspan="4"></td>
                  </tr>
                  <tr>
                    <td colspan="4">血型</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td colspan="4">文化程度</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td colspan="4">职业</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td colspan="4">婚姻状况</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td colspan="4">医疗费用支付方式</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td colspan="4">药物过敏史</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td colspan="4">暴露史</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td rowspan="4" colspan="2">既往史</td>
                    <td colspan="2">疾病</td>
                    <td colspan="10">
                      1 无 2 高血压 3 糖尿病 4 冠心病 5 慢性阻塞性肺疾病 6
                      恶性肿瘤 7 脑卒中 8 严重精神障碍 9 结核病 10 肝炎 11
                      其他法定传染病 12 职业病 13 其他 □ 确诊时间 年 月/ □
                      确诊时间 年 月/ □ 确诊时间 年 月 □ 确诊时间 年 月/ □
                      确诊时间 年 月/ □ 确诊时间 年 月
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2">手术</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td colspan="2">外伤</td>
                    <td colspan="10"></td>
                  </tr>
                  <tr>
                    <td colspan="2">输血</td>
                    <td colspan="10"></td>
                  </tr>
                </tbody>
              </table>
            </el-tab-pane>
            <el-tab-pane
              label="体检记录"
              name="physical"
              v-if="healthyList.length"
            >
              <div>
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
            </el-tab-pane>
            <el-tab-pane
              label="高血压随访记录"
              name="hypertension"
              v-if="hypertensions.length"
            >
              <div>
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
            </el-tab-pane>
            <el-tab-pane
              label="糖尿病随访记录"
              name="diabetes"
              v-if="diabetesList.length"
            >
              <div>
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
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import card from './components/card';

export default {
  name: 'Patient',
  components: {card},
  data() {
    return {
      id: null,
      tags: [],
      personTags: [],
      activeTab: 'personal'
    };
  },
  created() {
    const id = this.$route.query.id;
    if (!id) this.$router.push('/person');
    this.id = id;
    this.tags = JSON.parse(this.$route.query.tags);
    this.personTags = JSON.parse(this.$route.query.personTags);
  },
  mounted() {
    if (this.healthyList.length > 0) {
      this.activeTab = 'physical';
      return;
    }
    if (this.hypertensions.length > 0) {
      this.activeTab = 'hypertension';
      return;
    }
    if (this.diabetesList.length > 0) {
      this.activeTab = 'diabetes';
    }
  },
  computed: {
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
    }
  },
  methods: {
    handleBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style lang="scss">
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
.record-he-table {
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
