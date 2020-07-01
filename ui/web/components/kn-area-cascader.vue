<template>
  <el-popover ref="pop" placement="bottom" width="300" trigger="click">
    <el-form label-width="60px">
      <el-form-item label="地区">
        <el-cascader
          ref="areaCascader"
          v-model="regionId"
          style="width: 100%"
          :placeholder="placeholderArea || '请选择地区'"
          :props="areaOptions"
          collapse-tags
          filterable
          clearable
          size="mini"
          @change="handleChange()"
        ></el-cascader>
      </el-form-item>
      <el-form-item label="机构">
        <el-cascader
          ref="hospitalCascader"
          v-model="hospitalId"
          style="width: 100%"
          :placeholder="placeholderHospital || '请选择机构'"
          :props="hospitalOptions"
          collapse-tags
          filterable
          clearable
          size="mini"
          @change="handleChange()"
        ></el-cascader>
      </el-form-item>
      <el-form-item>
        <el-button size="mini" type="primary" @click="click()">确定</el-button>
        <el-button size="mini" @click="$refs.pop.showPopper = false"
          >取消</el-button
        >
      </el-form-item>
    </el-form>
    <el-input
      slot="reference"
      v-model="inputText"
      :placeholder="placeholderInputText || '请选择'"
      style="width:100%"
    ></el-input>
  </el-popover>
</template>

<script>
export default {
  name: 'kn-area-cascader',
  props: {
    code: {
      type: String
    },
    hospital: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      inputText: '',
      regionId: this.code || '',
      hospitalId: this.hospital || '',
      areaOptions: {
        lazy: true,
        emitPath: false,
        checkStrictly: true,
        lazyLoad: async (node, resolve) => {
          const {value = this.$settings.user.regionId, data} = node;
          resolve(
            (await this.$api.Region.list(value)).map(it => ({
              label: it.name,
              value: it.code,
              level: it.level,
              leaf: data?.level >= 4
            }))
          );
        }
      },
      hospitalOptions: {
        lazy: true,
        emitPath: false,
        checkStrictly: true,
        lazyLoad: async (node, resolve) => {
          const {level, value = this.regionId} = node;
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
      }
    };
  },
  watch: {
    regionId() {
      //code更变后清除机构的所选
      this.placeholderHospital = '';
      if (!this.regionId) this.placeholderArea = '';
      this.$refs['hospitalCascader']?.panel?.clearCheckedNodes();
      //重新加载lazyLoad
      this.$refs['hospitalCascader']?.panel?.lazyLoad();
    },
    hospitalId() {
      //hospitalId===''时清除机构的placeholder
      if (!this.hospitalId) this.placeholderHospital = '';
    }
  },
  asyncComputed: {
    placeholderArea: {
      async get() {
        if (this.code) return (await this.$api.Region.info(this.code))?.name;
        return '';
      },
      default: ''
    },
    placeholderHospital: {
      async get() {
        if (this.hospital)
          return (await this.$api.Hospital.info(this.hospital))?.name;
        return '';
      },
      default: ''
    }
  },
  computed: {
    placeholderInputText() {
      return `${this.placeholderArea}${
        this.placeholderArea && this.placeholderHospital ? '/' : ''
      }${this.placeholderHospital}`;
    }
  },
  methods: {
    click() {
      const regionText =
        this.$refs['areaCascader']?.getCheckedNodes()[0]?.label ?? '';
      const hospitalText =
        this.$refs['hospitalCascader']?.getCheckedNodes()[0]?.label ?? '';
      this.inputText = `${regionText}${
        regionText && hospitalText ? '/' : ''
      }${hospitalText}`;
      this.$emit('outValue', {
        regionId: this.regionId,
        hospitalId: this.hospitalId
      });
      this.$refs.pop.showPopper = false;
    },
    handleChange() {
      this.$refs['areaCascader'].toggleDropDownVisible(false);
      this.$refs['hospitalCascader'].toggleDropDownVisible(false);
    }
  }
};
</script>

<style scoped>
.el-form-item {
  margin-bottom: 10px;
}
</style>
