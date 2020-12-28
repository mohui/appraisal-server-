<template>
  <div></div>
</template>

<script>
export default {
  name: 'Home',
  created() {
    //进入考核结果页
    this.$router.replace({path: 'appraisal-result-institutions'});
  }
};
</script>

<style scoped></style>
