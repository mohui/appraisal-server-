<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '20px'
      }"
    >
      <div slot="header" class="clearfix">
        <span>新建方案</span>
        <el-button
          style="float: right; margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="
            $router.push({
              name: 'plan'
            })
          "
          >返回
        </el-button>
      </div>
      <el-form
        ref="form"
        :rules="rules"
        size="small"
        :model="form"
        label-width="80px"
      >
        <el-form-item label="方案名称" prop="name">
          <el-input v-model="form.name" style="width: 30%;"></el-input>
        </el-form-item>
        <el-form-item label="考核员工" prop="doctor">
          <el-select
            v-model="form.doctor"
            multiple
            filterable
            placeholder="请选择"
            style="width: 30%"
          >
            <el-option
              v-for="item in doctors"
              :key="item.value"
              :label="item.label"
              :value="item.value"
              :disabled="!1"
            >
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="考核指标">
          <div class="total-info">
            总分：<span> {{ totalScore }} </span>； 自动打分（分）：<span>
              {{ targetScore }} </span
            >； 手动打分（分）：<span> {{ manualScore }} </span>
          </div>
          <el-tabs v-model="activeName" type="card">
            <el-tab-pane label="自动打分" name="first">
              <el-table
                :data="form.target"
                size="mini"
                border
                style="width: 100%;"
                :max-height="fullHeight"
              >
                <el-table-column prop="name" label="指标">
                  <template slot-scope="scope">
                    <div v-if="!scope.row.EDIT">
                      {{ targetName(scope.row.name) }}
                    </div>
                    <el-cascader
                      v-if="scope.row.EDIT"
                      v-model="scope.row.name"
                      :options="TagList"
                      :show-all-levels="false"
                    ></el-cascader>
                  </template>
                </el-table-column>
                <el-table-column prop="mode" label="计算方式">
                  <template slot-scope="scope">
                    <div v-if="!scope.row.EDIT">
                      {{ targetMode(scope.row.mode) }}
                    </div>
                    <el-select
                      v-if="scope.row.EDIT"
                      v-model="scope.row.mode"
                      placeholder="请选择"
                    >
                      <el-option
                        v-for="item in TagModeList"
                        :key="item.code"
                        :label="item.name"
                        :value="item.code"
                      >
                      </el-option>
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column prop="value" label="指标值">
                  <template slot-scope="scope">
                    <div v-if="!scope.row.EDIT">
                      {{ scope.row.value }}
                      <span
                        v-if="
                          scope.row.name &&
                            (targetName(scope.row.name).includes('率') ||
                              targetName(scope.row.name).includes('占比') ||
                              targetName(scope.row.name).includes('比例')) &&
                            (scope.row.mode === 'egt' ||
                              scope.row.mode === 'elt')
                        "
                        style="margin: 0 -15px 0 5px;"
                      >
                        %
                      </span>
                    </div>
                    <el-input-number
                      v-if="scope.row.EDIT"
                      v-model="scope.row.value"
                      :min="0"
                      :disabled="
                        scope.row.mode !== 'egt' && scope.row.mode !== 'elt'
                      "
                    ></el-input-number>
                    <span
                      v-if="
                        scope.row.EDIT &&
                          scope.row.name &&
                          (targetName(scope.row.name).includes('率') ||
                            targetName(scope.row.name).includes('占比') ||
                            targetName(scope.row.name).includes('比例')) &&
                          (scope.row.mode === 'egt' || scope.row.mode === 'elt')
                      "
                      style="margin: 0 -15px 0 5px;"
                    >
                      %
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="score" label="得分">
                  <template slot-scope="scope">
                    <div v-if="!scope.row.EDIT">{{ scope.row.score }}</div>
                    <el-input-number
                      v-if="scope.row.EDIT"
                      v-model="scope.row.score"
                      :min="0"
                    ></el-input-number>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="操作">
                  <template slot-scope="scope">
                    <el-button
                      v-if="!scope.row.id"
                      type="primary"
                      size="mini"
                      :disabled="!scope.row.name || !scope.row.mode"
                      @click="addTarget(scope)"
                    >
                      添加
                    </el-button>
                    <el-button
                      v-if="scope.row.id && scope.row.EDIT"
                      type="primary"
                      size="mini"
                      :disabled="!scope.row.name || !scope.row.mode"
                      @click="saveTarget(scope)"
                    >
                      保存
                    </el-button>
                    <el-button
                      v-if="scope.row.id && !scope.row.EDIT"
                      type="primary"
                      size="mini"
                      @click="editTarget(scope)"
                    >
                      修改
                    </el-button>
                    <el-button
                      v-if="scope.row.id && !scope.row.EDIT"
                      type="danger"
                      size="mini"
                      @click="delTarget(scope)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="手动打分" name="second">
              <el-table
                :data="form.manual"
                size="mini"
                border
                style="width: 100%;"
                :max-height="fullHeight"
              >
                <el-table-column prop="name" label="指标">
                  <template slot-scope="scope">
                    <div v-if="!scope.row.EDIT">
                      {{ scope.row.name }}
                    </div>
                    <el-input
                      v-if="scope.row.EDIT"
                      v-model="scope.row.name"
                      placeholder="请输入指标名称"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column prop="requirement" label="考核要求">
                  <template slot-scope="scope">
                    <div v-if="!scope.row.EDIT">
                      {{ scope.row.requirement }}
                    </div>
                    <el-input
                      v-if="scope.row.EDIT"
                      v-model="scope.row.requirement"
                      placeholder="请输入考核要求"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column prop="score" label="分数">
                  <template slot-scope="scope">
                    <div v-if="!scope.row.EDIT">
                      {{ scope.row.score }}
                    </div>
                    <el-input-number
                      v-if="scope.row.EDIT"
                      v-model="scope.row.score"
                      :min="0"
                    ></el-input-number>
                  </template>
                </el-table-column>
                <el-table-column align="center" label="操作">
                  <template slot-scope="scope">
                    <el-button
                      v-if="!scope.row.id"
                      type="primary"
                      size="mini"
                      :disabled="
                        !scope.row.name ||
                          !scope.row.requirement ||
                          !scope.row.score
                      "
                      @click="addManual(scope)"
                    >
                      添加
                    </el-button>
                    <el-button
                      v-if="scope.row.id && scope.row.EDIT"
                      type="primary"
                      size="mini"
                      :disabled="
                        !scope.row.name ||
                          !scope.row.requirement ||
                          !scope.row.score
                      "
                      @click="saveManual(scope)"
                    >
                      保存
                    </el-button>
                    <el-button
                      v-if="scope.row.id && !scope.row.EDIT"
                      type="primary"
                      size="mini"
                      @click="editManual(scope)"
                    >
                      修改
                    </el-button>
                    <el-button
                      v-if="scope.row.id && !scope.row.EDIT"
                      type="danger"
                      size="mini"
                      @click="delManual(scope)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          </el-tabs>
        </el-form-item>
        <el-form-item> </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSubmit('form')">
            立即创建
          </el-button>
          <el-button>取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
