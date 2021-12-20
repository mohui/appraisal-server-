import {Context} from '../context';
import {appDB, originalDB} from '../../app';
import {KatoLogicError} from 'kato-server';
import {UserType} from '../../../common/user';
import {getHospitals} from '../group/common';

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
        account: string;
        password: string;
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
                   s.password,
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
      //查询主机构名称, 用以补充用户信息
      let primaryHospitalName = null;
      if (staffModel.hospital_id) {
        primaryHospitalName =
          (
            await originalDB.execute(
              `select name from area where code = ?`,
              staffModel.hospital_id
            )
          )[0]?.name ?? null;
      }
      //补充area绑定关系
      const areaModels: {
        id: string;
        name: string;
        department: {id: string; name: string} | null;
      }[] = await Promise.all(
        (
          await appDB.execute(
            //language=PostgreSQL
            `
              select area as id, department as department_id, d.name as department_name
              from staff_area_mapping m
                     left join his_department d on m.department = d.id
              where staff = ?
            `,
            staffModel.id
          )
        ).map(async it => {
          const name = (
            await originalDB.execute(
              `select name from area where code = ?`,
              it.id
            )
          )[0]?.name;
          return {
            primary: it.id === staffModel.hospital_id,
            id: it.id,
            name: name,
            department: it.department_id
              ? {
                  id: it.department_id,
                  name: it.department_name
                }
              : null
          };
        })
      );
      ctx.user = {
        //类型
        type: UserType.STAFF,
        //id
        id: staffModel.id,
        //登录名
        account: staffModel.account,
        //密码
        password: staffModel.password,
        //姓名
        name: staffModel.name,
        //性别
        gender: staffModel.gender,
        //联系方式
        phone: staffModel.phone,
        //专业
        major: staffModel.major,
        //职称
        title: staffModel.title,
        //学历
        education: staffModel.education,
        //是否是全科医生
        isGP: staffModel.isGP,
        //绑定机构数组
        hospitals: areaModels,
        //主机构
        hospital: staffModel.hospital_id
          ? {
              id: staffModel.hospital_id,
              name: primaryHospitalName,
              department: staffModel.department_id
                ? {
                    id: staffModel.department_id,
                    name: staffModel.department_name
                  }
                : null
            }
          : null,
        //主机构科室 TODO: 兼容字段, jx-app依赖, 稍后删除
        department: staffModel.department_id
          ? {
              id: staffModel.department_id,
              name: staffModel.department_name
            }
          : null
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
      user.isRegion = !(
        user.region.label === 'hospital.center' ||
        user.region.label === 'hospital.station' ||
        user.region.label === 'hospital.school'
      );

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
