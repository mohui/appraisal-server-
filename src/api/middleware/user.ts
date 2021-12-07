import {Context} from '../context';
import {appDB, originalDB} from '../../app';
import {KatoLogicError} from 'kato-server';
import {UserType} from '../../../common/user';

export async function UserMiddleware(ctx: Context | any, next: Function) {
  //region 免登录接口逻辑
  let isWhite = false;
  for (const white of ['login.ac', 'title.ac', 'register.ac'])
    isWhite = isWhite || ctx.req.url.endsWith(white);
  if (isWhite) {
    await next();
    return;
  }
  //endregion
  try {
    const token = ctx.req.header('token');
    const type = ctx.req.header('type');
    //加入staff逻辑
    if (token && type == UserType.STAFF) {
      const staffModel: {
        hospital_id: string;
        id: string;
        name: string;
        gender: string;
        phone: string;
        major: string;
        title: string;
        education: string;
        isGP: boolean;
        department_id: string | null;
        department_name: string | null;
      } = (
        await appDB.execute(
          //language=PostgreSQL
          `
            select s.id,
                   s.account,
                   s.name,
                   s.gender,
                   s.phone,
                   s.major,
                   s.title,
                   s.education,
                   s."isGP",
                   s.hospital as hospital_id,
                   d.id       as department_id,
                   d.name     as department_name
            from staff s
                   left join his_department d on s.department = d.id
            where s.id = ?
          `,
          token
        )
      )[0];
      if (!staffModel) throw new Error('无效的token');
      //补充area绑定关系
      const areaModels: {
        id: string;
        department_id: string;
        department_name: string;
      }[] = await appDB.execute(
        //language=PostgreSQL
        `
          select area as id, department as department_id, d.name as department_name
          from staff_area_mapping m
                 left join his_department d on m.department = d.id
          where staff = ?
        `,
        staffModel.id
      );

      ctx.user = {
        type: UserType.STAFF,
        id: staffModel.id,
        name: staffModel.name,
        gender: staffModel.gender,
        phone: staffModel.phone,
        major: staffModel.major,
        title: staffModel.title,
        education: staffModel.education,
        isGP: staffModel.isGP,
        hospitals: areaModels.map(it => ({
          primary: it.id === staffModel.hospital_id,
          id: it.id,
          department: it.department_id
            ? {id: it.department_id, name: it.department_name}
            : null
        })),
        department: staffModel.department_id
          ? {
              id: staffModel.department_id,
              name: staffModel.department_name
            }
          : null,
        hospital: {id: staffModel.id}
      };
    } else if (token) {
      // 查询用户表
      // language=PostgreSQL
      const userModels = await appDB.execute(
        `
          select "user".id,
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
          where id = ?
        `,
        token
      );
      if (userModels.length === 0) throw new Error('无效的token');
      const user = userModels[0];

      // 根据用户权限id查询下属机构
      user.hospitals = await originalDB.execute(
        // language=PostgreSQL
        `
          select code id,
                 name,
                 parent,
                 created_at,
                 updated_at
          from area
          where label in ('hospital.center', 'hospital.station')
            and (code = ? or path like ?)
        `,
        user.areaCode,
        `%${user.areaCode}%`
      );

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
      //补充用户类型字段
      ctx.user = {
        type: UserType.ADMIN,
        ...user
      };
    } else {
      throw new Error('无效的token');
    }
  } catch (e) {
    throw new KatoLogicError('用户登录状态有误, 请重新登录', 10000);
  }
  await next();
}
