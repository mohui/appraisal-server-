<template>
  <div
    v-loading="isLoading"
    class="flex-column-layout"
    :element-loading-text="loadingText"
  >
    <div class="jx-header">
      <span class="header-title">{{ id ? '修改' : '新建' }}方案</span>
      <el-button
        size="small"
        type="primary"
        plain
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
      label-position="top"
      style="padding: 20px; background-color: #fff;"
    >
      <el-form-item
        label="方案名称"
        prop="name"
        style="width: 30%;display: inline-block;padding-right: 10%;"
      >
        <el-input v-model="form.name"></el-input>
      </el-form-item>
      <el-form-item
        label="考核员工"
        prop="doctor"
        style="width: 30%;display: inline-block;"
      >
        <el-select
          v-model="form.doctor"
          multiple
          filterable
          placeholder="请选择"
          style="width: 100%"
        >
          <el-option
            v-for="item in members"
            :key="item.value"
            :label="item.label"
            :value="item.value"
            :disabled="item.disabled"
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
              v-hidden-scroll
              :data="form.target"
              size="mini"
              border
              style="width: 100%;height: 100%;"
              :max-height="fullHeight"
            >
              <el-table-column prop="name" label="指标">
                <template slot-scope="scope">
                  <div v-if="!scope.row.EDIT">
                    {{ targetName(scope.row.metric) }}
                  </div>
                  <el-cascader
                    v-if="scope.row.EDIT"
                    v-model="scope.row.metric"
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
                          (targetName(scope.row.metric).includes('率') ||
                            targetName(scope.row.metric).includes('占比') ||
                            targetName(scope.row.metric).includes('比例')) &&
                          (scope.row.mode === 'egt' || scope.row.mode === 'elt')
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
                        (targetName(scope.row.metric).includes('率') ||
                          targetName(scope.row.metric).includes('占比') ||
                          targetName(scope.row.metric).includes('比例')) &&
                        (scope.row.mode === 'egt' || scope.row.mode === 'elt')
                    "
                    style="margin: 0 -15px 0 5px;"
                  >
                    %
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="score" label="分数">
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
                  <el-tooltip
                    v-if="!scope.row.id"
                    content="添加"
                    :enterable="false"
                  >
                    <el-button
                      type="primary"
                      icon="el-icon-plus"
                      circle
                      size="mini"
                      :disabled="!scope.row.metric || !scope.row.mode"
                      @click="addTarget(scope)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-if="scope.row.id && scope.row.EDIT"
                    content="保存"
                    :enterable="false"
                  >
                    <el-button
                      type="primary"
                      icon="el-icon-check"
                      circle
                      size="mini"
                      :disabled="!scope.row.metric || !scope.row.mode"
                      @click="saveTarget(scope)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-if="scope.row.id && !scope.row.EDIT"
                    content="修改"
                    :enterable="false"
                  >
                    <el-button
                      type="primary"
                      icon="el-icon-edit"
                      circle
                      size="mini"
                      @click="editTarget(scope)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-if="scope.row.id && !scope.row.EDIT"
                    content="删除"
                    :enterable="false"
                  >
                    <el-button
                      type="danger"
                      icon="el-icon-delete"
                      circle
                      size="mini"
                      @click="delTarget(scope)"
                    >
                    </el-button>
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="手动打分" name="second">
            <el-table
              :data="form.manual"
              size="mini"
              v-hidden-scroll
              border
              style="width: 100%;height: 100%;"
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
                  <el-tooltip
                    v-if="!scope.row.id"
                    content="添加"
                    :enterable="false"
                  >
                    <el-button
                      type="primary"
                      icon="el-icon-plus"
                      circle
                      size="mini"
                      :disabled="!scope.row.name || !scope.row.requirement"
                      @click="addManual(scope)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-if="scope.row.id && scope.row.EDIT"
                    content="保存"
                    :enterable="false"
                  >
                    <el-button
                      type="primary"
                      icon="el-icon-check"
                      circle
                      size="mini"
                      :disabled="
                        !scope.row.name ||
                          !scope.row.requirement ||
                          !scope.row.score
                      "
                      @click="saveManual(scope)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-if="scope.row.id && !scope.row.EDIT"
                    content="修改"
                    :enterable="false"
                  >
                    <el-button
                      type="primary"
                      icon="el-icon-edit"
                      circle
                      size="mini"
                      @click="editManual(scope)"
                    >
                    </el-button>
                  </el-tooltip>
                  <el-tooltip
                    v-if="scope.row.id && !scope.row.EDIT"
                    content="删除"
                    :enterable="false"
                  >
                    <el-button
                      type="danger"
                      icon="el-icon-delete"
                      circle
                      size="mini"
                      @click="delManual(scope)"
                    >
                    </el-button>
                  </el-tooltip>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          plain
          icon="el-icon-check"
          @click="onSubmit('form')"
        >
          {{ id ? '保存' : '立即创建' }}
        </el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import {MarkTag, TagAlgorithm, MarkTagUsages} from '../../../../common/his.ts';

