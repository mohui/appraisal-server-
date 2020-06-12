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
            <el-tab-pane label="体验记录" name="activity">
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">医院名称：张家山社区卫生服务中心</span>
                  <span class="visitTime">就诊时间：2020-04-23 7:30</span>
                </div>
                <p>
                  主诉：咳嗽
                </p>
                <p>
                  诊断：支气管炎
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">医院名称：张家山社区卫生服务中心</span>
                  <span class="visitTime">就诊时间：2020-04-23 7:30</span>
                </div>
                <p>
                  主诉：咳嗽
                </p>
                <p>
                  诊断：支气管炎
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">医院名称：张家山社区卫生服务中心</span>
                  <span class="visitTime">就诊时间：2020-04-23 7:30</span>
                </div>
                <p>
                  主诉：咳嗽
                </p>
                <p>
                  诊断：支气管炎
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">医院名称：张家山社区卫生服务中心</span>
                  <span class="visitTime">就诊时间：2020-04-23 7:30</span>
                </div>
                <p>
                  主诉：咳嗽
                </p>
                <p>
                  诊断：支气管炎
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">医院名称：张家山社区卫生服务中心</span>
                  <span class="visitTime">就诊时间：2020-04-23 7:30</span>
                </div>
                <p>
                  主诉：咳嗽
                </p>
                <p>
                  诊断：支气管炎
                </p>
              </div>
            </el-tab-pane>
            <el-tab-pane label="高血压随访记录" name="account">
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
            </el-tab-pane>
            <el-tab-pane label="糖尿病随访记录" name="account2">
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
              </div>
              <div class="notes">
                <div class="notes-block">
                  <span class="hospital">随访人员：王五</span>
                  <span class="visitTime">随访时间：2020-04-23 7:30</span>
                </div>
                <p>
                  随访事项：公共健康
                </p>
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
      activeTab: 'activity',
      timeline: [
        {
          timestamp: '2019-04-20',
          title: '非洛地平',
          content: '口服：起始剂量2.5mg（1/2片），一日2次'
        },
        {
          timestamp: '2019-04-21',
          title: '非洛地平',
          content: '口服：起始剂量2.5mg（1/2片），一日2次'
        },
        {
          timestamp: '2019-04-22',
          title: '非洛地平',
          content: '口服：起始剂量2.5mg（1/2片），一日2次'
        },
        {
          timestamp: '2019-04-23',
          title: '非洛地平',
          content: '口服：起始剂量2.5mg（1/2片），一日2次'
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
      return this.serverData.hypertension.map(it => {
        it.datecards = it.datecards.$format();
        it.operatetime = it.operatetime.$format();
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
