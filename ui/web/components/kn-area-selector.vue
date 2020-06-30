<template>
  <el-cascader
    ref="areaCascader"
    :value="inputValue"
    :placeholder="placeholderComputed"
    style="width: 100%"
    :props="dataOptions"
    collapse-tags
    filterable
    clearable
    @input="value => this.$emit('input', value)"
    @change="handleChange()"
  ></el-cascader>
</template>

<script>
export default {
  name: 'KnAreaSelector',
  props: {
    value: {
      type: String
    },
    placeholder: {
      type: String
    }
  },
  data() {
    const that = this;
    return {
      dataList: [],
      code: this.$settings.user.regionId,
      dataOptions: {
        lazy: true,
        emitPath: false,
        checkStrictly: true,
        async lazyLoad(node, resolve) {
          const {value = that.code, data} = node;
          that.dataList = (await that.$api.Region.list(value)).map(it => ({
            label: it.name,
            value: it.code,
            level: it.level,
            leaf: data?.level >= 4
          }));
          resolve(that.dataList);
        }
      },
      inputValue: this.value
    };
  },
  computed: {
    placeholderComputed() {
      if (this.value)
        return this.dataList.find(it => it.value === this.value)?.label ?? '';
      return this.placeholder ?? '请选择地区';
    }
  },
  watch: {
    value(newValue) {
      this.inputValue = newValue;
      this.$emit('input', newValue);
    }
  },
  methods: {
    handleChange() {
      this.$refs['areaCascader'].toggleDropDownVisible(false);
    }
  }
};
</script>

<style scoped></style>
