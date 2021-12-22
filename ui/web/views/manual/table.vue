<template>
  <div v-loading="isLoading" class="flex-column-layout">
    <div class="jx-header">
      <div>
        <span class="header-title">手工数据维护——表格输入</span>
        <el-date-picker
          v-model="query.month"
          style="margin: 0 20px"
          size="mini"
          type="month"
          placeholder="选择月"
          :clearable="false"
          @change="monthChanged"
        >
        </el-date-picker>
      </div>
      <div>
        <el-button
          style="margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          plain
          @click="saveManual"
          >保存
        </el-button>
        <el-button
          style="margin: -4px 0 0 20px;"
          size="small"
          plain
          @click="
            $router.push({
              name: 'manual'
            })
          "
          >返回
        </el-button>
      </div>
    </div>
    <el-table
      v-hidden-scroll
      :data="list"
      highlight-current-row
      height="100%"
      style="flex-grow: 1;"
    >
      <el-table-column
        label="序号"
        type="index"
        width="70"
        align="center"
        fixed="left"
      ></el-table-column>
      <el-table-column prop="name" label="医生姓名" fixed="left">
      </el-table-column>
      <el-table-column
        v-for="(field, index) of manualData"
        :key="index"
        :label="field.name"
        align="center"
        min-width="150"
      >
        <template slot-scope="scope">
          <el-input
            v-model="scope.row.item[field.id]"
            :disabled="editable[field.id]"
            size="small"
            placeholder="请输入"
          ></el-input>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'Table',
  data() {
    return {
      isLoading: false,
      query: {
        month: new Date()
      },
      editable: {}
    };
  },
  computed: {
    //
    list() {
      return this.membersData.map(it => ({
        ...it,
        item: Object.assign(
          {},
          ...this.manualData.map(ii => ({[ii.id]: ii.users[it.id]}))
        )
      }));
    }
  },
  asyncComputed: {
    //获取手工工分项列表
    manualData: {
      async get() {
        try {
          this.isLoading = true;
          const result = await this.$api.HisManualData.list();
          return await Promise.all(
            result.map(async it => {
              const result_ = await this.$api.HisManualData.listData(
                it.id,
                this.query.month
              );
              await this.getSettle(it.id);
              const list = Object.assign(
                {},
                ...result_.map(ii => ({[ii.staff.id]: ii.value}))
              );
              return {
                ...it,
                users: list
              };
            })
          );
        } catch (e) {
          console.error(e.message);
        } finally {
          this.isLoading = false;
        }
      },
      default() {
        return [];
      }
    },
    //获取员工列表
    membersData: {
      async get() {
        try {
          return this.$api.HisStaff.list();
        } catch (e) {
          console.error(e.message);
        }
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    //获取结算状态
    async getSettle(id) {
      const {settle} = await this.$api.HisManualData.get(id, this.query.month);
      this.editable[id] = settle;
    },
    //切换月份
    async monthChanged() {
      this.$asyncComputed.manualData.update();
    },
    //保存数据
    async saveManual() {
      this.isLoading = true;
      try {
        const arr = this.list
          .map(it => {
            return Object.keys(it.item)
              .filter(i => it.item[i] !== null)
              .map(i => ({
                staff: it.id,
                id: i,
                value: +it.item[i],
                date: this.query.month
              }));
          })
          .flat();

        if (!arr.length) {
          this.$message.warning('请修改后再保存！');
          return;
        }
        await this.$api.HisManualData.setAllData(arr);
        this.$asyncComputed.manualData.update();
        this.$message.success('保存成功!');
      } catch (e) {
        this.$message.error(e.message);
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style lang="scss"></style>
