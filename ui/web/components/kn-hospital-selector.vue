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
  name: 'KnHospitalSelector',
  props: {
    value: {
      type: String
    },
    code: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String
    }
  },
  data() {
    return {
      dataOptions: {
        lazy: true,
        emitPath: false,
        checkStrictly: true,
        lazyLoad: async (node, resolve) => {
          const {level, value = this.code} = node;
          if (!value) {
            resolve([
              {
                value: '',
                label: '请先选择所属地区',
                disabled: true,
                leaf: true
              }
            ]);
            return;
          }

          resolve(
            (level === 0
              ? await this.$api.Region.listHospital(value)
              : await this.$api.Hospital.list(value)
            ).map(it => ({
              value: it.code || it.id,
              label: it.name,
              leaf: level >= 2
            }))
          );
        }
      },
      inputValue: this.value
    };
  },
  asyncComputed: {
    async placeholderComputed() {
      if (this.value && this.code)
        return (await this.$api.Hospital.info(this.value))?.name;
      return this.placeholder ?? '请选择机构';
    }
  },
  watch: {
    code() {
      //code更变后清除机构的所选
      this.$refs['areaCascader']?.panel?.clearCheckedNodes();
      //重新加载lazyLoad
      this.$refs['areaCascader']?.panel?.lazyLoad();
    },
    value(newValue) {
      this.inputValue = newValue;
      this.$emit('input', newValue);
    }
  },
  methods: {
    handleChange() {
      //选完自动隐藏选项面板
      this.$refs['areaCascader'].toggleDropDownVisible(false);
    }
  }
};
</script>

<style scoped></style>
