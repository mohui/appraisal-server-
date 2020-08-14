<template>
  <div class="full">
    <div class="error">
      <i class="el-icon-lock"></i>
      <span>你没有权限访问该页面</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'page401'
};
</script>

<style lang="scss" scoped>
.full {
  height: 100%;
  width: 100%;
  display: flex;
  align-items: center;
}
.error {
  flex: 1;
  text-align: center;
  font-size: 20px;
  color: #888;
}
</style>
