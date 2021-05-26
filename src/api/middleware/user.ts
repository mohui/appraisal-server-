import {Context} from '../context';
import {
  HospitalModel,
  RegionModel,
  RoleModel,
  UserModel
} from '../../database/model';
import {getLeaves} from '../group';
import {Op} from 'sequelize';

export async function UserMiddleware(ctx: Context | any, next: Function) {
  try {
    const token = ctx.req.header('token');
    if (token) {
      const user =
        (
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
        )?.toJSON() ?? null;
      if (!user) {
        await next();
        return;
      }
      //该用户的默认code
      user.code = user.areaCode;
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
      //如果是地区级别的用户重新配置其所属的机构 TODO: 有点苟且
      if (user.hospitals.length === 0) {
        const children = await getLeaves(user.areaCode);
        //查询该用户所属地区下的所有机构
        user.hospitals = (
          await HospitalModel.findAll({
            where: {
              id: {
                [Op.in]: children
                  .map(it => it.code)
                  //TODO: 苟且区分一下地区和机构
                  .filter(it => it.length === 36)
              }
            }
          })
        ).map(it => it.toJSON());
      }
      ctx.user = user;
    }
  } catch (e) {
    console.log(e);
  }
  await next();
}
