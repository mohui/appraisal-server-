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
        <span>配置列表</span>
      </div>
      <kn-collapse
        :is-show="$settings.isMobile"
        :is-collapsed="isCollapsed"
        @toggle="is => (isCollapsed = is)"
      >
        <el-form
          ref="ruleForm"
          :model="searchForm"
          label-width="100px"
          size="mini"
        >
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="打分方式:">
              <el-select
                v-model="searchForm.account"
                size="mini"
                clearable
              ></el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="打分标准:">
              <el-select
                v-model="searchForm.account"
                size="mini"
                clearable
              ></el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
            <el-form-item label="工分项:">
              <el-input
                v-model="searchForm.account"
                size="mini"
                clearable
              ></el-input>
            </el-form-item>
          </el-col>
        </el-form>
      </kn-collapse>
      <el-table
        stripe
        size="small"
        :data="[]"
        height="100%"
        style="flex-grow: 1;"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
      </el-table>
      <el-pagination
        background
        :current-page="searchForm.pageNo"
        :page-size="searchForm.pageSize"
        layout="total, sizes, prev, pager, next"
        style="margin:10px 0 -20px;"
        :total="0"
        @size-change="
          size => {
            searchForm.pageSize = size;
            searchForm.pageNo = 1;
          }
        "
        @current-change="
          no => {
            searchForm.pageNo = no;
          }
        "
      >
      </el-pagination>
    </el-card>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';

export default {
  name: 'User',
  data() {
    return {
      isCollapsed: !!this.$settings.isMobile,
      permission: Permission,
      searchForm: {
        pageSize: 20,
        pageNo: 1
      }
    };
  },
  computed: {},
  watch: {},
  asyncComputed: {},
  methods: {}
};
</script>

<style scoped></style>