export default {
  name: 'PlanAdd',
  data() {
    const isEdit = !this.$route.query.id;
    return {
      id: '',
      isLoading: false,
      loadingText: '拼命加载中',
      members: [],
      TagModeList: TagAlgorithm,
      activeName: 'first',
      rules: {
        name: [{required: true, message: '请输入方案名称', trigger: 'blur'}],
        doctor: [
          {required: isEdit, message: '请选择考核员工', trigger: 'change'}
        ]
      },
      formCopy: '',
      isSave: false,
      form: {
        name: '',
        doctor: [],
        target: [
          {
            EDIT: true,
            id: '',
            name: '',
            metric: '',
            mode: '',
            value: 0,
            score: 0
          }
        ],
        manual: [
          {
            EDIT: true,
            id: '',
            name: '',
            score: 0,
            requirement: ''
          }
        ]
      }
    };
  },
  computed: {
    TagList() {
      return MarkTag.map(it => ({
        ...it,
        children: it.children.map(item => ({
          ...item,
          children: item.children.map(items => ({
            ...items,
            disabled:
              !items.enabled ||
              this.form.target.some(its => its.metric.includes(items.value))
          }))
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
        if (newValue[newValue.length - 1]?.id !== '')
          newValue.push({
            EDIT: true,
            id: '',
            name: '',
            metric: '',
            mode: '',
            value: 0,
            score: 0
          });
      },
      deep: true
    },
    ['form.manual']: {
      handler: function(newValue) {
        if (newValue[newValue.length - 1]?.id !== '')
          newValue.push({
            EDIT: true,
            id: '',
            name: '',
            score: 0,
            requirement: ''
          });
      },
      deep: true
    }
  },
  async created() {
    const id = this.$route.query.id;
    await this.getMember(id || null);
    if (id) {
      this.id = id;
      await this.getDetail();
    }
    this.formCopy = JSON.stringify(this.form);
  },
  mounted() {
    window.onbeforeunload = function() {
      return '';
    };
  },
  async beforeRouteLeave(to, from, next) {
    if (!this.isSave && JSON.stringify(this.form) !== this.formCopy) {
      try {
        await this.$confirm('要离开此页面?, 您有尚未保存的信息', '提示', {
          confirmButtonText: '忽略离开',
          cancelButtonText: '回去保存',
          type: 'warning'
        });
        next();
      } catch (e) {
        console.log(e);
      }
    } else {
      next();
    }
  },
  beforeDestroy() {
    window.onbeforeunload = null;
  },
  methods: {
    async getDetail() {
      try {
        this.isLoading = true;
        const {name, manuals, automations} = await this.$api.HisCheck.get(
          this.id
        );
        this.form.name = name;
        this.form.target = automations.map(it => ({
          EDIT: false,
          id: it.id,
          name: it.name,
          metric: it.metric,
          mode: it.operator,
          value:
            (this.targetName(it.metric).includes('率') ||
              this.targetName(it.metric).includes('占比') ||
              this.targetName(it.metric).includes('比例')) &&
            (it.operator === 'egt' || it.operator === 'elt')
              ? it.value * 100
              : it.value,
          score: it.score
        }));
        this.form.manual = manuals.map(it => ({
          EDIT: false,
          id: it.id,
          name: it.name,
          score: it.score,
          requirement: it.detail
        }));
        this.isLoading = false;
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    async getMember(id) {
      try {
        const result = await this.$api.HisCheck.checkStaff(id);
        this.members = result.map(it => ({
          value: it.id,
          label: it.name,
          disabled: !it.usable
        }));
        if (id) {
          this.form.doctor = result.filter(it => it.selected).map(it => it.id);
        }
      } catch (e) {
        this.$message.error(e.message);
      }
    },
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
            this.form.target.splice($index, 1);
            this.$message({
              type: 'success',
              message: '删除成功！操作完毕后，请保存。'
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
            this.form.manual.splice($index, 1);
            this.$message({
              type: 'success',
              message: '删除成功！操作完毕后，请保存。'
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
      this.$refs[formName].validate(async valid => {
        if (valid) {
          const {name, doctor, target, manual} = this.form;
          const id = this.id;
          try {
            this.isLoading = true;
            this.loadingText = '正在保存中';
            if (id) {
              await this.$api.HisCheck.update(
                id,
                name,
                doctor,
                target
                  .filter(it => it.id)
                  .map(it => ({
                    auto: true,
                    id: typeof it.id === 'number' ? null : it.id,
                    name: this.targetName(it.metric),
                    metric: Array.isArray(it.metric)
                      ? it.metric[it.metric.length - 1]
                      : it.metric,
                    operator: it.mode,
                    value:
                      (this.targetName(it.metric).includes('率') ||
                        this.targetName(it.metric).includes('占比') ||
                        this.targetName(it.metric).includes('比例')) &&
                      (it.mode === 'egt' || it.mode === 'elt')
                        ? +Number.parseFloat(it.value / 100).toFixed(2)
                        : it.value,
                    score: it.score
                  })),
                manual
                  .filter(it => it.id)
                  .map(it => ({
                    auto: false,
                    id: typeof it.id === 'number' ? null : it.id,
                    name: it.name,
                    detail: it.requirement,
                    score: it.score
                  }))
              );
              this.$message.success('修改成功！');
            } else {
              await this.$api.HisCheck.add(
                name,
                doctor,
                target
                  .filter(it => it.metric)
                  .map(it => ({
                    auto: true,
                    name: this.targetName(it.metric),
                    metric: it.metric[it.metric.length - 1],
                    operator: it.mode,
                    value:
                      (this.targetName(it.metric).includes('率') ||
                        this.targetName(it.metric).includes('占比') ||
                        this.targetName(it.metric).includes('比例')) &&
                      (it.mode === 'egt' || it.mode === 'elt')
                        ? +Number.parseFloat(it.value / 100).toFixed(2)
                        : it.value,
                    score: it.score
                  })),
                manual
                  .filter(it => it.name)
                  .map(it => ({
                    auto: false,
                    name: it.name,
                    detail: it.requirement,
                    score: it.score
                  }))
              );
              this.$message.success('添加成功！');
            }
            this.isSave = true;
            return this.$router.push({
              name: 'plan'
            });
          } catch (e) {
            this.$message.error(e.message);
          } finally {
            this.isLoading = false;
          }
        } else {
          return false;
        }
      });
    },
    targetName(row) {
      const id = Array.isArray(row) ? row[row.length - 1] : row;
      return MarkTagUsages[id]?.name || '';
    },
    targetMode(row) {
      return this.TagModeList.find(it => it.code === row).name;
    }
  }
};
</script>

<style scoped lang="scss">
::v-deep .el-tab-pane {
  height: calc(100vh - 450px);
}
::v-deep .el-form-item__label {
  padding: 0;
}
::v-deep .el-tabs__header {
  margin: 0;
}
::v-deep .el-tabs__item.is-active {
  background-color: #f5f5fa;
  border-bottom-color: #f5f5fa !important;
}
.total-info {
  float: right;
  span {
    font-size: 140%;
  }
}
</style>
