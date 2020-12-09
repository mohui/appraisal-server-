import Cookie from 'js-cookie';
import dayjs from 'dayjs';
import Vue from 'vue';
const USER_TOKEN = 'appraisal_user_token';
const USER_ROUTE = 'appraisal_user_route';

export function setToken(value) {
  return Cookie.set(USER_TOKEN, value, {
    expires: dayjs()
      .add(4, 'h')
      .toDate()
  });
}

export function getToken() {
  return Cookie.get(USER_TOKEN);
}

export function removeToken() {
  return Cookie.remove(USER_TOKEN);
}

export function cleanCache() {
  Vue.prototype.$settings.clean();
  removeToken();
}

export function getRoute() {
  return JSON.parse(localStorage.getItem(USER_ROUTE));
}

export function setRoute(route) {
  console.log('route', route);
  localStorage.setItem(USER_ROUTE, JSON.stringify(route));
}

export function removeRoute() {
  localStorage.removeItem(USER_ROUTE);
}
