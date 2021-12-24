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
    <div style="flex-grow: 1;height: 100%;">
      <vxe-table
        v-hidden-scroll
        border
        :data="list_"
        :mouse-config="{selected: true}"
        :keyboard-config="{
          isArrow: true,
          isDel: true,
          isEnter: true,
          isTab: true,
          isEdit: true,
          isChecked: true
        }"
        :edit-config="{trigger: 'click', mode: 'cell'}"
        max-height="100%"
      >
        <vxe-column
          type="seq"
          title="序号"
          width="70"
          fixed="left"
        ></vxe-column>
        <vxe-column field="name" title="医生姓名" min-width="150" fixed="left">
        </vxe-column>

        <vxe-column
          v-for="(field, index) of manualList"
          :key="index"
          :title="field.name"
          min-width="150"
          :edit-render="{autofocus: '.vxe-input--inner'}"
        >
          <template #default="{ row }">
            <span v-if="!editable[field.id]">{{
              row.item[field.id].value
            }}</span>
            <el-tooltip
              v-else
              effect="dark"
              content="已结算"
              placement="top-start"
            >
              <i class="el-icon-s-claim manual-settle"></i>
            </el-tooltip>
          </template>
          <template #edit="{ row }">
            <vxe-input
              v-model="row.item[field.id].value"
              type="number"
              :disabled="editable[field.id]"
              placeholder="请输入数值"
              @blur="updateManual(row.item[field.id])"
            ></vxe-input>
          </template>
        </vxe-column>
      </vxe-table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Vxe-table',
  data() {
    return {
      isLoading: false,
      query: {
        month: new Date()
      },
      list: [],
      editable: {}
    };
  },
  computed: {
    // 初始工分项列表
    manualList() {
      return this.manualData;
    },
    // 医生列表
    list_() {
      return this.membersData.map(it => ({
        ...it,
        item: Object.assign(
          {},
          ...this.manualData.map(ii => ({
            [ii.id]: ii.users[it.id] || {
              value: null,
              edit: false,
              update: false,
              original: null
            }
          }))
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
          const month = this.query.month;
          const result = await this.$api.HisManualData.list();
          return await Promise.all(
            result.map(async it => {
              const result_ = await this.$api.HisManualData.listData(
                it.id,
                month
              );
              await this.getSettle(it.id);
              const list = Object.assign(
                {},
                ...result_.map(ii => ({
                  [ii.staff.id]: {
                    value: ii.value,
                    edit: false,
                    update: false,
                    original: ii.value
                  }
                }))
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
    // 更新状态
    updateManual(row) {
      if (row.original !== row.value) row.update = true;
    },
    //获取结算状态
    async getSettle(id) {
      const {settle} = await this.$api.HisManualData.get(id, this.query.month);
      this.editable[id] = settle;
    },
    //保存数据
    async saveManual() {
      this.isLoading = true;
      try {
        const arr = this.list_
          .map(it => {
            return Object.keys(it.item)
              .filter(i => it.item[i].value !== null && it.item[i].update)
              .map(i => ({
                staff: it.id,
                id: i,
                value: +it.item[i].value,
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

<style scoped></style>
