<template>
  <div style="height: 100%;">
    <el-card shadow="never">
      <div style="float: right; font-size: 12px;">
        <el-cascader
          :placeholder="curRegion || '请选择地区'"
          v-if="$settings.user.region.level < 3"
          size="small"
          v-model="params.code"
          :props="regionList"
          collapse-tags
          filterable
        ></el-cascader>
        <span v-else>{{ $settings.user.region.name }}</span>
        &nbsp;&nbsp;
        <el-select size="small" v-model="params.year" placeholder="请选择年份">
          <el-option
            v-for="item in yearOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
      </div>
      <span>推荐工分值</span>
      <el-button-group style="margin-left:20px">
        <el-button
          size="small"
          :class="{'el-button--primary': params.scope === 'all'}"
          @click="typeChange('all')"
        >
          全部
        </el-button>
        <el-button
          size="small"
          :class="{'el-button--primary': params.scope === 'center'}"
          @click="typeChange('center')"
        >
          中心/站
        </el-button>
        <el-button
          size="small"
          :class="{'el-button--primary': params.scope === 'institute'}"
          @click="typeChange('institute')"
        >
          卫生院/室
        </el-button>
      </el-button-group>
    </el-card>
    <el-row :gutter="20" style="margin: 10px -10px">
      <el-col :span="8" :xs="24" :sm="24" :md="24" :lg="24" :xl="24">
        <el-card
          shadow="hover"
          :body-style="{
            height: '600px'
          }"
          v-loading="$asyncComputed.workCount.updating"
        >
          <div slot="header">工分值年度记录</div>
          <score-line title="" :lineData="workList" :days="days"></score-line>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="8" :xs="24" :sm="16" :md="16" :lg="16" :xl="16">
        <el-card
          shadow="hover"
          :body-style="{
            height: '400px'
          }"
          v-loading="$asyncComputed.workDifficultyList.updating"
        >
          <div slot="header" class="clearfix">工分难度系数</div>
          <score-bar :barData="scoreList"></score-bar>
        </el-card>
      </el-col>
      <el-col :span="8" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
        <el-card
          shadow="hover"
          :body-style="{
            height: '400px'
          }"
          v-loading="$asyncComputed.workDifficultyList.updating"
        >
          <div slot="header" class="clearfix">工分值推荐</div>
          <el-table :data="scoreList" size="mini" height="100%">
            <el-table-column
              prop="name"
              label="工分项"
              :min-width="computedColWidth('name')"
            >
            </el-table-column>
            <el-table-column
              prop="value"
              label="工分值"
              :min-width="computedColWidth('value')"
            >
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import scoreLine from './components/scoreLine';
import scoreBar from './components/scoreBar';

export default {
  name: 'score',
  components: {
    scoreLine,
    scoreBar
  },
  data() {
    const that = this;
    return {
      curRegion: '',
      yearOptions: [],
      params: {
        scope: 'all',
        code: [this.$settings.user.region.code],
        year: 2019
      },
      regionList: {
        lazy: true,
        checkStrictly: true,
        async lazyLoad(node, resolve) {
          const {level, value = that.$settings.user.region.code || null} = node;
          const region = (await that.region(value)).map(it => ({
            value: it.code,
            label: it.name,
            leaf: level > 1 - that.$settings.user.region.level
          }));
          resolve(region);
        }
      }
    };
  },
  async created() {
    this.params.year = this.$dayjs().year();
    this.yearOptions = Array(this.$dayjs().diff('2018-01-01', 'year'))
      .fill()
      .map((_, i) => {
        const year = this.$dayjs()
          .subtract(i, 'year')
          .year();
        return {
          value: year,
          label: year + '年'
        };
      });
    if (this.$settings.user.region.level !== 3) {
      this.params.code[0] = await this.firstRegion(
        this.$settings.user.region.code
      );
      this.$asyncComputed.workCount.update();
      this.$asyncComputed.workDifficultyList.update();
    }
  },
  computed: {
    days() {
      const start = this.$dayjs()
        .set('year', this.params.year)
        .startOf('year');
      const end = this.$dayjs();

      const days =
        this.params.year === this.$dayjs().year()
          ? end.diff(start, 'day')
          : new Date(this.params.year, 2, 0).getDate() === 29
          ? 366
          : 365;
      return Array(days)
        .fill()
        .map((_, i) =>
          this.$dayjs(start)
            .add(i, 'day')
            .format('YYYY-MM-DD')
        );
    },
    workList() {
      return this.workCount.map(it => {
        let num = 0;
        return {
          name: it.projectName,
          type: 'line',
          smooth: true,
          data: this.days.map(its => {
            num += it.data?.find(d => d.day === its)?.count || 0;
            return num;
          })
        };
      });
    },
    scoreList() {
      return this.workDifficultyList?.map(it => ({
        value: it.difficulty,
        name: it.name
      }));
    }
  },
  asyncComputed: {
    workDifficultyList: {
      async get() {
        const {scope, code, year} = this.params;
        return await this.$api.Region.workDifficultyList({
          scope,
          code: code[code.length - 1],
          year
        });
      },
      default() {
        return [];
      }
    },
    workCount: {
      async get() {
        const {scope, code, year} = this.params;
        return await this.$api.Region.workCount({
          scope,
          code: code[code.length - 1],
          year
        });
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    //切换类型
    typeChange(val) {
      this.params.scope = val;
    },
    computedColWidth(field) {
      if (this.scoreList?.length > 0) {
        return this.$widthCompute(this.scoreList.map(item => item[field]));
      }
    },
    async firstRegion(code) {
      const result = await this.region(code);
      if (result.length && result[0].level !== 3) {
        return this.firstRegion(result[0].code);
      }
      this.curRegion = result[0].name;
      return result[0].code;
    },
    //异步加载地区列表
    async region(code) {
      return await this.$api.Region.list(code);
    }
  }
};
</script>

<style scoped></style>
