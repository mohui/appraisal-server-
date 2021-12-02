export const settingPlugin = {
  install: function(Vue) {
    Vue.prototype.$settings = new Vue({
      data() {
        return {
          user: null,
          permissions: [],
          isMobile: false
        };
      },
      methods: {
        async load() {
          this.user = await this.$api.User.profile();
          //TODO: 暂时处理员工类型的用户没有权限和角色字段
          this.user.permissions = this.user.permissions || [];
          if (this.user && this.user.roles)
            this.permissions = [
              ...new Set(this.user.roles.map(it => it.permissions).flat())
            ];
        },
        //清理缓存
        clean() {
          this.user = null;
        }
      }
    });
  }
};
