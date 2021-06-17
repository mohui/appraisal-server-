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
                >
                  <el-option
                    v-for="m in memberList"
                    :key="m.id"
                    :label="m.name"
                    :value="m.id"
                  ></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :lg="6" :md="6" :sm="12" :span="6" :xl="6" :xs="24">
              <el-form-item>
                <el-button
                  size="mini"
                  type="primary"
                  @click="$asyncComputed.serverData.update()"
                  >查询</el-button
                >
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </kn-collapse>
      <el-table
        v-loading="$asyncComputed.serverData.updating"
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
        <el-table-column
          prop="member"
          label="考核员工"
          width="100"
          align="center"
        ></el-table-column>
        <el-table-column prop="subMembers" label="关联员工" align="center">
          <template slot-scope="{row}">
            <el-tooltip
              v-if="$widthCompute([row.subMember]) >= 400"
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
        <el-table-column
          prop="subRate"
          label="权重系数"
          align="center"
          width="80"
        >
          <template slot-scope="{row}">
            <div v-if="!row.avg">{{ row.subRate }}%</div>
            <div v-if="row.avg">平均分配</div>
          </template>
        </el-table-column>
        <el-table-column prop="opera" label="操作" align="center" width="200">
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
                :disabled="row.removeLoading"
                :icon="row.removeLoading ? 'el-icon-loading' : 'el-icon-delete'"
                circle
                size="mini"
                @click="removeRow(row)"
              >
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog
      title="员工考核配置"
      :visible.sync="addMemberVisible"
      :width="$settings.isMobile ? '99%' : '50%'"
      :before-close="resetConfig"
      :close-on-press-escape="false"
      :close-on-click-modal="false"
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
            :disabled="newMember.staff !== '' && newMember.id !== ''"
            collapse-tags
            filterable
          >
            <el-option
              v-for="m in memberList"
              :key="m.id"
              :disabled="!m.usable"
              :label="m.name"
              :value="m.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="关联员工" prop="subMembers">
          <el-table
            v-loading="newMemberLoading"
            :data="newMember.subMembers"
            border
            size="mini"
          >
            <el-table-column label="员工" prop="name" width="200">
              <template slot-scope="{$index, row}">
                <div>
                  <el-select
                    v-model="row.staffs"
                    multiple
                    collapse-tags
                    filterable
                    size="mini"
                  >
                    <el-option
                      v-for="m in memberList"
                      :key="m.id"
                      :label="m.name"
                      :value="m.id"
                      :disabled="
                        m.id === newMember.staff ||
                          newMember.subMembers.some(
                            it =>
                              !row.staffs.includes(m.id) &&
                              it.staffs.some(s => s === m.id)
                          )
                      "
                    ></el-option>
                  </el-select>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="权重系数" prop="rate" min-width="360">
              <template slot-scope="{$index, row}">
                <div>
                  <el-switch
                    style="margin-right: 10px"
                    v-model="row.avg"
                    inactive-color="#13ce66"
                    active-text="比例分配"
                    inactive-text="平均分配"
                    :active-value="false"
                    :inactive-value="true"
                  ></el-switch>

                  <el-input-number
                    v-show="!row.avg"
                    style="width: 100px"
                    v-model="row.rate"
                    size="mini"
                  ></el-input-number>
                  <span v-show="!row.avg">&nbsp;&nbsp;%</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template slot-scope="{$index, row}">
                <el-button type="text" @click="removeSubMember(row, $index)"
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
              newMember.subMembers.push({
                member: [],
                staffs: [],
                rate: 0,
                avg: false
              })
            "
            >新增关联员工</el-button
          >
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetConfig()">取 消</el-button>
        <el-button v-loading="submitLoading" type="primary" @click="submit()">
          确 定
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import {Permission} from '../../../../common/permission.ts';
import {Decimal} from 'decimal.js';
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
        staff: [{required: true, message: '选择员工', trigger: 'change'}],
        subMembers: [{validator: ValidSubMember, trigger: 'blur'}]
      },
      submitLoading: false,
      newMemberLoading: false
    };
  },
  computed: {
    tableData() {
      let data = [];
      //相同父员工的数据归类
      const reduceData = this.serverData.rows
        .filter(
          it => !this.searchForm.member || this.searchForm.member === it.staff
        )
        .reduce((pre, next) => {
          const cur = pre.find(p => p.staff === next.staff);
          if (cur) {
            cur.subs.push({
              id: next.id,
              staff: next.staff,
              sources: next.sources,
              sourcesName: next.sourcesName,
              member: next.staffName, //名字
              subMember: next.sourcesName.join(','),
              subRate: next.rate,
              avg: next.avg
            });
          } else
            pre.push({
              staff: next.staff,
              subs: [
                {
                  id: next.id,
                  staff: next.staff,
                  sources: next.sources,
                  sourcesName: next.sourcesName,
                  member: next.staffName, //名字
                  subMember: next.sourcesName.join(','),
                  subRate: next.rate,
                  avg: next.avg
                }
              ]
            });
          return pre;
        }, []);
      //再按每条绑定数据平铺
      reduceData.forEach(reduce => {
        reduce.subs.forEach(row => {
          data.push({
            id: row.id,
            staff: row.staff,
            sources: row.sources,
            sourcesName: row.sourcesName,
            member: row.member, //名字
            avg: row.avg,
            subMember: row.sourcesName.join(','),
            subRate: new Decimal(row.subRate).mul(100).toNumber(),
            removeLoading: false
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
      return this.serverMemberData.map(it => ({
        ...it,
        name: it.remark ? `${it.name} (${it.remark})` : it.name
      }));
    }
  },
  watch: {
    'newMember.staff': async function() {
      this.newMember.subMembers = [];
      if (this.newMember.id && this.newMember.staff) {
        try {
          this.newMemberLoading = true;
          const oldSubMembers = await this.$api.HisStaff.searchHisStaffWorkSource(
            this.newMember.staff
          );
          if (oldSubMembers.length > 0) {
            //该员工原本有绑定过其他员工,则直接列表上修改原数据
            this.newMember.id = oldSubMembers[0].id;
            this.newMember.staff = oldSubMembers[0].staff;
            this.newMember.subMembers = oldSubMembers
              .map(it => ({
                id: it.id,
                member: it.sources.map(s => s.name),
                staffs: it.sources.map(s => s.id),
                rate: new Decimal(it.rate).mul(100).toNumber(),
                avg: it.avg || false
              }))
              .sort(a => {
                //把本人的数据排到第一个;
                return a.staffs.length === 1 &&
                  a.staffs[0] === this.newMember.staff
                  ? -1
                  : 1;
              });
          }
        } catch (e) {
          console.error(e);
        } finally {
          this.newMemberLoading = false;
        }
      } else if (this.newMember.staff) {
        this.newMember.id = '';
        //该员工未绑定过,默认绑定自己
        this.newMember.subMembers.push({
          //名字
          member: [
            this.memberList.find(it => it.id === this.newMember.staff).name
          ],
          staffs: [this.newMember.staff],
          rate: 100,
          avg: false
        });
        this.newMember.subMembers.push({
          member: [],
          staffs: [],
          rate: 0,
          avg: false
        });
      }
    }
  },
  asyncComputed: {
    serverData: {
      async get() {
        let data = [];
        try {
          console.log(this.searchForm.member);
          data = await this.$api.HisStaff.selHisStaffWorkSource();
          return {
            counts: data.length,
            rows: data
          };
        } catch (e) {
          this.$message.error(e.message);
          console.error(e.message);
          return {counts: 0, rows: []};
        }
      },
      default: {counts: 0, rows: []}
    },
    serverMemberData: {
      async get() {
        try {
          return await this.$api.HisStaff.workSourceStaffList();
        } catch (e) {
          this.$message.error(e.message);
          console.error(e.message);
          return {counts: 0, rows: []};
        }
      },
      default: []
    }
  },
  methods: {
    async submit() {
      try {
        const valid = await this.$refs['memberForm'].validate();
        if (valid) {
          this.submitLoading = true;
          if (!this.newMember.id) {
            const sourceRate = this.newMember.subMembers
              .filter(it => it.rate > 0 && it.staffs.length > 0)
              .map(it => ({
                source: it.staffs,
                avg: it.avg,
                rate: it.rate / 100
              }));
            await this.$api.HisStaff.addHisStaffWorkSource(
              this.newMember.staff,
              sourceRate
            );
            this.$message.success('添加成功');
          }
          console.log(this.newMember.subMembers);
          if (this.newMember.id) {
            await Promise.all(
              this.newMember.subMembers.map(async it => {
                if (it.id) {
                  //编辑原有数据
                  return await this.$api.HisStaff.updateHisStaffWorkSource(
                    it.id,
                    it.staffs,
                    it.rate / 100,
                    it.avg
                  );
                }
                if (!it.id && it.staffs.length > 0 && it.rate > 0) {
                  //在编辑操作中又添加新的绑定关系
                  return await this.$api.HisStaff.addHisStaffWorkSource(
                    this.newMember.staff,
                    [
                      {
                        source: it.staffs,
                        avg: it.avg,
                        rate: it.rate / 100
                      }
                    ]
                  );
                }
              })
            );
            await Promise.all(
              //需要删除的绑定关系
              this.newMember.oldMembers
                .filter(
                  it => !this.newMember.subMembers.some(s => s.id === it.id)
                )
                .map(async del =>
                  this.$api.HisStaff.delHisStaffWorkSource(del.id)
                )
            );
            this.$message.success('修改成功');
          }
          this.$asyncComputed.serverData.update();
          //刷新最新的员工列表
          this.$asyncComputed.serverMemberData.update();
          this.resetConfig();
        }
      } catch (e) {
        console.error(e);
        if (e) this.$message.error(e.message);
      } finally {
        this.submitLoading = false;
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
          member: r.sourcesName,
          avg: r.avg || true
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
          oldMembers: currentSubMember,
          subMembers: currentSubMember
        })
      );
      this.addMemberVisible = true;
    },
    async removeRow(row) {
      try {
        await this.$confirm(
          `确定删除 ${row.member} 和 "${row.subMember}"该配置?`,
          '提示',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        );
        row.removeLoading = true;
        await this.$api.HisStaff.delHisStaffWorkSource(row.id);
        this.$message.success('删除成功');
        this.$asyncComputed.serverData.update();
        this.$asyncComputed.serverMemberData.update();
      } catch (e) {
        e !== 'cancel' ? this.$message.error(e?.message) : '';
      } finally {
        row.removeLoading = false;
      }
    },
    async removeSubMember(row, index) {
      this.newMember.subMembers.splice(index, 1);
    },
    spanMethod({column, rowIndex}) {
      if (
        column.property !== 'subMembers' &&
        column.property !== 'opera' &&
        column.property !== 'subRate'
      ) {
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
      this.newMember = {id: '', member: '', staff: '', subMembers: []};
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
