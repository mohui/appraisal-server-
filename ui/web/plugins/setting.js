import {getToken} from '../utils/cache';

export const settingPlugin = {
  install: function(Vue) {
    Vue.prototype.$settings = new Vue({
      data() {
        return {
          user: null
        };
      },
      methods: {
        async load() {
          this.user = await this.$api.User.profile(getToken());
        },
        //清理缓存
        clean() {
          this.user = null;
        }
      }
    });
  }
};
