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
        <span>个人档案详情</span>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'detail',
  data() {
    return {
      id: null
    };
  },
  created() {
    const id = this.$route.query.id;
    if (!id) this.$router.push('/person');
    this.id = id;
  },
  asyncComputed: {
    serverData: {
      async get() {
        return await this.$api.Person.detail(this.id);
      },
      default() {
        return {};
      }
    }
  }
};
</script>

<style scoped></style>
