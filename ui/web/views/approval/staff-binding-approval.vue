<template>
  <div class="flex-column-layout">
    <div class="jx-header">
      <span class="header-title">员工绑定审核</span>
    </div>
    <el-form :model="searchForm" label-width="100px" size="mini">
      <el-row>
        <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-form-item label="姓名:">
            <el-input
              v-model="searchForm.name"
              size="mini"
              clearable
            ></el-input>
          </el-form-item>
        </el-col>
        <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
          <el-form-item label="审核状态:">
            <el-select
              v-model="searchForm.status"
              multiple
              filterable
              placeholder="请选择"
              style="width: 100%"
            >
              <el-option
                v-for="item in statusList"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="5" :xs="24" :sm="24" :md="12" :lg="6" :xl="6">
          <el-form-item label="">
            <el-button
              type="primary"
              size="small"
              @click="$asyncComputed.serverData.update()"
            >
              查询
            </el-button>
            <el-button type="primary" size="small" @click="reset">
              重置
            </el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <el-table
      ref="staffTable"
      v-loading="$asyncComputed.serverData.updating"
      v-hidden-scroll
      :data="bindingList"
      empty-text="没有筛选到符合条件的数据"
      height="100%"
      style="flex-grow: 1;"
    >
      <el-table-column
        type="index"
        align="center"
        label="序号"
      ></el-table-column>
      <el-table-column prop="name" label="姓名"> </el-table-column>
      <el-table-column prop="gender" label="性别"> </el-table-column>
      <el-table-column prop="mobile" label="手机号"> </el-table-column>
      <el-table-column prop="major" label="专业类型"> </el-table-column>
      <el-table-column prop="title" label="职称名称"> </el-table-column>
      <el-table-column prop="education" label="学历"> </el-table-column>
      <el-table-column prop="isGP" label="是否为全科医师"> </el-table-column>
      <el-table-column
        prop="createdAt"
        label="注册时间"
        align="center"
      ></el-table-column>
      <el-table-column prop="createdAt" label="提交时间" align="center">
      </el-table-column>
      <el-table-column prop="status" label="状态"> </el-table-column>
      <el-table-column label="操作" align="center">
        <template slot-scope="scope">
          <el-tooltip content="通过" :enterable="false">
            <el-button
              type="primary"
              icon="el-icon-check"
              circle
              size="mini"
              @click="passBinding(scope)"
            >
            </el-button>
          </el-tooltip>
          <el-tooltip content="拒绝" :enterable="false">
            <el-button
              type="danger"
              icon="el-icon-close"
              circle
              size="mini"
              @click="delBinding(scope)"
            >
            </el-button>
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-reset-scroll="'staffTable'"
      background
      :page-size="searchForm.pageSize"
      :current-page="searchForm.pageNo"
      layout="total, sizes, prev, pager, next"
      :page-sizes="[50, 100, 200, 400]"
      :total="$asyncComputed.serverData.count"
      @current-change="n => (searchForm.pageNo = n)"
      @size-change="
        size => {
          searchForm.pageSize = size;
          searchForm.pageNo = 1;
        }
      "
    ></el-pagination>
  </div>
</template>

<script>
export default {
  name: 'StaffBindingApproval',
  data() {
    return {
      statusList: [
        {value: 0, label: '全部'},
        {value: 1, label: '未审核'},
        {value: 2, label: '已通过'},
        {value: 3, label: '未通过'}
      ],
      searchForm: {
        name: '',
        status: 0,
        pageSize: 20,
        pageNo: 1
      }
    };
  },
  computed: {
    bindingList() {
      return this.serverData.rows.map(it => ({
        ...it,
        createdAt: it.created_at.$format()
      }));
    }
  },
  created() {},
  asyncComputed: {
    serverData: {
      async get() {
        try {
          return this.$api.AppArea.requests(this.searchForm);
        } catch (e) {
          console.error(e.message);
        }
      },
      default() {
        return {
          count: 0,
          rows: []
        };
      }
    }
  },
  methods: {
    //重置查询条件
    reset() {
      this.searchForm = {
        name: '',
        status: 0,
        pageSize: 20,
        pageNo: 1
      };
    },
    async passBinding({row}) {
      try {
        await this.$api.AppArea.updateRequest(row.id);
        this.$message({
          type: 'success',
          message: '通过申请!'
        });
      } catch (e) {
        this.$message.error(e.message);
      }
    },
    delBinding({row}) {
      this.$confirm(`确定 不通过 ${row.name}的申请?`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            await this.$api.AppArea.updateRequest(row.id);
            this.$message({
              type: 'success',
              message: '已经拒绝申请!'
            });
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消'
          });
        });
    }
  }
};
</script>

<style lang="scss"></style>
