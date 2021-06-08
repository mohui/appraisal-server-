<template>
  <div style="height: 100%;" v-loading="isLoading">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column',
        padding: $settings.isMobile ? '10px 0' : '20px'
      }"
    >
      <div slot="header" class="clearfix">
        <span>{{ query.name }}</span>
        <el-date-picker
          style="margin-left: 20px"
          v-model="query.month"
          size="mini"
          type="month"
          placeholder="选择月"
          @change="monthChanged"
        >
        </el-date-picker>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          plain
          @click="
            $router.push({
              name: 'manual'
            })
          "
          >返回
        </el-button>
      </div>
      <el-table
        :data="list"
        empty-text="没有筛选到符合条件的数据"
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
        :row-class-name="getRowClass"
      >
        <el-table-column type="expand">
          <template slot-scope="scope">
            <el-table
              :data="scope.row.children"
              stripe
              border
              size="small"
              height="100%"
            >
              <el-table-column type="index" width="50" label="序号">
              </el-table-column>
              <el-table-column prop="value" label="数值"> </el-table-column>
              <el-table-column prop="date" label="时间"> </el-table-column>
              <el-table-column prop="files" label="附件"> </el-table-column>
              <el-table-column prop="remark" label="备注"> </el-table-column>
              <el-table-column label="操作">
                <template slot-scope="scope">
                  <el-button
                    type="danger"
                    size="mini"
                    @click="delManual(scope)"
                  >
                    清除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column align="center" width="50" label="序号">
          <template slot-scope="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>
        <el-table-column prop="members" label="考核员工">
          <template slot-scope="scope">
            <div v-if="!scope.row.EDIT || query.input === MD.PROP">
              {{ scope.row.staff.name }}
            </div>
            <el-select
              v-if="scope.row.EDIT && query.input === MD.LOG"
              v-model="scope.row.staff.id"
              filterable
              size="mini"
              placeholder="请选择"
            >
              <el-option
                v-for="item in members"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              >
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="数值" align="center">
          <template slot-scope="scope">
            <div v-if="!scope.row.EDIT">
              {{ scope.row.value }}
            </div>
            <el-input-number
              v-if="scope.row.EDIT"
              v-model="scope.row.value"
              size="mini"
            ></el-input-number>
          </template>
        </el-table-column>
        <el-table-column
          v-if="query.input === MD.PROP"
          prop="size"
          label="次数"
          align="center"
        ></el-table-column>
        <el-table-column
          v-if="query.input === MD.LOG"
          prop="createdAt"
          label="时间"
          align="center"
        ></el-table-column>
        <el-table-column label="操作" align="center">
          <template slot-scope="scope">
            <div v-if="!editable">
              <el-button
                v-if="!scope.row.id && query.input === MD.LOG"
                type="primary"
                size="mini"
                :disabled="!scope.row.staff.id"
                @click="addManual(scope)"
              >
                添加
              </el-button>
              <el-button
                v-if="(scope.row.id || scope.row.item) && scope.row.EDIT"
                type="primary"
                size="mini"
                :disabled="!scope.row.staff.id"
                @click="saveManual(scope)"
              >
                保存
              </el-button>
              <el-button
                v-if="!scope.row.EDIT && query.input === MD.PROP"
                type="primary"
                size="mini"
                @click="editManual(scope)"
              >
                修改
              </el-button>
              <el-button
                v-if="!scope.row.EDIT"
                type="danger"
                size="mini"
                @click="delManual(scope)"
              >
                清除
              </el-button>
            </div>
            <div v-else>
              已结算
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import {HisManualDataInput as MD} from '../../../../common/his.ts';

export default {
  name: 'Update',
  data() {
    return {
      MD: MD,
      isLoading: true,
      editable: false,
      query: {
        id: '',
        name: '',
        type: '',
        month: new Date()
      },
      members: [],
      list: []
    };
  },
  watch: {
    list: {
      handler: function(newValue) {
        if (
          newValue[newValue.length - 1]?.id !== '' &&
          !this.editable &&
          this.query.input === MD.LOG
        )
          newValue.push({
            EDIT: true,
            id: '',
            item: '',
            value: '',
            staff: {
              id: '',
              name: ''
            },
            createdAt: null
          });
      },
      deep: true
    }
  },
  async created() {
    const {id} = this.$route.query;
    this.query.id = id;
    await this.monthChanged();
    this.getMembers();
  },
  methods: {
    getRowClass({row}) {
      if (!row.children.length) {
        return 'row-expand-cover';
      }
    },
    //获取结算状态
    async getSettle() {
      const {name, input, settle} = await this.$api.HisManualData.get(
        this.query.id,
        this.query.month
      );
      this.editable = settle;
      this.query = Object.assign({}, this.query, {name, input});
    },
    //切换月份
    async monthChanged() {
      this.isLoading = true;
      await this.getSettle();
      const {id, input, month} = this.query;
      this.list =
        input === MD.PROP
          ? await this.getListData(id, month)
          : await this.getListLogData(id, month);
      this.isLoading = false;
    },
    //获取员工列表
    async getMembers() {
      this.members = await this.$api.HisStaff.list();
    },
    //获取属性数据列表
    async getListData(id, month) {
      const result = await this.$api.HisManualData.listData(id, month);
      return result.map(it => ({
        ...it,
        initial: it,
        EDIT: false,
        children: it.children.map(i => ({...i, date: i.date.$format()}))
      }));
    },
    //获取日志数据列表
    async getListLogData(id, month) {
      const result = await this.$api.HisManualData.listLogData(id, month);
      return result.map(it => ({
        ...it,
        EDIT: false,
        initial: it,
        createdAt: it.date?.$format()
      }));
    },
    //添加日志数据
    async addManual(item) {
      try {
        const {staff, value} = item.row;
        await this.$api.HisManualData.addLogData(
          staff.id,
          this.query.id,
          value,
          this.query.month
        );
        await this.monthChanged();
        this.$message.success('添加成功！');
      } catch (e) {
        this.$message.error(e.message);
      }
      item.row.EDIT = false;
    },
    editManual(item) {
      item.row.EDIT = true;
    },
    //保存属性数据
    async saveManual(item) {
      try {
        const {staff, value} = item.row;
        await this.$api.HisManualData.setData(
          staff.id,
          this.query.id,
          value,
          this.query.month
        );
        await this.monthChanged();
        this.$message.success('更新成功！');
      } catch (e) {
        this.$message.error(e.message);
      }
      item.row.EDIT = false;
    },
    //清除数据记录
    delManual({$index, row}) {
      this.$confirm('确定要清除此记录?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            this.query.input === MD.PROP
              ? await this.$api.HisManualData.delData(
                  row.staff.id,
                  row.item,
                  this.query.month
                )
              : await this.$api.HisManualData.delLogData(row.id);
            if (this.query.input === MD.LOG) {
              this.list.splice($index, 1);
            } else {
              await this.monthChanged();
            }
            this.$message({
              type: 'success',
              message: '清除成功!'
            });
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消清除'
          });
        });
    }
  }
};
</script>

<style lang="scss">
.row-expand-cover {
  .el-table__expand-icon {
    visibility: hidden;
  }
}
</style>
