<template>
  <el-input
    v-model="text"
    :size="size"
    :disabled="disabled"
    :type="type"
    :placeholder="placeholder"
    :clearable="clearable"
  ></el-input>
</template>

<script>
export default {
  name: 'kn-debounce-input',
  props: {
    value:{
      type: String,
      default: ''
    },
    debounce: {
      type: Number,
      default: 500
    },
    distinct: {
      type: Boolean,
      default: true
    },
    placeholder: {
      type: String,
      default: ''
    },
    size: {
      type: String,
      default: 'mini'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    clearable: {
      type: Boolean,
      default: false
    },
    type: {
      type: String
    }
  },
  data() {
    return {
      text: this.value,
      timer: null
    };
  },
  destroy() {
    //消除timer
    this.timer && clearTimeout(this.timer);
  },
  watch: {
    value(newValue) {
      this.text = newValue;
    },
    text(newValue) {
      this.timer && clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.$emit('input', newValue);
      }, this.debounce);
    }
  }
};
</script>

<style scoped></style>
