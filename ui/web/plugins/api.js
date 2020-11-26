import {KatoClient} from 'kato-client';
import {getToken, setToken} from '../utils/cache';
import ContentDisposition from 'content-disposition';
import FileSaver from 'file-saver';
import axios from 'axios';
export const apiUrl = '/api';

const Dispatcher = async req => {
  const res = await axios({
    method: 'post',
    url: req.url,
    data: req.data,
    headers: req.headers,
    responseType: 'arraybuffer'
  });
  if (res.headers['content-type'] === 'application/json')
    res.data = Buffer.from(res.data).toString('utf-8');
  return {
    data: res.data,
    statusCode: res.status,
    type: res.headers['content-type'],
    headers: res.headers
  };
};
const client = new KatoClient(apiUrl, {
  dispatcher: Dispatcher
});

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

          token && (ctx.req.headers['token'] = token);
          await next();
          const res = ctx.res;
          const contentType = res.headers['content-type'];
          if (
            ['application/octet-stream', 'application/vnd.ms-excel'].includes(
              contentType
            )
          ) {
            try {
              const attachment = ContentDisposition.parse(
                res.headers['content-disposition']
              );
              FileSaver.saveAs(
                new Blob([res.data]),
                attachment.parameters.filename
              );
            } catch (e) {
              console.error(e);
            }
            ctx.res.data = '';
          }
          // 请求成功后, 刷新token
          token && setToken(token);
        });
      }
      Vue.prototype.$api = client;
    }
  };
}
