<template>
  <div class="vue-progress-bar default-theme">
    <div class="vue-progress-bar__outer">
      <div class="vue-progress-bar__inner" :style="barStyle">
        <p style="min-width: 40px; color:#fff; font-weight: bolder">
          {{ label }}分
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'progressScore',
  props: {
    label: Number,
    height: {
      type: Number,
      default: 20,
      required: true,
      validator: val => val >= 0
    },
    color: {
      type: String,
      default: '#409EFF'
    },
    percentage: {
      type: Number,
      default: 0,
      required: true,
      validator: val => val >= 0 && val <= 100
    }
  },
  computed: {
    barStyle() {
      const style = {};
      style.width = this.percentage + '%';
      style.height = this.height + 'px';
      style.backgroundColor = this.color;
      return style;
    }
  }
};
</script>

<style scoped>
.vue-progress-bar.default-theme {
  padding: 0 20px;
}
.vue-progress-bar.default-theme .vue-progress-bar__outer {
  background: #ebeef5;
  border-radius: 20px;
}
.vue-progress-bar.default-theme
  .vue-progress-bar__outer
  .vue-progress-bar__inner {
  border-radius: 20px;
  text-align: center;
  font-size: 13px;
}
</style>
