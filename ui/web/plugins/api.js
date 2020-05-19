import {KatoClient} from 'kato-client';
import {getToken, setToken} from '../utils/cache';

export const apiUrl = '/api';

const client = new KatoClient(apiUrl);

export async function getApiClient() {
  await client.init();
  return {
    install(Vue, {router}) {
      if (client.inited) {
        client.use(async (ctx, next) => {
          const token = getToken();

          let isWhite = false;
          for (let white of ['login.ac', 'title.ac'])
            isWhite = isWhite || ctx.req.url.endsWith(white);
          // 判断token是否失效
          if (!isWhite && !token) {
            // 失效, 跳转至login页面
            router.push('/login');
            console.warn('token失效...');
            return;
          }

          ctx.req.headers['token'] = token;
          await next();
          // 请求成功后, 刷新token
          token && setToken(token);
        });
      }
      Vue.prototype.$api = client;
    }
  };
}
