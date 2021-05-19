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
      <div slot="header" class="member-header">
        <span>工分项配置</span>
        <div>
          <el-button size="mini" type="primary" @click="addMemberVisible = true"
            >新增考核员工</el-button
          >
          <el-button
            size="mini"
            type="text"
            @click="$router.push('medical-configuration')"
            >返回</el-button
          >
        </div>
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
          <el-row>
            <el-col :span="6" :xs="24" :sm="12" :md="6" :lg="6" :xl="6">
              <el-form-item label="考核员工">
                <el-select
                  v-model="searchForm.member"
                  size="mini"
                  clearable
                  filterable
                ></el-select>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </kn-collapse>
      <el-table
        v-loading="tableLoading"
        stripe
        size="small"
        :data="tableData"
        height="100%"
        style="flex-grow: 1;"
        current-row-key="index"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column prop="index" label="序号"></el-table-column>
        <el-table-column prop="member" label="考核员工">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.member }}</div>
            <div v-else>
              <el-select v-model="tempRow.member" collapse-tags size="mini">
                <el-option
                  v-for="m in memberList"
                  :key="m.value"
                  :label="m.name"
                  :value="m.value"
                ></el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="subMembers" label="关联员工">
          <template slot-scope="{row}">
            <div v-if="!row.isEdit">{{ row.subMembers }}</div>
            <div v-else>
              <el-select
                v-model="tempRow.subMembers"
                size="mini"
                multiple
                collapse-tags
              >
                <el-option
                  v-for="m in memberList"
                  :key="m.value"
                  :label="m.name"
                  :value="m.value"
                ></el-option>
              </el-select>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间"></el-table-column>
        <el-table-column prop="" label="操作">
          <template slot-scope="{row}">
            <el-tooltip v-show="!row.isEdit" content="编辑" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click="editRow(row.index)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip
              v-show="row.isEdit"
              content="提交修改"
              :enterable="false"
            >
              <el-button
                type="success"
                icon="el-icon-check"
                circle
                size="mini"
                @click="submitEdit(row.index, tempRow)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip
              v-show="row.isEdit"
              content="取消修改"
              :enterable="false"
            >
              <el-button
                type="default"
                icon="el-icon-close"
                circle
                size="mini"
                @click="cancelEdit(row.index)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip v-show="!row.isEdit" content="删除" :enterable="false">
              <el-button
                type="danger"
                icon="el-icon-delete"
                circle
                size="mini"
                @click="removeRow(row)"
              >
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
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
    <el-dialog
      title="新建员工考核"
      :visible.sync="addMemberVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
      :before-close="resetConfig"
    >
      <el-form
        ref="memberForm"
        :model="newMember"
        :rules="memberRules"
        label-position="right"
        label-width="120px"
      >
        <el-form-item label="考核员工" prop="member">
          <el-select v-model="newMember.member" collapse-tags>
            <el-option
              v-for="m in memberList"
              :key="m.value"
              :label="m.name"
              :value="m.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="关联员工" prop="subMembers">
          <el-select v-model="newMember.subMembers" multiple>
            <el-option
              v-for="p in memberList"
              :key="p.value"
              :label="p.name"
              :value="p.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="权重系数" prop="rate">
          <el-input-number v-model="newMember.rate" :max="100">
          </el-input-number>
          %
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetConfig()">取 消</el-button>
        <el-button type="primary" @click="submit()">
          确 定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';
import dayjs from 'dayjs';

export default {
  name: 'Member',
  data() {
    return {
      isCollapsed: !!this.$settings.isMobile,
      permission: Permission,
      searchForm: {
        member: '',
        pageSize: 20,
        pageNo: 1
      },
      newMember: {
        member: '',
        subMembers: [],
        rate: 0
      },
      addMemberVisible: false,
      tempRow: '',
      memberRules: {
        member: [{required: true, message: '选择员工', trigger: 'change'}]
      },
      tableLoading: false
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows.map(d => ({...d, isEdit: false}));
    },
    memberList() {
      return this.serverMemberData;
    }
  },
  watch: {},
  asyncComputed: {
    serverData: {
      async get() {
        let data = [];
        this.tableLoading = true;
        const {member} = this.searchForm;
        console.log(member);
        try {
          await new Promise(resolve =>
            setTimeout(() => {
              for (let i = 0; i < 10; i++) {
                data.push({
                  index: i + 1,
                  member: `员工B${i}`,
                  subMembers: [`员工A${i}`],
                  createdAt: '2021-05-18 11:23:21'
                });
              }
              resolve();
            }, 1000)
          );
          return {
            counts: 10,
            rows: data
          };
        } catch (e) {
          console.error(e.message);
        } finally {
          this.tableLoading = false;
        }
      },
      default: {counts: 0, rows: []}
    },
    serverMemberData: {
      async get() {
        await new Promise(resolve => setTimeout(() => resolve(), 600));
        let i = 0;
        let data = [];
        for (; i < 10; i++) {
          data.push({name: `员工A${i}`, value: `员工A${i}`});
        }
        return data;
      },
      default: []
    }
  },
  methods: {
    async submit() {
      try {
        const valid = await this.$refs['memberForm'].validate();
        if (valid) {
          this.$set(this.serverData.rows, this.tableData.length, {
            index: this.tableData.length + 1,
            member: this.newMember.member,
            subMembers: this.newMember.subMembers,
            row: false,
            createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
          });
          this.resetConfig();
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      }
    },
    editRow(index) {
      if (this.tempRow) {
        this.$message.warning('已有其他数据正在编辑');
        return;
      }
      this.tableData[index - 1].isEdit = !this.tableData[index - 1].isEdit;
      this.tempRow = Object.assign({}, this.tableData[index - 1]);
      console.log(this.tempRow);
    },
    cancelEdit(index) {
      this.tableData[index - 1].isEdit = !this.tableData[index - 1].isEdit;
      this.tempRow = '';
    },
    async submitEdit(index, tempRow) {
      tempRow.isEdit = !tempRow.isEdit;
      this.$set(this.serverData.rows, index - 1, tempRow);
      this.$message.success('修改成功');
      this.tempRow = '';
    },
    async removeRow(row) {
      this.tableData.splice(
        this.tableData.findIndex(d => d.index === row.index),
        1
      );
      this.$message.success('删除成功');
    },
    resetConfig() {
      this.$refs['memberForm'].resetFields();
      this.addMemberVisible = false;
    }
  }
};
</script>

<style scoped>
.member-header {
  display: flex;
  justify-content: space-between;
}
</style>
