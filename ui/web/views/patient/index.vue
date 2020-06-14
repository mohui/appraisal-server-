<template>
  <div style="height: 100%;">
    <el-row :gutter="20" style="height: 100%;">
      <el-col :span="6" :xs="24">
        <card :patient="document" />
      </el-col>

      <el-col :span="18" :xs="24" style="height: 100%;">
        <el-card
          shadow="never"
          style="height: 100%;"
          :body-style="{
            height: 'calc(100% - 100px)',
            display: 'flex',
            'flex-direction': 'column'
          }"
        >
          <el-tabs v-model="activeTab">
            <el-tab-pane label="体检记录" name="physical">
              <div class="notes" v-for="(item, index) of healthy" :key="index">
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
            </el-tab-pane>
            <el-tab-pane label="高血压随访记录" name="hypertension">
              <div
                class="notes"
                v-for="(item, index) of hypertensions"
                :key="index"
              >
                <div class="notes-block">
                  <span class="hospital">随访医生：{{ item.doctor }}</span>
                  <span class="visitTime">随访时间：{{ item.followDate }}</span>
                </div>
                <p>
                  随访方式：{{ item.followWay }}；收缩压：{{
                    item.systolicPressure
                  }}；舒张压：{{ item.assertPressure }}
                </p>
              </div>
            </el-tab-pane>
            <el-tab-pane label="糖尿病随访记录" name="diabetes">
              <div class="notes" v-for="(item, index) of diabetes" :key="index">
                <div class="notes-block">
                  <span class="hospital">随访医生：{{ item.doctor }}</span>
                  <span class="visitTime">随访时间：{{ item.followDate }}</span>
                </div>
                <p>
                  随访方式：{{ item.followWay }}；空腹血糖：{{
                    item.fastingGlucose
                  }}；随机血糖：{{ item.postprandialGlucose }}
                </p>
              </div>
            </el-tab-pane>
            <el-tab-pane
              label="老年人健康管理"
              name="timeline"
              style="display: none;"
            >
              <el-timeline>
                <el-timeline-item
                  v-for="(item, index) of timeline"
                  :key="index"
                  :timestamp="item.timestamp"
                  placement="top"
                >
                  <el-card>
                    <h4>{{ item.title }}</h4>
                    <p>{{ item.content }}</p>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
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
      activeTab: 'hypertension',
      timeline: [
        {
          timestamp: '2019-04-20',
          title: '',
          content: '暂无记录'
        }
      ]
    };
  },
  created() {
    const id = this.$route.query.id;
    if (!id) this.$router.push('/person');
    this.id = id;
  },
  computed: {
    hypertensions() {
      return this.hypertension.map(it => {
        it.followDate = it.followDate
          ? it.followDate.$format('YYYY-MM-DD')
          : '';
        return it;
      });
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
    }
  },
  methods: {
    handleBack() {
      this.$router.go(-1);
    }
  }
};
</script>

<style type="scss" scoped>
.notes {
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
</style>
