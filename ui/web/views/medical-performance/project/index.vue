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
        <span>手动考核</span>
        <el-button
          style="float: right;margin: -4px 0 0 20px;"
          size="small"
          type="primary"
          @click="
            $router.push({
              name: 'medical-performance'
            })
          "
          >返回
        </el-button>
      </div>
      <div class="project-tap">
        <el-button-group>
          <el-button
            size="small"
            :class="{'el-button--primary': flag === 'base'}"
            @click="flagChanged"
          >
            基础得分
          </el-button>
          <el-button
            size="small"
            :class="{'el-button--primary': flag === 'quality'}"
            @click="flagChanged"
          >
            质量系数
          </el-button>
        </el-button-group>

        <el-select
          v-show="flag === 'base'"
          v-model="markingStatus"
          size="small"
          clearable
          placeholder="请选择打分状态"
        >
          <el-option
            v-for="item in optionsA"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
        <el-select
          v-show="flag !== 'base'"
          v-model="modeStatus"
          size="small"
          clearable
          placeholder="请选择打分方式"
        >
          <el-option
            v-for="item in optionsB"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
          </el-option>
        </el-select>
      </div>
      <el-table
        v-show="flag === 'base'"
        stripe
        border
        size="small"
        :data="projectList"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column type="index" align="center" label="序号">
        </el-table-column>
        <el-table-column prop="item" label="工分项"></el-table-column>
        <el-table-column prop="status" label="状态"></el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button
              size="small"
              type="primary"
              @click="
                $router.push({
                  name: 'marking-doctor',
                  query: {
                    id: scope.row.id,
                    name: scope.row.item
                  }
                })
              "
            >
              打分
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-table
        v-show="flag !== 'base'"
        stripe
        border
        size="small"
        :data="modeList"
        height="100%"
        style="flex-grow: 1;"
      >
        <el-table-column type="index" align="center" label="序号">
        </el-table-column>
        <el-table-column prop="plan" label="方案"></el-table-column>
        <el-table-column prop="doctor" label="员工"></el-table-column>
        <el-table-column prop="doctorId" label="员工编号"></el-table-column>
        <el-table-column prop="quality" label="质量系数"></el-table-column>
        <el-table-column prop="mode" label="打分方式"></el-table-column>
        <el-table-column label="操作">
          <template slot-scope="scope">
            <el-button
              size="small"
              type="primary"
              @click="
                $router.push({
                  name: 'marking-target',
                  query: {
                    id: scope.row.id,
                    name: scope.row.plan,
                    doctor: scope.row.doctor
                  }
                })
              "
            >
              打分
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'CheckProject',
  data() {
    return {
      projectList: [
        {
          id: new Date().getTime(),
          item: '测试项目',
          status: '已打分'
        }
      ],
      modeList: [
        {
          id: new Date().getTime(),
          plan: '测试方案',
          doctor: '赵医生',
          doctorId: new Date().getTime(),
          quality: '80%',
          mode: '自动打分'
        }
      ],
      flag: 'base', // quality(质量系数) | base（基础得分）
      markingStatus: '',
      modeStatus: '',
      optionsA: [
        {
          value: '0',
          label: '未打分'
        },
        {
          value: '-1',
          label: '部分打分'
        },
        {
          value: '1',
          label: '已打分'
        }
      ],
      optionsB: [
        {
          value: 'auto',
          label: '自动打分'
        },
        {
          value: 'manual',
          label: '手动打分'
        }
      ]
    };
  },
  methods: {
    flagChanged() {
      this.flag = this.flag === 'base' ? 'quality' : 'base';
    }
  }
};
</script>

<style scoped>
.project-tap {
  display: flex;
  padding-bottom: 10px;
  justify-content: space-between;
}
</style>
