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
            <el-tab-pane label="体验记录" name="physical">
              <div class="notes">
                <div class="notes-block display-none">
                  <span class="hospital">医院名称：</span>
                  <span class="visitTime">就诊时间：</span>
                </div>
                <p>
                  暂无记录
                </p>
              </div>
            </el-tab-pane>
            <el-tab-pane label="高血压随访记录" name="hypertensions">
              <div
                class="notes"
                v-for="(item, index) of hypertensions"
                :key="index"
              >
                <div class="notes-block">
                  <span class="hospital">随访医生：{{ item.doctor }}</span>
                  <span class="visitTime">随访时间：{{ item.followDate }}</span>
                </div>
                <p>随访方式：{{ item.followWay }}</p>
              </div>
            </el-tab-pane>
            <el-tab-pane label="糖尿病随访记录" name="diabetes">
              <div class="notes" v-for="(item, index) of diabetes" :key="index">
                <div class="notes-block">
                  <span class="hospital">随访医生：{{ item.doctor }}</span>
                  <span class="visitTime">随访时间：{{ item.followDate }}</span>
                </div>
                <p>随访方式：{{ item.followWay }}</p>
              </div>
            </el-tab-pane>
            <el-tab-pane label="老年人健康管理" name="timeline">
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
      patient: {
        name: '张三',
        age: '120岁',
        avatar:
          'https://pic4.zhimg.com/80/v2-3cdfb5a464dc931630dd359b71a10587_1440w.jpg',
        address: '芜湖市'
      },
      activeTab: 'physical',
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
    hypertension: {
      //高血压随访
      async get() {
        return await this.$api.Person.hypertensions(this.id);
      },
      default() {
        return [
          {
            followDate: '',
            followWay: '暂无随访记录',
            doctor: '',
            updateAt: ''
          }
        ];
      }
    },
    diabetes: {
      //糖尿病随访
      async get() {
        return await this.$api.Person.diabetes(this.id);
      },
      default() {
        return [
          {
            followDate: '',
            followWay: '暂无随访记录',
            doctor: '',
            updateAt: ''
          }
        ];
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
