import {Context as KatoContext} from 'kato-server';
import {Request, Response} from 'express';

//用于该项目的特定context,项目中任何使用kato context的地方都应该使用该context类
export class Context extends KatoContext {
  //http请求,默认是express的
  req: Request | any;
  //http响应,默认是express的
  res: Response | any;
  //当前用户
  user: any;

  static get current() {
    return KatoContext.current as Context;
  }

  //下面是短链接方法
  static get req(): Request {
    return this.current.req;
  }

  static get res(): Response {
    return this.current.res;
  }
}
