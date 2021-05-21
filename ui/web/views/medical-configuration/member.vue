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
        border
        class="expanded-member-table"
        size="small"
        :data="tableData"
        height="100%"
        style="flex-grow: 1;"
        current-row-key="index"
        :span-method="spanMethod"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column prop="index" label="序号"></el-table-column>
        <el-table-column prop="member" label="考核员工"></el-table-column>
        <el-table-column prop="subMembers" label="关联员工">
          <template slot-scope="{row}">
            <div>{{ row.subMember }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="subRate" label="权重系数">
          <template slot-scope="{row}">
            <div>{{ row.subRate }}%</div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间"></el-table-column>
        <el-table-column prop="" label="操作">
          <template slot-scope="{row}">
            <el-tooltip content="编辑" :enterable="false">
              <el-button
                type="primary"
                icon="el-icon-edit"
                circle
                size="mini"
                @click="editRow(row)"
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
                <div v-if="$index === 0">{{ row.name.join(',') }}</div>
                <div v-if="$index > 0">
                  <el-select
                    v-model="row.name"
                    multiple
                    collapse-tags
                    size="mini"
                  >
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
                  ></el-input-number>
                  &nbsp;&nbsp;%
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作">
              <template slot-scope="{$index}">
                <el-button
                  type="text"
                  @click="newMember.subMembers.splice($index, 1)"
                  >删除</el-button
                >
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
      if (value.some(v => v.name.length < 1 && v.rate < 1)) callback();
      if (value.some(v => v.name.length < 1 || v.rate < 1))
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
      let data = [];
      this.serverData.rows.forEach(row => {
        row.subMembers.forEach(sub => {
          data.push({
            index: row.index,
            member: row.member,
            subMember: sub.name.join(','),
            subRate: sub.rate,
            createdAt: row.createdAt
          });
        });
      });
      return data;
    },
    spanArr() {
      let arr = [];
      let pos = 0;
      for (let i = 0; i < this.tableData.length; i++) {
        if (i === 0) {
          arr.push(1);
          pos = 0;
        } else {
          // 判断当前元素与上一个元素是否相同
          if (this.tableData[i].index === this.tableData[i - 1].index) {
            arr[pos] += 1;
            arr.push(0);
          } else {
            arr.push(1);
            pos = i;
          }
        }
      }
      return arr;
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
          name: [this.newMember.member],
          rate: 100
        });
        this.newMember.subMembers.push({
          name: [],
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
                  subMembers: [
                    {name: [`员工B${i}`], rate: 100},
                    {name: [`员工CC${i}`, `员工DD${i}`], rate: 90}
                  ],
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
            this.$set(this.serverData.rows, this.serverData.rows.length, {
              index: this.serverData.rows.length + 1,
              member: this.newMember.member,
              subMembers: this.newMember.subMembers.filter(
                it => it.name.length > 0
              ),
              createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
            });
            this.$message.success('添加成功');
          } else {
            this.$set(this.serverData.rows, this.newMember.index - 1, {
              index: this.newMember.index,
              member: this.newMember.member,
              subMembers: this.newMember.subMembers.filter(
                it => it.name.length > 0
              ),
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
    editRow(row) {
      const index = this.serverData.rows.findIndex(
        it => it.member === row.member
      );
      this.newMember = JSON.parse(JSON.stringify(this.serverData.rows[index]));
      this.addMemberVisible = true;
    },
    async removeRow(row) {
      const index = this.serverData.rows.findIndex(
        it => it.index === row.index
      );
      this.serverData.rows.splice(index, 1);
      this.$message.success('删除成功');
    },
    spanMethod({column, rowIndex}) {
      if (column.property !== 'subMembers' && column.property !== 'subRate') {
        const _row = this.spanArr[rowIndex];
        const _col = _row > 0 ? 1 : 0;
        return {rowspan: _row, colspan: _col};
      }
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
