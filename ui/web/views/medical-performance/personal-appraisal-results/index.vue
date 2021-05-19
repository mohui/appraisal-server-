<template>
  <div class="wrapper">
    <div>
      <!--顶部表头-->
      <div class="card" v-sticky>
        <span>
          张洪波
        </span>
        <span>
          校正后总得分（分）：200
        </span>
        <span>
          质量系数：80%
        </span>
      </div>
      <div>
        <el-row :gutter="20" style="margin: 20px -10px">
          <el-col :span="8" :xs="24" :sm="8" :md="8" :lg="8" :xl="8">
            <div class="card" style="height: 460px">
              a
            </div>
          </el-col>
          <el-col :span="16" :xs="24" :sm="16" :md="16" :lg="16" :xl="16">
            <div class="card" style="height: 200px">
              b
            </div>
            <div class="card" style="height: 200px ; margin-top: 20px">
              c
            </div>
          </el-col>
        </el-row>
      </div>
      <div class="card" style="height: 300px ; margin-top: 20px">
        d
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'index'
};
</script>

<style scoped lang="scss">
.wrapper {
  height: 100%;
  position: relative;

  & > div {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    overflow-x: hidden;
    overflow-y: auto;
  }
}
.card {
  border-radius: 4px;
  border: 1px solid #ebeef5;
  background-color: #ffffff;
  //overflow: hidden;
  color: #303133;
  transition: 0.3s;
  padding: 20px;
}
</style>
