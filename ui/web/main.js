import Vue from 'vue';
import App from './App';

(async () => {
  Vue.config.productionTip = false;

  new Vue({
    render: h => h(App)
  }).$mount('#app');
})();
