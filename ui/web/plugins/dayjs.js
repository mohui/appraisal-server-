import dayjs from 'dayjs';
function dateFormat(value, format) {
  if (value instanceof Date) {
    return value.$format(format || 'YYYY-MM-DD');
  }
  return value;
}
export default {
  install(Vue) {
    Object.defineProperty(Vue.prototype, '$dayjs', {
      get() {
        return dayjs;
      }
    });
    Vue.filter('dateFormat', dateFormat);
  }
};
