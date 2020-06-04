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
          const user = await this.$api.User.profile(getToken());
          return {user};
        }
      }
    });
  }
};
