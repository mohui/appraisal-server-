<template>
  <div>
    <!--顶部表头-->
    <el-card v-sticky shadow="never">
      <span class="header-title">
        中心绩效考核
      </span>
    </el-card>
    <div>
      <el-row :gutter="20" style="margin: 20px -10px">
        <el-col :span="8" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
          <el-card shadow="hover" style="height: 250px">
            <el-col :span="12">
              考核得分
            </el-col>
            <el-col :span="12">
              质量系数
            </el-col>
          </el-card>
        </el-col>
        <el-col :span="16" :xs="24" :sm="16" :md="16" :lg="16" :xl="16">
          <el-card shadow="hover" style="height: 250px">
            员工列表
          </el-card>
        </el-col>
      </el-row>
    </div>
    <el-card shadow="hover">
      项目得分表
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'index'
};
</script>

<style scoped lang="scss">
@import '../../styles/vars';

.header-title {
  font: bold 20px/2 Arial;
  color: $color-primary;
  margin-right: 10px;
}
</style>
