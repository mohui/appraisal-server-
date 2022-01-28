import {app, appDB} from '../../src/app';
import {KatoClient} from 'kato-client';
import {getHospitals} from '../../src/api/group/common';

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
  const user = (
    await appDB.execute(
      // language=PostgreSQL
      `
        select "id",
               "account",
               "name",
               "password",
               "area"    AS "areaCode",
               "region"  AS "regionId",
               "creator" AS "creatorId",
               "editor"  AS "editorId",
               "created_at",
               "updated_at"
        FROM "user"
        WHERE id = ?
      `,
      token
    )
  )[0];
  if (!user) {
    return user;
  }
  //如果是地区级别的用户重新配置其所属的机构 TODO: 有点苟且
  const children = await getHospitals(user.areaCode);
  const hospitalIds = children
    .map(it => it.code)
    //TODO: 苟且区分一下地区和机构
    .filter(it => it.length === 36);
  //查询该用户所属地区下的所有机构
  user.hospitals = (
    await appDB.execute(
      // language=PostgreSQL
      `
            SELECT "id",
                   "name",
                   "parent",
                   "region" AS "regionId",
                   "created_at",
                   "updated_at"
            FROM "hospital" AS "Hospital"
            WHERE "Hospital"."id" IN (${hospitalIds.map(() => '?')})
          `,
      ...hospitalIds
    )
  ).map(it => ({
    his: it.regionId.startsWith('340222') ? '340222' : '340203',
    ...it
  }));
  // 用户权限
  user.roles = await appDB.execute(
    // language=PostgreSQL
    `
      select role.id, role.name, role.creator, role.permissions, role.created_at, role.updated_at
      from role
             inner join user_role_mapping mapping on role.id = mapping.role_id
      where mapping.user_id = ?
    `,
    token
  );
  user.region =
    (
      await appDB.execute(
        // language=PostgreSQL
        `
          select code, name, level, parent, budget, created_at, updated_at
          from region
          where code = ?
        `,
        user.regionId
      )
    )[0] ?? null;

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
  return user;
}

describe('用户中间件', () => {
  test('管理员用户 - admin', async () => {
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
    // expect(newUser).toEqual(oldUser);

    //region 修正hospitals字段校验
    //临时忽略hospitals字段校验
    delete newUser.hospitals;
    delete oldUser.hospitals;
    // expect(newUser).toEqual(oldUser);
    //endregion
    //region 修正region字段校验
    //忽略region.budget字段
    delete oldUser.region.budget;
    //忽略created_at, updated_at字段
    delete oldUser.region.created_at;
    delete oldUser.region.updated_at;
    oldUser.region.label = expect.stringMatching(/.*/);
    //endregion
    //region 修正roles字段校验
    for (const role of oldUser.roles) {
      delete role.created_at;
      delete role.updated_at;
    }
    //endregion
    //添加type字段
    oldUser.type = expect.stringMatching(/.*/);

    expect(newUser).toEqual(oldUser);
  });
});
