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
        <span>员工管理</span>
        <div>
          <el-button size="mini" type="primary" @click="addMemberVisible = true"
            >新增考核员工</el-button
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
        class="expanded-member-table"
        size="small"
        :data="tableData"
        height="100%"
        style="flex-grow: 1;"
        current-row-key="index"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column type="expand">
          <template slot-scope="{row}">
            <el-table size="mini" border :data="row.subMembers">
              <el-table-column label="员工" prop="name"></el-table-column>
              <el-table-column label="权重系数" prop="rate">
                <template slot-scope="{row}"> {{ row.rate }}% </template>
              </el-table-column>
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="index" label="序号"></el-table-column>
        <el-table-column prop="member" label="考核员工"></el-table-column>
        <el-table-column prop="createdAt" label="创建时间"></el-table-column>
        <el-table-column prop="" label="操作">
          <template slot-scope="{row}">
            <el-tooltip content="编辑" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click="editRow(row.index)"
              >
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除" :enterable="false">
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
      title="员工考核配置"
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
          <el-select
            v-model="newMember.member"
            collapse-tags
            :disabled="!!newMember.index || newMember.index < 0"
          >
            <el-option
              v-for="m in memberList"
              :key="m.value"
              :label="m.name"
              :value="m.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="关联员工" prop="subMembers">
          <el-table border size="mini" :data="newMember.subMembers">
            <el-table-column label="员工" prop="name">
              <template slot-scope="{$index, row}">
                <div v-if="$index === 0">{{ row.name }}</div>
                <div v-if="$index > 0">
                  <el-select v-model="row.name" size="mini">
                    <el-option
                      v-for="m in memberList"
                      :key="m.value"
                      :label="m.name"
                      :value="m.value"
                      :disabled="
                        m.name === newMember.member ||
                          newMember.subMembers.some(it => it.name === m.name)
                      "
                    ></el-option>
                  </el-select>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="权重系数" prop="rate">
              <template slot-scope="{$index, row}">
                <div v-if="$index === 0">{{ row.rate }}%</div>
                <div v-if="$index > 0">
                  <el-input-number
                    v-model="row.rate"
                    size="mini"
                  ></el-input-number
                  >%
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template slot-scope="{$index}">
                <div v-if="$index > 0">
                  <el-button
                    type="text"
                    @click="newMember.subMembers.splice($index, 1)"
                    >删除</el-button
                  >
                </div>
              </template>
            </el-table-column>
          </el-table>
        </el-form-item>
        <el-form-item>
          <el-button
            v-if="newMember.subMembers.length >= 1"
            type="warning"
            size="mini"
            @click="newMember.subMembers.push({name: '', rate: 0})"
            >新增关联员工</el-button
          >
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
    const ValidSubMember = (rule, value, callback) => {
      if (value.some(v => v.name === '' && v.rate < 1)) callback();
      if (value.some(v => v.name === '' || v.rate < 1))
        callback(new Error('关联员工信息未填写完整'));
      callback();
    };
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
        subMembers: []
      },
      addMemberVisible: false,
      memberRules: {
        member: [{required: true, message: '选择员工', trigger: 'change'}],
        subMembers: [{validator: ValidSubMember, trigger: 'blur'}]
      },
      tableLoading: false
    };
  },
  computed: {
    tableData() {
      return this.serverData.rows;
    },
    memberList() {
      return this.serverMemberData;
    }
  },
  watch: {
    'newMember.member'() {
      if (!this.newMember.index && this.newMember.member) {
        this.newMember.subMembers = [];
        this.newMember.subMembers.push({
          name: this.newMember.member,
          rate: 100
        });
        this.newMember.subMembers.push({
          name: '',
          rate: 0
        });
      }
    }
  },
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
                  subMembers: [{name: `员工B${i}`, rate: 100}],
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
          data.push({
            name: `员工A${i}`,
            value: `员工A${i}`
          });
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
          if (!this.newMember.index) {
            this.$set(this.serverData.rows, this.tableData.length, {
              index: this.tableData.length + 1,
              member: this.newMember.member,
              subMembers: this.newMember.subMembers.filter(it => it.name),
              createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
            });
            this.$message.success('添加成功');
          } else {
            this.$set(this.serverData.rows, this.newMember.index - 1, {
              index: this.newMember.index,
              member: this.newMember.member,
              subMembers: this.newMember.subMembers.filter(it => it.name),
              createdAt: this.newMember.createdAt
            });
          }
          this.resetConfig();
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      }
    },
    editRow(index) {
      this.newMember = JSON.parse(JSON.stringify(this.tableData[index - 1]));
      this.addMemberVisible = true;
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
      this.newMember = {member: '', subMembers: []};
    }
  }
};
</script>

<style lang="scss" scoped>
.member-header {
  display: flex;
  justify-content: space-between;
}

/deep/.expanded-member-table {
  .el-table__expanded-cell {
    padding: 10px 20px;
  }
}
</style>
