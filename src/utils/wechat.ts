import axios, {AxiosInstance} from 'axios';
import * as dayjs from 'dayjs';
import {appDB} from '../app';

/**
 * 微信服务端接口调用类
 */
export class WeChatApi {
  private id: string;
  private secret: string;
  private instance: AxiosInstance;
  private expired = 5400;

  constructor(id, secret) {
    this.id = id;
    this.secret = secret;
    this.instance = axios.create({
      baseURL: 'https://api.weixin.qq.com',
      transformResponse: [
        data => {
          console.log(data.toString());
          const result = JSON.parse(data);
          // 调用出错
          if (result['errcode']) {
            throw new Error(result['errmsg']);
          } else {
            return result;
          }
        }
      ]
    });
  }

  /**
   * 获取微信AccessToken
   */
  async getAccessToken(): Promise<string> {
    return await appDB.joinTx(async () => {
      const now = dayjs();
      // 获取数据库中的token数据
      let tokenDB: {
        id: string;
        token: string;
        expired_at: Date;
      } = (
        await appDB.execute(
          `select * from wx_access_token where id = ? for update`,
          this.id
        )
      )[0];
      // 判断数据库token是否有效
      if (tokenDB && now.isBefore(tokenDB.expired_at)) {
        // 数据库token存在且未过期, 直接返回
        console.debug('数据库token有效, 直接返回');
        return tokenDB.token;
      } else {
        // 不存在或过期, 重新请求
        console.debug('数据库token无效, 请求微信服务器');
        // 请求微信服务器
        const result: {access_token: string; expires_in: number} = (
          await this.instance.get(
            `/cgi-bin/token?grant_type=client_credential&appid=${this.id}&secret=${this.secret}`
          )
        ).data;
        console.debug('微信返回值: ', result);
        tokenDB = {
          id: this.id,
          token: result.access_token,
          expired_at: now.add(this.expired, 'second').toDate()
        };
        // 刷新数据库token
        // language=PostgreSQL
        await appDB.execute(
          `
          insert into wx_access_token(id, token, expired_at)
          values (?, ?, ?)
          on conflict (id)
            do update set token      = excluded.token,
                          expired_at = excluded.expired_at,
                          updated_at = now()
        `,
          tokenDB.id,
          tokenDB.token,
          tokenDB.expired_at
        );
        return tokenDB.token;
      }
    });
  }

  /**
   * 登录凭证校验
   *
   * @param code 小程序登录时获取的code
   */
  async code2session(code): Promise<{openid: string; session_key: string}> {
    return (
      await this.instance.get(
        `/sns/jscode2session?appid=${this.id}&secret=${this.secret}&js_code=${code}&grant_type=authorization_code`
      )
    ).data;
  }

  /**
   * code获取用户手机号码
   *
   * @param access_token 接口调用凭证
   * @param code 手机号获取凭证
   */
  async getPhoneNumber(access_token, code): Promise<{purePhoneNumber: string}> {
    return (
      await this.instance.post(
        `/wxa/business/getuserphonenumber?access_token=${access_token}`,
        {code}
      )
    ).data.phone_info;
  }
}
