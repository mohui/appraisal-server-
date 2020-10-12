import Vue from 'vue';
import {Permission} from '../../../common/permission.ts';

function isAllowed(permission, permissions) {
  if (typeof permission === 'string') {
    return permissions.includes(permission);
  }
  if (permission instanceof Array) {
    return permission.some(auth => permissions.indexOf(auth) >= 0);
  }
  return false;
}

Vue.directive('permission', {
  bind(el, binding) {
    let permission;
    let type;
    if (Object.prototype.toString.call(binding.value) === '[object Object]') {
      permission = binding.value.permission;
      type = binding.value.type;
    } else {
      permission = binding.value;
    }
    const isAllow =
      Vue.prototype.$settings.permissions.includes(Permission.SUPER_ADMIN) ||
      isAllowed(permission, Vue.prototype.$settings.permissions);
    const element = el;
    if (!isAllow && permission) {
      if (type) {
        element.disabled = true;
        element.style.opacity = 0.4;
        element.style.cursor = 'not-allowed';
      } else {
        element.style.display = 'none';
      }
    }
  }
});

export default Vue.directive('permission');
