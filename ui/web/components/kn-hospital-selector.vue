<template>
  <el-cascader
    ref="areaCascader"
    :value="inputValue"
    :placeholder="'请选择机构'"
    style="width: 100%"
    :props="dataOptions"
    collapse-tags
    filterable
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
      required: false,
      default: ''
    }
  },
  data() {
    const that = this;
    return {
      dataOptions: {
        lazy: true,
        emitPath: false,
        checkStrictly: true,
        async lazyLoad(node, resolve) {
          const {level, value = that.code, data} = node;
          console.log(node);
          let dataList;
          if (value) {
            //机构用户,只查询其机构的下属机构
            if (!that.$settings.user.isRegion) {
              dataList = (await that.$api.Hospital.list(value)).map(it => ({
                label: it.name,
                value: it.id,
                level: it.level,
                leaf: level < 1
              }));
            } else {
              //地区用户,分情况查询下级数据
              const nextLevel = level === 0 || (data?.level ?? 0) < 5;
              dataList = nextLevel
                ? (await that.$api.Region.list(value)).map(it => ({
                    label: it.name,
                    value: it.code,
                    level: it.level,
                    leaf: level > 4
                  }))
                : (await that.$api.Region.listHospital(value)).map(it => ({
                    label: it.name,
                    value: it.id,
                    level: it.level,
                    leaf: level > 2
                  }));
            }
          } else
            resolve([
              {
                value: 'err',
                label: '请先选择所属地区',
                disabled: true,
                leaf: true
              }
            ]);
          resolve(dataList);
        }
      },
      inputValue: this.value
    };
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
