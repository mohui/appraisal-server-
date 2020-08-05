<template>
  <div style="height: 100%;">
    <el-card shadow="never">
      <div style="float: right; font-size: 12px;">
        地区：<el-cascader
          v-if="$settings.user.region.level < 3"
          size="small"
          v-model="params.code"
          :props="regionList"
          collapse-tags
          filterable
        ></el-cascader>
        <span v-else>{{ $settings.user.region.name }}</span>
        年份：<el-select
          size="small"
          v-model="params.year"
          placeholder="请选择年份"
        >
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
            height: '400px'
          }"
          v-loading="$asyncComputed.workCount.updating"
        >
          <score-line :lineData="workList" :days="days"></score-line>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="8" :xs="24" :sm="15" :md="15" :lg="15" :xl="15">
        <el-card
          shadow="hover"
          :body-style="{
            height: '600px'
          }"
          v-loading="$asyncComputed.workDifficultyList.updating"
        >
          <div slot="header" class="clearfix">工分难度系数</div>
          <score-bar :barData="scoreList"></score-bar>
        </el-card>
      </el-col>
      <el-col :span="8" :xs="24" :sm="9" :md="9" :lg="9" :xl="9">
        <el-card
          shadow="hover"
          :body-style="{
            height: '600px'
          }"
          v-loading="$asyncComputed.workDifficultyList.updating"
        >
          <div slot="header" class="clearfix">工分难度系数列表</div>
          <el-table :data="scoreList" size="mini" height="100%">
            <el-table-column
              prop="name"
              label="工分项"
              :min-width="computedColWidth('name')"
            >
            </el-table-column>
            <el-table-column
              prop="value"
              label="难度系数"
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
      yearOptions: [
        {
          value: 2019,
          label: '2019年'
        },
        {
          value: 2020,
          label: '2020年'
        }
      ],
      params: {
        scope: 'all',
        code: this.$settings.user.region.code,
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
  computed: {
    days() {
      const start = this.$dayjs()
        .set('year', this.params.year)
        .startOf('year');
      const days =
        new Date(this.params.year, 2, 0).getDate() === 29 ? 366 : 365;
      return Array(days)
        .fill()
        .map((_, i) =>
          this.$dayjs(start)
            .add(i, 'day')
            .format('YYYY-MM-DD')
        );
    },
    workList() {
      const start = this.$dayjs()
        .set('year', this.params.year)
        .startOf('year');
      const days =
        new Date(this.params.year, 2, 0).getDate() === 29 ? 366 : 365;
      const year = Array(days)
        .fill()
        .map((_, i) =>
          this.$dayjs(start)
            .add(i, 'day')
            .format('YYYY-MM-DD')
        );
      return this.workCount.map(it => {
        let num = 0;
        return {
          name: it.projectName,
          type: 'line',
          smooth: true,
          stack: '总量',
          data: year.map(its => {
            num += it.data?.find(d => d.day === its)?.count || 0;
            return num;
          })
        };
      });
    },
    scoreList() {
      return this.workDifficultyList?.map(it => ({
        value: it.difficulty.toFixed(0),
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
          code,
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
          code,
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
    //异步加载地区列表
    async region(code) {
      return await this.$api.Region.list(code);
    }
  }
};
</script>

<style scoped></style>
