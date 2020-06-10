import {Context} from '../context';
import {
  HospitalModel,
  RegionModel,
  RoleModel,
  UserModel
} from '../../database/model';

export async function UserMiddleware(ctx: Context | any, next: Function) {
  try {
    const token = ctx.req.header('token');
    if (token) {
      const user = (
        await UserModel.findOne({
          where: {id: Context.req.headers.token},
          include: [
            {
              model: HospitalModel,
              through: {
                attributes: []
              }
            },
            {
              model: RoleModel,
              through: {
                attributes: []
              }
            },
            {
              model: RegionModel
            }
          ]
        })
      ).toJSON();
      //该用户的默认code
      user.code =
        user.hospitals.length === 1 ? user.hospitals[0].id : user.regionId;
      //用户是否为地区权限
      user.isRegion = user.code === user.regionId;
      //用户权限去重整理
      user.permissions = [
        ...new Set(
          user.roles
            .map(it => it.permissions)
            .reduce((result, next) => result.concat(next), [])
        )
      ];
      ctx.user = user;
    }
  } catch (e) {
    console.log(e);
  }
  await next();
}
