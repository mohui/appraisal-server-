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
    <div style="text-align: right;">
      <el-popover
        ref="popoverCheck"
        placement="bottom"
        width="500"
        trigger="click"
      >
        <el-table :data="manualList" height="400px">
          <el-table-column
            label="序号"
            type="index"
            width="70"
            align="center"
          ></el-table-column>
          <el-table-column property="show" label="名称">
            <template slot-scope="scope">
              <el-checkbox v-model="scope.row.show">
                {{ scope.row.name }}
              </el-checkbox>
            </template>
          </el-table-column>
        </el-table>
        <el-button type="primary" @click="getManualList">保存设置</el-button>
        <el-button slot="reference" size="small" type="primary">
          选择工分项
        </el-button>
      </el-popover>
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
      <el-table-column
        prop="name"
        label="医生姓名"
        fixed="left"
        column-key="name"
        :filters="list.map(it => ({text: it.name, value: it.name}))"
        :filter-method="filterHandler"
      >
      </el-table-column>
      <el-table-column
        v-for="(field, index) of manualList_"
        :key="index"
        :label="field.name"
        align="center"
        min-width="150"
      >
        <template slot-scope="scope">
          <span v-show="!scope.row.item[field.id].edit">
            {{ scope.row.item[field.id].value }}
          </span>
          <i
            v-show="!scope.row.item[field.id].edit && !editable[field.id]"
            class="el-icon-edit manual-icon-edit"
            @click="editManual(scope.row.item[field.id])"
          ></i>
          <el-input
            v-show="scope.row.item[field.id].edit"
            v-model.lazy="scope.row.item[field.id].value"
            :disabled="editable[field.id]"
            class="manual-input-edit"
            size="mini"
            placeholder="请输入"
            @blur="updateManual(scope.row.item[field.id])"
          ></el-input>
          <i
            v-show="scope.row.item[field.id].edit"
            class="el-icon-circle-close"
            @click="cancelEdit(scope.row.item[field.id])"
          ></i>
          <el-tooltip
            v-show="editable[field.id]"
            effect="dark"
            content="已结算"
            placement="top-start"
          >
            <i class="el-icon-s-claim manual-settle"></i>
          </el-tooltip>
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
      mList: [],
      editable: {}
    };
  },
  computed: {
    // 过滤后的工分项列表
    manualList_() {
      const MList = this.mList;
      return MList.length ? MList : this.manualList.filter(it => it.show);
    },
    // 初始工分项列表
    manualList() {
      return this.manualData.map((it, i) => ({
        ...it,
        show: i < 5
      }));
    },
    // 医生列表
    list() {
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
    //过滤工分项列表
    getManualList() {
      this.isLoading = true;
      this.$refs.popoverCheck?.doClose();
      this.mList = this.manualList.filter(it => it.show);
      this.isLoading = false;
    },
    //过滤医生
    filterHandler(value, row, column) {
      const property = column['property'];
      return row[property] === value;
    },
    // 编辑工分项
    editManual(row) {
      row.edit = true;
    },
    // 取消编辑
    cancelEdit(row) {
      row.edit = false;
      row.value = row.original;
    },
    updateManual(row) {
      if (row.original !== row.value) row.update = true;
    },
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

<style lang="scss" scoped>
.manual-icon-edit {
  cursor: pointer;
}
.manual-input-edit {
  width: calc(100% - 20px);
}
.manual-settle {
  cursor: not-allowed;
}
</style>
