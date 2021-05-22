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
        <span>{{ query.name }}</span>
        <el-button-group style="padding-left: 20px;">
          <el-button
            size="small"
            :class="{'el-button--primary': query.type === 'attr'}"
            @click="typeChanged"
          >
            属性型
          </el-button>
          <el-button
            size="small"
            :class="{'el-button--primary': query.type === 'log'}"
            @click="typeChanged"
          >
            日志型
          </el-button>
        </el-button-group>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          plain
          @click="
            $router.push({
              name: 'manual'
            })
          "
          >返回
        </el-button>
      </div>
      <el-table
        :data="list"
        empty-text="没有筛选到符合条件的数据"
        stripe
        border
        size="small"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column
          type="index"
          align="center"
          label="序号"
        ></el-table-column>
        <el-table-column prop="members" label="考核员工">
          <template slot-scope="scope">
            <div v-if="!scope.row.EDIT">
              {{ scope.row.member }}
            </div>
            <el-select
              v-if="scope.row.EDIT"
              v-model="scope.row.memberId"
              filterable
              size="mini"
              placeholder="请选择"
            >
              <el-option
                v-for="item in members"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              >
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="value" label="数值" align="center">
          <template slot-scope="scope">
            <div v-if="!scope.row.EDIT">
              {{ scope.row.value }}
            </div>
            <el-input-number
              v-if="scope.row.EDIT"
              v-model="scope.row.value"
              size="mini"
              :min="1"
            ></el-input-number>
          </template>
        </el-table-column>
        <el-table-column
          prop="createdAt"
          label="时间"
          align="center"
        ></el-table-column>
        <el-table-column label="操作" align="center">
          <template slot-scope="scope">
            <el-button
              v-if="!scope.row.id"
              type="primary"
              size="mini"
              :disabled="!scope.row.memberId"
              @click="addManual(scope)"
            >
              添加
            </el-button>
            <el-button
              v-if="scope.row.id && scope.row.EDIT"
              type="primary"
              size="mini"
              :disabled="!scope.row.memberId"
              @click="saveManual(scope)"
            >
              保存
            </el-button>
            <el-button
              v-if="scope.row.id && !scope.row.EDIT && query.type === 'attr'"
              type="primary"
              size="mini"
              @click="editManual(scope)"
            >
              修改
            </el-button>
            <el-button
              v-if="scope.row.id && !scope.row.EDIT"
              type="danger"
              size="mini"
              @click="delManual(scope)"
            >
              清除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'Update',
  data() {
    return {
      query: {
        id: '',
        name: '',
        type: ''
      },
      members: [
        {
          value: 'zane',
          label: '张医生'
        },
        {
          value: 'wang',
          label: '王大夫'
        },
        {
          value: 'zebu',
          label: '周主任'
        },
        {
          value: 'li',
          label: '李院长'
        },
        {
          value: 'zak',
          label: '赵护士长'
        },
        {
          value: 'lii',
          label: '李主任'
        }
      ],
      list: []
    };
  },
  watch: {
    list: {
      handler: function(newValue) {
        if (
          newValue[newValue.length === 0 ? 0 : newValue.length - 1].id !== '' &&
          this.query.type === 'log'
        )
          newValue.push({
            EDIT: true,
            id: '',
            value: '',
            member: '',
            memberId: '',
            createdAt: new Date().$format()
          });
      },
      deep: true
    }
  },
  created() {
    this.query = this.$route.query;
    if (this.list.length === 0) {
      this.list.push({
        EDIT: false,
        id: new Date().getTime(),
        value: Math.floor(Math.random() * 10),
        member: '李院长',
        memberId: 'li',
        createdAt: new Date().$format()
      });
    }
  },
  methods: {
    typeChanged() {
      this.query.type = this.query.type === 'log' ? 'attr' : 'log';
      let list = this.list;

      if (this.query.type === 'log' && list[list.length - 1].id !== '') {
        this.list.push({
          EDIT: true,
          id: '',
          value: '',
          member: '',
          memberId: '',
          createdAt: new Date().$format()
        });
      }
      if (this.query.type === 'attr' && list[list.length - 1].id === '') {
        this.list.pop();
      }
    },
    addManual(item) {
      item.row.id = new Date().getTime();
      item.row.member = this.members.find(
        it => it.value === item.row.memberId
      ).label;
      item.row.EDIT = false;
    },
    editManual(item) {
      item.row.EDIT = true;
    },
    saveManual(item) {
      item.row.member = this.members.find(
        it => it.value === item.row.memberId
      ).label;
      item.row.EDIT = false;
    },
    delManual({$index}) {
      this.$confirm('确定要清除此记录?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(async () => {
          try {
            // await this.$api.xxx.remove(row.id);
            this.list.splice($index, 1);
            this.$message({
              type: 'success',
              message: '清除成功!'
            });
          } catch (e) {
            this.$message.error(e.message);
          }
        })
        .catch(() => {
          this.$message({
            type: 'info',
            message: '已取消清除'
          });
        });
    }
  }
};
</script>

<style lang="scss"></style>
