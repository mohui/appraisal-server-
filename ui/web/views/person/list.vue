<template>
  <div style="height: 100%;">
    <el-card
      class="box-card"
      style="height: 100%;"
      shadow="never"
      :body-style="{
        height: 'calc(100% - 110px)',
        display: 'flex',
        'flex-direction': 'column'
      }"
    >
      <div slot="header" class="clearfix">
        <span>个人档案列表</span>
      </div>
      <el-form :model="queryForm" label-width="100px" size="mini">
        <el-row>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="姓名：">
              <el-input
                v-model="queryForm.name"
                size="mini"
                placeholder="请输入要查询的姓名"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="身份证号码：">
              <el-input
                v-model="queryForm.idCard"
                size="mini"
                placeholder="请输入要查询的身份证号码"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="管理机构：">
              <el-select
                v-model="queryForm.hospital"
                clearable
                placeholder="请选择"
                style="width: 100%;"
              >
                <el-option
                  v-for="item in hospitals"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                >
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="5" :xs="24" :sm="24" :md="12" :lg="6" :xl="6">
            <el-form-item label="">
              <el-button
                type="primary"
                size="mini"
                @click="$asyncComputed.serverData.update()"
                >查询</el-button
              >
              <el-button type="primary" size="mini">
                重置条件
              </el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <el-table
        v-loading="$asyncComputed.serverData.updating"
        :data="tableData"
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column prop="name" label="姓名">
          <template slot-scope="{row}">
            <router-link :to="'/person-detail?id=' + row.id">
              <span>{{ row.name }}</span>
            </router-link>
          </template>
        </el-table-column>
        <el-table-column prop="idCard" label="身份证"></el-table-column>
        <el-table-column prop="hospitalName" label="管理机构"></el-table-column>
        <el-table-column label="标记">
          <template slot-scope="scope">
            <el-tag
              style="margin-right: 10px"
              size="mini"
              :key="tag"
              v-for="tag of scope.row.tags"
              >{{ tag }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        background
        :page-size="pageSize"
        :current-page="pageNo"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :page-sizes="[50, 100, 200, 400]"
        :total="serverData.count"
        @current-change="handlePageNoChange"
        @size-change="handlePageSizeChange"
      >
      </el-pagination>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'PersonList',
  data() {
    return {
      pageSize: 50,
      pageNo: 1,
      hospitals: this.$settings.user.hospitals,
      queryForm: {
        name: '',
        hospital: '',
        idCard: ''
      }
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows.map(it => {
        it.tags = [];
        it.tags.push(`${it?.S03 ? '' : '非'}动态使用`);
        it.tags.push(`档案${it?.S23 ? '' : '不'}规范`);
        return it;
      });
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        return this.$api.Person.list({
          pageSize: this.pageSize,
          pageNo: this.pageNo,
          name: this.queryForm.name,
          idCard: this.queryForm.idCard,
          hospital: this.queryForm.hospital
        });
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
    handlePageNoChange(no) {
      this.pageNo = no;
    },
    handlePageSizeChange(size) {
      this.pageNo = 1;
      this.pageSize = size;
    }
  }
};
</script>

<style scoped></style>
