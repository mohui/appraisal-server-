import {getToken} from '../utils/cache';

export const settingPlugin = {
  install: function(Vue) {
    Vue.prototype.$settings = new Vue({
      data() {
        return {
          user: null,
          permissions: []
        };
      },
      methods: {
        async load() {
          this.user = await this.$api.User.profile(getToken());
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