const TagList = [
  {
    value: 'A',
    label: '服务效率',
    children: [
      {
        value: 'a1',
        label: '医师日均担负诊疗人次'
      },
      {
        value: 'a2',
        label: '医师日均担负住院床日'
      },
      {
        value: 'a3',
        label: '病床使用率'
      },
      {
        value: 'a4',
        label: '平均住院日'
      }
    ]
  },
  {
    value: 'B',
    label: '医疗质量与安全',
    children: [
      {
        value: 'b1',
        label: '基本药物使用情况'
      },
      {
        value: 'b2',
        label: '抗菌药物处方比例'
      },
      {
        value: 'b3',
        label: '静脉注射剂使用比例'
      },
      {
        value: 'b4',
        label: '院内感染管理'
      },
      {
        value: 'b5',
        label: '医疗纠纷处理'
      }
    ]
  },
  {
    value: 'C',
    label: '经济管理',
    children: [
      {
        value: 'c1',
        label: '门诊次均费用'
      },
      {
        value: 'c2',
        label: '住院次均费用'
      },
      {
        value: 'c3',
        label: '医疗收入变化情况'
      },
      {
        value: 'c4',
        label: '医疗服务收入占比'
      },
      {
        value: 'c5',
        label: '收支结余'
      },
      {
        value: 'c6',
        label: '人员支出占业务支出比例'
      },
      {
        value: 'c7',
        label: '财务制度'
      }
    ]
  },
  {
    value: 'D',
    label: '信息管理',
    children: [
      {
        value: 'd1',
        label: '信息管理系统应用'
      }
    ]
  },
  {
    value: 'E',
    label: '协同服务',
    children: [
      {
        value: 'e1',
        label: '双向转诊'
      },
      {
        value: 'e2',
        label: '一体化管理'
      }
    ]
  },
  {
    value: 'F',
    label: '人力配置',
    children: [
      {
        value: 'f1',
        label: '每万人口全科医生数'
      },
      {
        value: 'f2',
        label: '医护比'
      }
    ]
  },
  {
    value: 'G',
    label: '人员结构',
    children: [
      {
        value: 'g1',
        label: '卫生技术人员学历结构'
      },
      {
        value: 'g2',
        label: '卫生技术人员职称结构'
      },
      {
        value: 'g3',
        label: '中医类别医师占比'
      }
    ]
  },
  {
    value: 'H',
    label: '患者满意度',
    children: [
      {
        value: 'h1',
        label: '患者满意度'
      }
    ]
  },
  {
    value: 'I',
    label: '医务人员满意度',
    children: [
      {
        value: 'i1',
        label: '医务人员满意度'
      }
    ]
  }
];
const TagModeList = [
  {
    code: 'Y01',
    name: '结果为”是“时，得满分'
  },
  {
    code: 'N01',
    name: '结果为“否”时，得满分'
  },
  {
    code: 'egt',
    name: '“≥”时得满分，不足按比例得分'
  },
  {
    code: 'elt',
    name: '“≤”时得满分，超过按比例得分'
  }
];
const Doctor = [
  {
    value: 'zane',
    label: '张医生'
  },
  {
    value: 'wang',
    label: '王大夫'
  },
  {
    value: 'zebu',
    label: '周主任'
  },
  {
    value: 'li',
    label: '李院长'
  },
  {
    value: 'zak',
    label: '赵护士长'
  },
  {
    value: 'lii',
    label: '李主任'
  }
];
export default {
  name: 'PlanAdd',
  data() {
    return {
      doctors: Doctor,
      TagModeList: TagModeList,
      activeName: 'first',
      rules: {
        name: [{required: true, message: '请输入方案名称', trigger: 'blur'}],
        doctor: [{required: true, message: '请选择考核员工', trigger: 'change'}]
      },
      form: {
        name: '',
        doctor: [],
        target: [
          {
            EDIT: true,
            id: '',
            name: '',
            mode: '',
            value: '',
            score: ''
          }
        ],
        manual: [
          {
            EDIT: true,
            id: '',
            name: '',
            score: '',
            requirement: ''
          }
        ]
      }
    };
  },
  computed: {
    TagList() {
      return TagList.map(it => ({
        ...it,
        children: it.children.map(item => ({
          ...item,
          disabled: this.form.target.some(its => its.name.includes(item.value))
        }))
      }));
    },
    totalScore() {
      return (
        this.form.target.reduce((a, b) => a + (b.score || 0), 0) +
        this.form.manual.reduce((a, b) => a + (b.score || 0), 0)
      );
    },
    targetScore() {
      return this.form.target.reduce((a, b) => a + (b.score || 0), 0);
    },
    manualScore() {
      return this.form.manual.reduce((a, b) => a + (b.score || 0), 0);
    },
    fullHeight() {
      return document.body.clientHeight - 450;
    }
  },
  watch: {
    ['form.target']: {
      handler: function(newValue) {
        if (newValue[newValue.length - 1].id !== '')
          newValue.push({
            EDIT: true,
            id: '',
            name: '',
            mode: '',
            value: '',
            score: ''
          });
      },
      deep: true
    },
    ['form.manual']: {
      handler: function(newValue) {
        if (newValue[newValue.length - 1].id !== '')
          newValue.push({
            EDIT: true,
            id: '',
            name: '',
            score: '',
            requirement: ''
          });
      },
      deep: true
    }
  },
  methods: {
    addTarget(item) {
      item.row.id = new Date().getTime();
      item.row.EDIT = false;
    },
    addManual(item) {
      item.row.id = new Date().getTime();
      item.row.EDIT = false;
    },
    editTarget(item) {
      item.row.EDIT = true;
    },
    editManual(item) {
      item.row.EDIT = true;
    },
    saveTarget(item) {
      item.row.EDIT = false;
    },
    saveManual(item) {
      item.row.EDIT = false;
    },
    delTarget({$index}) {
      this.$confirm('确定要删除此指标?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            // await this.$api.xxx.remove(row.id);
            this.form.target.splice($index, 1);
            this.$message({
              type: 'success',
              message: '删除成功!'
            });
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消删除'
          });
        });
    },
    delManual({$index}) {
      this.$confirm('确定要删除此指标?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            // await this.$api.xxx.remove(row.id);
            this.form.manual.splice($index, 1);
            this.$message({
              type: 'success',
              message: '删除成功!'
            });
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消删除'
          });
        });
    },
    onSubmit(formName) {
      this.$refs[formName].validate(valid => {
        if (valid) {
          this.$message.success('创建成功！');
        } else {
          console.log('error submit!!');
          return false;
        }
      });
    },
    targetName(row) {
      const obj = this.TagList.find(it =>
        it.children.find(item => item.value === row[1])
      ).children.find(it => it.value === row[1]);
      return obj.label;
    },
    targetMode(row) {
      return this.TagModeList.find(it => it.code === row).name;
    }
  }
};
</script>

<style scoped lang="scss">
::v-deep .el-tabs__header {
  margin-bottom: 0;
}
::v-deep .el-tabs--card > .el-tabs__header .el-tabs__item.is-active {
  background-color: #409eff;
  border-bottom-color: #409eff;
  color: #fff;
}

::v-deep .el-tabs--card > .el-tabs__header {
  border-bottom: 1px solid #409eff;
}
::v-deep .el-table thead th {
  background-color: #f9f9f9;
}
::v-deep .el-tab-pane {
  border: 1px solid #409eff;
  border-top: none;
  padding: 10px;
  height: calc(100vh - 450px);
}
.total-info {
  float: right;
  span {
    font-size: 140%;
  }
}
</style>
