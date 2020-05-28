<template>
  <div style="height: 100%;">
    <el-card
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>公共卫生服务</span>
        <el-button
          style="float: right;margin: -9px;"
          type="primary"
          @click="
            $router.push({
              name: 'basic-data'
            })
          "
          >返回
        </el-button>
      </div>
      <div style="flex: 1 1 auto; overflow-y: auto;height: 0px;">
        <div v-for="(item, i) of listOne" :key="i" style="">
          <p>{{ i + 1 }} {{ item.parentName }}</p>
          <el-table
            stripe
            size="mini"
            :data="item.child"
            v-loading="isLoading"
            border
            highlight-current-row
          >
            <el-table-column
              label="序号"
              type="index"
              width="50"
              align="center"
              fixed="left"
            ></el-table-column>
            <el-table-column prop="name" align="center" label="机构名称">
            </el-table-column>
            <el-table-column
              v-for="(field, index) of curList"
              :key="index"
              :label="field.name"
              align="center"
            >
              <template slot-scope="scope">
                <el-input
                  v-if="scope.row.active"
                  size="small"
                  v-model="scope.row[field.code]"
                  placeholder="请输入"
                ></el-input>
                <span v-else>{{ scope.row[field.code] }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="name" align="center" label="编辑时间">
              <template slot-scope="scope">
                {{
                  scope.row.operateTime
                    ? scope.row.operateTime.toLocaleString()
                    : ''
                }}
              </template>
            </el-table-column>
            <el-table-column prop="operatorId" align="center" label="编辑人">
            </el-table-column>
            <el-table-column width="80" label="操作" align="center">
              <template slot-scope="scope">
                <el-button
                  plain
                  v-if="scope.row.active"
                  type="success"
                  size="mini"
                  @click="updateTaskCount(scope.row)"
                >
                  保存
                </el-button>
                <el-button
                  plain
                  v-else
                  type="primary"
                  size="mini"
                  @click="edit(scope.row)"
                >
                  编辑
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'BasicDataDetail',
  data() {
    return {
      isLoading: true,
      standardList: [
        '居民健康档案管理服务',
        '健康教育服务',
        '预防接种服务',
        '0~6岁儿童健康管理服务',
        '孕产妇健康管理服务',
        '老年人健康管理服务',
        '高血压患者健康管理服务',
        '2型糖尿病患者健康管理服务',
        '严重精神病障碍患者管理服务',
        '肺结核患者健康管理服务',
        '中医药健康管理服务',
        '传染病及突发公共卫生事件报告和处理服务',
        '卫生计生监督协管服务',
        '家庭医生签约服务',
        '诊疗人次服务',
        '合理用药'
      ],
      standardInfo: '',
      list: [
        {
          name: '居民健康档案管理服务',
          child: [
            '建档人数',
            '档案中有动态记录的档案份数',
            '健康档案建档率',
            '健康档案使用率'
          ]
        },
        {
          name: '健康教育服务',
          child: [
            '发放健康教育印刷资料的种类',
            '发放健康教育印刷资料的数量',
            '播放健康教育音像资料的种类',
            '播放健康教育音像资料的次数',
            '播放健康教育音像资料的时间',
            '健康教育宣传栏设置几处',
            '健康教育宣传栏更新情况',
            '健康教育讲座的次数及明细（参加人数等）',
            '健康教育咨询活动的次数及明细（参加人数等）'
          ]
        },
        {
          name: '预防接种服务',
          child: ['建证率', '某种疫苗接种率']
        },
        {
          name: '0~6岁儿童健康管理服务',
          child: ['新生儿访视率', '儿童健康管理率']
        },
        {
          name: '孕产妇健康管理服务',
          child: ['早孕建册率', '产后访视率']
        },
        {
          name: '孕产妇健康管理服务',
          child: ['早孕建册率', '产后访视率']
        },
        {
          name: '老年人健康管理服务',
          child: ['年内接受健康管理的老年人人数', '老年人健康管理率']
        },
        {
          name: '高血压患者健康管理服务',
          child: [
            '免费测血压登记',
            '血压异常者应建档管理',
            '高血压定期年检人数',
            '高血压患者管理数',
            '高血压患者规范管理数',
            '高血压随访控制数',
            '高血压健康管理率',
            '高血压规范管理率',
            '高血压随访控制率'
          ]
        },
        {
          name: '2型糖尿病患者健康管理服务',
          child: [
            '糖尿病定期年检人数',
            '糖尿病患者管理数',
            '糖尿病患者规范管理数',
            '糖尿病随访控制数',
            '糖尿病健康管理率',
            '糖尿规范管理率',
            '糖尿病随访控制率'
          ]
        },
        {
          name: '严重精神病障碍患者管理服务',
          child: ['严重精神障碍患者规范管理率']
        },
        {
          name: '肺结核患者健康管理服务',
          child: ['肺结核患者管理率', '肺结核患者规则服药率']
        },
        {
          name: '中医药健康管理服务',
          child: [
            '年内接受中医药健康管理服务的65岁及以上居民数',
            '老年人中医药健康管理率'
          ]
        },
        {
          name: '传染病及突发公共卫生事件报告和处理服务',
          child: [
            '传染病疫情报告率',
            '传染病疫情报告及时率',
            '突发公共卫生事件相关信息报告率'
          ]
        },
        {
          name: '卫生计生监督协管服务',
          child: ['卫生计生监督协管信息报告率']
        },
        {
          name: '家庭医生签约服务',
          child: ['签约服务覆盖率', '重点人群签约服务覆盖率', '签约居民续约率']
        },
        {
          name: '诊疗人次服务',
          child: [
            '门诊患者数量',
            '住院患者数量',
            '就诊病种种类',
            '同期年度门诊人次增幅'
          ]
        },
        {
          name: '合理用药',
          child: [
            '用药不适宜占比',
            '静脉输液处方占比',
            '抗菌药物处方占比',
            '联合使用抗菌药物处方占比',
            '门诊处方均次药品费用'
          ]
        }
      ],
      listA: [],
      list2: [
        {
          name: '居民健康档案管理服务',
          child: ['辖区内常住居民数']
        },
        {
          name: '健康教育服务',
          child: [
            '发放健康教育印刷资料的种类',
            '发放健康教育印刷资料的数量',
            '播放健康教育音像资料的种类',
            '播放健康教育音像资料的次数',
            '播放健康教育音像资料的时间',
            '健康教育宣传栏设置几处',
            '健康教育宣传栏更新情况',
            '健康教育讲座的次数及明细（参加人数等）',
            '健康教育咨询活动的次数及明细（参加人数等）'
          ]
        },
        {
          name: '预防接种服务',
          child: [
            '年度辖区内应建立预防接种人数',
            '年度辖区内某种疫苗应接种人数'
          ]
        },
        {
          name: '0~6岁儿童健康管理服务',
          child: ['年度辖区内活产数', '年度辖区内0~6岁儿童数']
        },
        {
          name: '孕产妇健康管理服务',
          child: ['该地该时间段内活产数']
        },
        {
          name: '老年人健康管理服务',
          child: ['年内辖区内65岁及以上常住居民数']
        },
        {
          name: '高血压患者健康管理服务',
          child: ['年内应管理高血压患者人数']
        },
        {
          name: '2型糖尿病患者健康管理服务',
          child: ['年内应管理糖尿病患者人数']
        },
        {
          name: '严重精神病障碍患者管理服务',
          child: [
            '年内辖区内按照规范要求进行管理的严重精神障碍患者人数',
            '年内辖区内登记在册的确诊严重精神障碍患者人数'
          ]
        },
        {
          name: '肺结核患者健康管理服务',
          child: [
            '已管理的肺结核患者人数',
            '辖区同期内经上级定点医疗机构确诊并通知基层医疗卫生机构管理的肺结核患者人数',
            '按照要求规则服药的肺结核患者人数',
            '同期辖区内已完成治疗的肺结核患者人数'
          ]
        },
        {
          name: '中医药健康管理服务',
          child: ['年内接受中医药健康管理服务的65岁及以上居民数']
        },
        {
          name: '传染病及突发公共卫生事件报告和处理服务',
          child: [
            '登记传染病病例数',
            '报告及时的病例数',
            '报告的传染病病例数',
            '及时报告的突发公共卫生事件相关信息数',
            '报告突发公共卫生事件相关信息数'
          ]
        },
        {
          name: '卫生计生监督协管服务',
          child: [
            '报告的事件或线索次数',
            '发现的事件或线索次数',
            '协助开展实地巡查次数'
          ]
        },
        {
          name: '家庭医生签约服务',
          child: ['签约服务覆盖率', '重点人群签约服务覆盖率', '签约居民续约率']
        },
        {
          name: '诊疗人次服务',
          child: [
            '门诊患者数量',
            '住院患者数量',
            '就诊病种种类',
            '同期年度门诊人次增幅'
          ]
        },
        {
          name: '合理用药',
          child: [
            '用药不适宜占比',
            '静脉输液处方占比',
            '抗菌药物处方占比',
            '联合使用抗菌药物处方占比',
            '门诊处方均次药品费用'
          ]
        }
      ],
      listOne: [],
      curList: [],
      curCode: ''
    };
  },
  created() {
    this.ngOnInit();
  },
  methods: {
    async ngOnInit() {
      this.isLoading = true;
      this.standardInfo = this.$route.query.name;
      await this.getTask();
      await this.getList('340203', this.curCode);
      this.isLoading = false;
    },
    ///卫生服务基础数据项标题
    async getTask() {
      let result = await this.$phApi.Task.getTask();
      this.listA = result.map(it => {
        return {
          name: it.name,
          code: it.code,
          child: it.list.map(list => {
            return {
              name: list.name,
              code: list.code
            };
          })
        };
      });
      this.curList = this.listA.filter(
        s => s.name === this.standardInfo
      )[0].child;
      this.curCode = this.listA.filter(
        s => s.name === this.standardInfo
      )[0].code;
    },
    //机构列表：各机构各服务不同的数据项数据
    async getList(code, type) {
      let result = await this.$phApi.Task.list(code, type);
      this.listOne = result
        .filter(
          (it, index, arr) =>
            arr.findIndex(value => value.parentName === it.parentName) === index
        )
        .map(it =>
          Object.assign({}, it, {
            child: result
              .filter(item => item.parentCode === it.parentCode)
              .map(i => {
                return {
                  ...i,
                  active: false
                };
              })
          })
        );
    },
    //修改数据
    async edit(row) {
      row.active = true;
    },
    //保存数据
    async updateTaskCount(item) {
      item.active = false;
      item.operateTime = new Date();
      item.operatorId = localStorage.getItem('userName');
      let typeData = this.curList.map(it => ({
        code: it.code,
        count: item[it.code]
      }));
      try {
        await this.$api.Task.updateTaskCount(item.code, typeData);
      } catch (e) {
        this.$message({
          type: 'error',
          message: e.message
        });
      }
    }
  }
};
</script>

<style scoped></style>
