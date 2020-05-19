import dayjs from 'dayjs';

export default {
  install(Vue) {
    Object.defineProperty(Vue.prototype, '$dayjs', {
      get() {
        return dayjs;
      }
    });
  }
};
