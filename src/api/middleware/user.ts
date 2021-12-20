import {Context} from '../context';
import {appDB, originalDB} from '../../app';
import {getHospitals} from '../group/common';

/**
 * 用户类型枚举
 */
export enum UserType {
  //员工
  STAFF = 'STAFF'
}

export async function UserMiddleware(ctx: Context | any, next: Function) {
  try {
    const token = ctx.req.header('token');
    const type = ctx.req.header('type');
    //加入staff逻辑
    if (token && type == UserType.STAFF) {
      const staffModel: {
        hospital: string;
        id: string;
        name: string;
        department_id: string | null;
        department_name: string | null;
      } = (
        await appDB.execute(
          //language=PostgreSQL
          `
            select s.id, s.name, s.hospital, d.id as department_id, d.name as department_name
            from staff s
                   left join his_department d on s.department = d.id
            where s.id = ?
          `,
          token
        )
      )[0];
      if (staffModel) {
        ctx.user = {
          type: UserType.STAFF,
          id: staffModel.id,
          name: staffModel.name,
          hospitals: [{id: staffModel.hospital}],
          department: staffModel.department_id
            ? {
                id: staffModel.department_id,
                name: staffModel.department_name
              }
            : null
        };
      }
      await next();
      return;
    }
    if (token) {
      // 查询用户表
      // language=PostgreSQL
      const userModels = await appDB.execute(
        `select "user".id,
                  "user".account,
                  "user".name,
                  "user".password,
                  "user".area    "areaCode",
                  "user".region  "regionId",
                  "user".creator "creatorId",
                  "user".editor  "editorId",
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
      user.hospitals = (await getHospitals(user.areaCode)).map(it => ({
        id: it.code,
        name: it.name,
        parent: it.parent,
        // eslint-disable-next-line @typescript-eslint/camelcase
        created_at: it.created_at,
        // eslint-disable-next-line @typescript-eslint/camelcase
        updated_at: it.updated_at
      }));

      // 根据地区查询当前地区信息[少了 budget]
      // language=PostgreSQL
      user.region =
        (
          await originalDB.execute(
            `
              select code,
                     name,
                     parent,
                     case label
                       when 'province' then 1
                       when 'city' then 2
                       when 'district' then 3
                       when 'centre' then 4
                       else 5
                       end as level,
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
        user.region.label === 'hospital.station' ||
        user.region.label === 'hospital.school'
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
