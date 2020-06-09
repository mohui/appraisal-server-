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
          const user = await this.$api.User.profile(getToken());
          user.code =
            user.hospitals.length === 1 ? user.hospitals[0].id : user.regionId;
          //用户是否为地区权限
          user.isRegion = user.code === user.regionId ? true : false;
          this.user = user;
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
