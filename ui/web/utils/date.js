import dayjs from 'dayjs';

export function install() {
  Date.prototype.$format = function(formatter = 'YYYY-MM-DD HH:mm:ss') {
    return dayjs(this).format(formatter);
  };
}
