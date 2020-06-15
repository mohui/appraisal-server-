<template>
  <div></div>
</template>

<script>
export default {
  name: 'Home',
  created() {
    //根据用户权限判断route到地区页还是机构页
    if (this.$settings.user.isRegion) {
      this.$router.replace({path: 'appraisal-result-area'});
    } else {
      this.$router.replace({path: 'appraisal-result-institutions'});
    }
  }
};
</script>

<style scoped></style>
