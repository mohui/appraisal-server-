import Cookie from 'js-cookie';
import dayjs from 'dayjs';

const USER_TOKEN = 'user_token';

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
  removeToken();
}
