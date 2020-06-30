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
      dataList: [],
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

          this.dataList = (level === 0
            ? await this.$api.Region.listHospital(value)
            : await this.$api.Hospital.list(value)
          ).map(it => ({
            value: it.code || it.id,
            label: it.name,
            leaf: level >= 2
          }));
          resolve(this.dataList);
        }
      },
      inputValue: this.value
    };
  },
  computed: {
    placeholderComputed() {
      if (this.value)
        return this.dataList.find(it => it.value === this.value)?.label ?? '';
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
