<template>
  <div>
    <div v-for="(it, index) of gradientData" :key="index">
      <div class="gradient-row">
        <div style="margin-right: 10px">{{ `第${index + 1}梯度` }}:</div>
        <div class="scope-row">
          <el-input-number
            size="mini"
            :value="getMinValue(it, index)"
            :max="it.max"
            disabled
          ></el-input-number>
          &nbsp;&nbsp;~&nbsp;&nbsp;
          <el-input-number
            size="mini"
            v-model="it.max"
            :min="it.min"
          ></el-input-number>
        </div>
        <span style="margin-right: 10px">每个单位量得分:</span>
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
    </div>
    <el-button @click="cleanData" type="danger" size="mini">重 置</el-button>
  </div>
</template>

<script>
export default {
  name: 'WorkGradientDialog',
  data() {
    return {
      btnLoading: false,
      gradientData: [{min: 0, max: 0, score: 0}]
    };
  },
  props: {
    gradient: {
      type: Array,
      required: false
    }
  },
  created() {
    if (this.gradient.length > 0) {
      this.gradientData = this.gradient;
    }
  },
  methods: {
    reset() {
      this.gradientData = [{min: 0, max: 0, score: 0}];
      this.$parent.resetGradient();
    },
    cleanData() {
      this.gradientData = [{min: 0, max: 0, score: 0}];
    },
    getMinValue(row, index) {
      if (index > 0) row.min = this.gradientData[index - 1].max;
      return row.min;
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
      //检查最后一级的最大值
      const last = this.gradientData[this.gradientData.length - 1];
      this.gradientData.push({min: last.max, max: last.max + 1, score: 0});
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
}
.button-div {
  display: flex;
  flex-direction: row-reverse;
  margin: 20px 5px 0 0;
  .plus-button {
  }
}
</style>
