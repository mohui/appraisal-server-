<template>
  <div style="height: 100%;">
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
        <span>医疗考核方案</span>
        <el-button
          style="float: right;margin:0 -9px;"
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
        :data="tableData"
        empty-text="没有筛选到符合条件的数据"
        stripe
        border
        size="small"
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
            <el-button type="primary" size="mini" @click="editPlan(scope)">
              修改
            </el-button>
            <el-button type="danger" size="mini" @click="delPlan(scope)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
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
      this.$confirm('确定要删除此指标?', '提示', {
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
