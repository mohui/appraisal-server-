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
            >考核员工配置</el-button
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
        current-row-key="id"
        :span-method="spanMethod"
        :header-cell-style="{background: '#F3F4F7', color: '#555'}"
      >
        <el-table-column prop="member" label="考核员工"></el-table-column>
        <el-table-column prop="subMembers" label="关联员工" width="200">
          <template slot-scope="{row}">
            <el-tooltip
              v-if="$widthCompute([row.subMember]) >= 200"
              effect="dark"
              placement="top"
              :content="row.subMember"
            >
              <div slot="content" v-html="toBreak(row.subMember)"></div>
              <span class="cell-long-span">{{ row.subMember }}</span>
            </el-tooltip>
            <div v-else>{{ row.subMember }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="subRate" label="权重系数">
          <template slot-scope="{row}">
            <div>{{ row.subRate }}%</div>
          </template>
        </el-table-column>
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
        <el-form-item label="考核员工" prop="staff">
          <el-select
            v-model="newMember.staff"
            :disabled="newMember.id !== ''"
            collapse-tags
          >
            <el-option
              v-for="m in memberList"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="关联员工" prop="subMembers">
          <el-table border size="mini" :data="newMember.subMembers">
            <el-table-column label="员工" prop="name">
              <template slot-scope="{$index, row}">
                <div v-if="$index === 0">{{ row.member.join(',') }}</div>
                <div v-if="$index > 0">
                  <el-select
                    v-model="row.staffs"
                    multiple
                    collapse-tags
                    size="mini"
                  >
                    <el-option
                      v-for="m in memberList"
                      :key="m.id"
                      :label="m.name"
                      :value="m.id"
                      :disabled="
                        m.id === newMember.staff ||
                          newMember.subMembers.some(it =>
                            it.staffs.find(s => s === m.id)
                          )
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
                    :max="100"
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
            @click="
              newMember.subMembers.push({member: [], staffs: [], rate: 0})
            "
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

export default {
  name: 'Member',
  data() {
    const ValidSubMember = (rule, value, callback) => {
      if (value.some(v => v.staffs.length < 1 && v.rate < 1)) callback();
      if (value.some(v => v.staffs.length < 1 || v.rate < 1))
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
        id: '',
        member: '',
        staff: '',
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
        data.push({
          id: row.id,
          staff: row.staff,
          sources: row.sources,
          sourcesName: row.sourcesName,
          member: row.staffName, //名字
          subMember: row.sourcesName.join(','),
          subRate: row.rate * 100
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
          if (this.tableData[i].staff === this.tableData[i - 1].staff) {
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
    'newMember.staff'() {
      if (!this.newMember.id && this.newMember.staff) {
        this.newMember.subMembers = [];
        this.newMember.subMembers.push({
          //名字
          member: [
            this.memberList.find(it => it.id === this.newMember.staff).name
          ],
          staffs: [this.newMember.staff],
          rate: 100
        });
        this.newMember.subMembers.push({
          member: [],
          staffs: [],
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
        try {
          data = await this.$api.HisStaff.selHisStaffWorkSource();
          return {
            counts: data.length,
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
        return await this.$api.HisStaff.list();
      },
      default: []
    }
  },
  methods: {
    async submit() {
      try {
        const valid = await this.$refs['memberForm'].validate();
        if (valid) {
          if (!this.newMember.id) {
            const sourceRate = this.newMember.subMembers.map(it => ({
              source: it.staffs,
              rate: it.rate / 100
            }));
            await this.$api.HisStaff.addHisStaffWorkSource(
              this.newMember.staff,
              sourceRate
            );
            this.$message.success('添加成功');
          }
          if (this.newMember.id) {
            await Promise.all(
              this.newMember.subMembers.map(
                async it =>
                  await this.$api.HisStaff.updateHisStaffWorkSource(
                    this.newMember.staff,
                    it.staffs,
                    it.rate / 100
                  )
              )
            );
            this.$message.success('修改成功');
          }
          this.$asyncComputed.serverData.update();
          this.resetConfig();
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      }
    },
    editRow(row) {
      let currentSubMember = [];
      //属于该员工的所有数据集合
      const dataRows = this.tableData.filter(it => it.staff === row.staff);
      dataRows.forEach(r => {
        currentSubMember.push({
          id: r.id,
          staff: r.staff,
          staffs: r.sources,
          rate: r.subRate,
          member: r.sourcesName
        });
      });
      currentSubMember = currentSubMember.sort(a => {
        //把本人的数据排到第一个;
        return a.staffs.length === 1 && a.staffs[0] === a.staff ? -1 : 1;
      });
      this.newMember = JSON.parse(
        JSON.stringify({
          id: dataRows[0].id,
          member: row.member,
          staff: row.staff,
          subMembers: currentSubMember
        })
      );
      this.addMemberVisible = true;
    },
    async removeRow(row) {
      try {
        await this.$confirm('确定删除该配置?', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        //查询所以属于该考核员工的配置数据
        const removeRows = this.tableData.filter(it => it.staff === row.staff);
        //批量删除这些数据
        await Promise.all(
          removeRows.map(
            async it => await this.$api.HisStaff.delHisStaffWorkSource(it.id)
          )
        );
        this.$message.success('删除成功');
        this.$asyncComputed.serverData.update();
      } catch (e) {
        console.log(e);
      }
    },
    spanMethod({column, rowIndex}) {
      if (column.property !== 'subMembers' && column.property !== 'subRate') {
        const _row = this.spanArr[rowIndex];
        const _col = _row > 0 ? 1 : 0;
        return {rowspan: _row, colspan: _col};
      }
    },
    toBreak(content) {
      let contentStr = '';
      for (let index in content) {
        if (index !== '0' && index % 20 === 0) contentStr += '<br/>';
        contentStr += content[index];
      }
      return contentStr;
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
.cell-long-span {
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
</style>
