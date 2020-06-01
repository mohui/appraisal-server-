import {Context} from '../context';
import {UserModel} from '../../database/model';

export async function UserMiddleware(ctx: Context | any, next: Function) {
  try {
    const token = ctx.req.header('token');
    if (token) {
      ctx.user = await UserModel.findOne({where: {id: token}});
    }
  } catch (e) {
    console.log(e);
  }
  await next();
}
