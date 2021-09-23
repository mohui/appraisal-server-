<template>
  <div class="flex-column-layout">
    <div class="jx-header">
      <span class="header-title">医疗考核方案</span>
      <el-button
        type="primary"
        size="small"
        @click="
          $router.push({
            name: 'plan-add'
          })
        "
        >新建方案
      </el-button>
    </div>
    <el-table
      v-loading="$asyncComputed.serverData.updating"
      v-hidden-scroll
      :data="tableData"
      empty-text="没有筛选到符合条件的数据"
      height="100%"
      style="flex-grow: 1;"
    >
      <el-table-column
        width="50px"
        type="index"
        align="center"
        label="序号"
      ></el-table-column>
      <el-table-column prop="name" label="方案名称" align="center">
      </el-table-column>
      <el-table-column
        prop="staff"
        label="考核员工"
        align="center"
      ></el-table-column>
      <el-table-column
        prop="items"
        label="负责项目"
        align="center"
      ></el-table-column
      ><el-table-column
        prop="score"
        label="分值"
        min-width="40"
        align="center"
      ></el-table-column
      ><el-table-column label="操作" min-width="60" align="center">
        <template slot-scope="scope">
          <el-tooltip content="修改" :enterable="false">
            <el-button
              type="primary"
              icon="el-icon-edit"
              circle
              size="mini"
              @click="editPlan(scope)"
            >
            </el-button>
          </el-tooltip>
          <el-tooltip content="删除" :enterable="false">
            <el-button
              type="danger"
              icon="el-icon-delete"
              circle
              size="mini"
              @click="delPlan(scope)"
            >
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'PlanList',
  data() {
    return {
      isInit: false
    };
  },
  computed: {
    tableData() {
      return this.serverData.map(it => ({
        ...it,
        staff: it.staffs.map(its => its.name).join(','),
        items: it.item.map(its => its.name).join(',')
      }));
    }
  },
  created() {},
  asyncComputed: {
    serverData: {
      async get() {
        return this.$api.HisCheck.list();
      },
      default() {
        return [];
      }
    }
  },
  methods: {
    editPlan(item) {
      this.$router.push({
        name: 'plan-add',
        query: {
          id: item.row.id
        }
      });
    },
    async delPlan({row}) {
      if (row.staffs.length) {
        return this.$message.warning('此考核方案绑定了考核的员工，不可删除。');
      }
      this.$confirm('确定要删除此考核方案?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.HisCheck.delete(row.id);
            this.$asyncComputed.serverData.update();
            this.$message({
              type: 'success',
              message: '删除成功!'
            });
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消删除'
          });
        });
    }
  }
};
</script>

<style lang="scss"></style>
