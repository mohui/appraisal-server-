<template>
  <div>
    <div v-for="(it, index) of gradientData" :key="index">
      <div class="gradient-row">
        <div style="margin-right: 10px">{{ `第${index + 1}梯度` }}:</div>
        <div class="scope-row">
          <el-input
            style="width: 130px"
            v-if="it.min === null"
            size="mini"
            disabled
            placeholder="无穷小"
            >无穷小</el-input
          >
          <el-input-number
            v-else
            :ref="`min_${index}`"
            size="mini"
            :value="getMinValue(it, index)"
            :max="it.max === null ? Infinity : it.max"
            disabled
          ></el-input-number>
          &nbsp;&nbsp;~&nbsp;&nbsp;
          <el-input
            style="width: 130px"
            v-if="it.max === null"
            size="mini"
            disabled
            placeholder="无穷大"
          ></el-input>
          <el-input-number
            v-else
            size="mini"
            v-model="it.max"
            :min="it.min === null ? -Infinity : it.min + 0.0001"
            :max="getMaxValue(it, index)"
          ></el-input-number>
        </div>
        <el-input-number v-model="it.score" size="mini"></el-input-number>
      </div>
    </div>
    <div class="button-div">
      <el-button
        class="plus-button"
        @click="addRow"
        type="primary"
        size="mini"
        icon="el-icon-plus"
      ></el-button>
      <el-button @click="cleanData" type="danger" size="mini">重 置</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WorkGradientView',
  data() {
    return {
      num: 1,
      btnLoading: false,
      gradientData: [{min: null, max: null, score: 0}]
    };
  },
  props: {
    gradient: {
      type: Array,
      required: false
    }
  },
  watch: {
    gradient() {
      if (this.gradient.length > 0) {
        this.gradientData = this.gradient;
      } else {
        this.cleanData();
      }
    }
  },
  created() {
    if (this.gradient.length > 0) {
      this.gradientData = this.gradient;
    }
  },
  methods: {
    cleanData() {
      this.gradientData = [{min: null, max: null, score: 0}];
    },
    //动态返回每个梯度的最低分值
    getMinValue(row, index) {
      if (index > 0) {
        row.min = this.gradientData[index - 1].max;
        this.$nextTick(() => {
          //调用组件的input方法
          this.$refs[`min_${index}`][0].handleInput(row.min);
        });
        return row.min;
      } else return null;
    },
    //动态设置每个梯度的最大值
    getMaxValue(row, index) {
      return this.gradientData[index + 1]?.max === null
        ? Infinity
        : this.gradientData[index + 1].max - 1 || Infinity;
    },
    async submit() {
      try {
        this.btnLoading = true;
        this.$parent.$asyncComputed.serverData.update();
        this.$parent.resetItemType();
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.btnLoading = false;
      }
    },
    addRow() {
      if (
        this.gradientData[0].min === null &&
        this.gradientData[0].max === null
      ) {
        this.gradientData[0].max = 0;
        this.gradientData.push({min: 0, max: null, score: 0});
      } else {
        //当前最后一级数据
        const last = this.gradientData[this.gradientData.length - 1];
        last.max = last.min + 1;
        //将last的max改为数值
        this.gradientData.push({min: last.max, max: null, score: 0});
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.gradient-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0 0 10px 0;
}
.scope-row {
  flex: 1;
  display: flex;
  align-items: center;
}
.button-div {
  display: flex;
  flex-direction: row-reverse;
  margin: 20px 5px 0 0;
  .plus-button {
    margin-left: 5px;
  }
}
</style>
