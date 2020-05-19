export const settingPlugin = {
  install: function(Vue) {
    Vue.prototype.$settings = new Vue({
      data() {
        return {};
      },
      methods: {
        async load() {}
      }
    });
  }
};
