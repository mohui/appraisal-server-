import {app, appDB} from '../../src/app';
import {KatoClient} from 'kato-client';
import {
  HospitalModel,
  RegionModel,
  RoleModel,
  UserModel
} from '../../src/database';
import {getLeaves} from '../../src/api/group';
import {Op} from 'sequelize';

let api;
beforeAll(async () => {
  await app.start();
  api = new KatoClient('http://localhost:3000/api');
  await api.init();
});

afterAll(async () => {
  await app.shutdown();
});

/**
 * 旧版获取用户信息
 *
 * @param token token
 */
async function getUser(token) {
  const user =
    (
      await UserModel.findOne({
        where: {id: token},
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
    return user;
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
  return user;
}

describe('用户中间件', () => {
  test('用户admin', async () => {
    //查询id
    const token = (
      await appDB.execute(`select id from "user" where account='admin'`)
    )[0]?.id;
    //设置token
    api.use(async (ctx, next) => {
      ctx.req.headers['token'] = token;
      await next();
    });
    //获取用户
    const newUser = await api.User.profile();
    const oldUser = await getUser(token);

    expect(newUser).toStrictEqual(oldUser);
  });
});
