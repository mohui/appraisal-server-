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
          /**
           * 警告框提示并跳转至登录页面
           *
           * @param message? 提示信息
           */
          const goLogin = message => {
            if (message) Vue.prototype.$message.warning(message);
            router.push('/login');
          };
          const token = getToken();

          let isWhite = false;
          for (let white of ['login.ac', 'title.ac', 'register.ac'])
            isWhite = isWhite || ctx.req.url.endsWith(white);
          // 判断token是否失效
          if (!isWhite && !token) {
            goLogin();
            return;
          }

          token && (ctx.req.headers['token'] = token);
          //TODO: 临时使用user-type
          token &&
            (ctx.req.headers['type'] = localStorage.getItem('user-type'));
          await next();
          const res = ctx.res;
          //region 下载处理
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
          //endregion
          //region kato错误处理
          try {
            //解析返回值
            let resp = JSON.parse(res.data);
            //用户数据无效, 重新登录
            if (resp['_KatoErrorCode_'] === 10000) {
              goLogin(resp['_KatoErrorMessage_']);
              return;
            }
          } catch (e) {
            //json解析失败, 该异常不必处理
            console.warn('kato错误处理异常', e);
          }
          //endregion
          // 请求成功后, 刷新token
          token && setToken(token);
        });
      }
      Vue.prototype.$api = client;
    }
  };
}
