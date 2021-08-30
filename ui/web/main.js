require('./utils/hack');
import Vue from 'vue';
import App from './App';
import Element from 'element-ui';
import './styles/main.scss';
import router from './router';
import AsyncComputed from './plugins/async-computed';
import {getApiClient} from './plugins/api';
import WidthCompute from './plugins/width-compute';
import dayjs from './plugins/dayjs';
import {settingPlugin} from './plugins/setting';
import * as echarts from 'echarts';
import './directive';
import KnDebounceInputComponent from './components/kn-debounce-input';
import KnAreaCascader from './components/kn-area-cascader';
import KnCollapse from './components/kn-collapse';

(async () => {
  Vue.config.productionTip = false;
  Vue.use(Element);
  Vue.use(AsyncComputed);
  Vue.use(await getApiClient(), {router});
  Vue.use(settingPlugin);
  Vue.use(WidthCompute);
  Vue.use(dayjs);
  Vue.prototype.$echarts = echarts;
  Vue.component('kn-debounce-input', KnDebounceInputComponent);
  Vue.component('kn-area-cascader', KnAreaCascader);
  Vue.component('kn-collapse', KnCollapse);

  new Vue({
    router,
    render: h => h(App)
  }).$mount('#app');
})();
