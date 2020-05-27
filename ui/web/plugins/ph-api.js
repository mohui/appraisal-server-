import {KatoClient} from 'kato-client';

const phClient = new KatoClient('https://ph-api-dev.bjknrt.com/api');
export async function getPhApiClient() {
  await phClient.init();
  return {
    install(Vue, {router}) {
      if (phClient.inited) {
        phClient.use(async (ctx, next) => {
          const token = 'e6846cb105393379d6333afcd1fb7adf';

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
          // token && setToken(token);
        });
      }
      Vue.prototype.$phApi = phClient;
    }
  };
}
