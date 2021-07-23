import {Context} from '../context';
import {appDB, originalDB} from '../../app';

export async function UserMiddleware(ctx: Context | any, next: Function) {
  try {
    const token = ctx.req.header('token');
    if (token) {
      // 查询用户表
      // language=PostgreSQL
      const userModels = await appDB.execute(
        `select "user".id,
                    "user".account,
                    "user".name,
                    "user".password,
                    "user".area "areaCode",
                    "user".region "regionId",
                    "user".creator "creatorId",
                    "user".editor "editorId",
                    "user".created_at,
                    "user".updated_at
             from "user"
             where id = ?`,
        token
      );
      if (userModels.length === 0) {
        await next();
        return;
      }
      const user = userModels[0];

      // 根据用户权限id查询下属机构
      user.hospitals = await originalDB.execute(
        // language=PostgreSQL
        `select code id,
                  name,
                  parent
             from area
             where label in ('hospital.center', 'hospital.station')
               and (code = ? or path like ?)`,
        user.areaCode,
        `%${user.areaCode}%`
      );

      // 根据地区查询当前地区信息
      // language=PostgreSQL
      user.region =
        (
          await originalDB.execute(
            `
                  select code,
                         name,
                         parent,
                         label
                  from area
                  where code = ?
                `,
            user.areaCode
          )
        )[0] ?? null;

      // 该用户的默认code
      user.code = user.areaCode;
      //用户是否为地区权限
      user.isRegion =
        user.region.label === 'hospital.center' ||
        user.region.label === 'hospital.station'
          ? false
          : true;

      // 查询role相关
      // language=PostgreSQL
      user.roles = await appDB.execute(
        `
            select role.id,
                   role.name,
                   role.creator,
                   role.permissions
            from user_role_mapping mapping
                   left join role on mapping.role_id = role.id
            where mapping.user_id = ?
          `,
        token
      );
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
