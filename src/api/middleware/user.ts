import {Context} from '../context';
import {appDB, mappingDB, originalDB} from '../../app';
import {KatoLogicError} from 'kato-server';
import {UserType} from '../../../common/user';
import {getHospitals} from '../group/common';

export async function UserMiddleware(ctx: Context | any, next: Function) {
  //免登录接口判断
  if (
    [
      'login.ac',
      'title.ac',
      'register.ac',
      'AppUser/validPhone.ac', //app用户手机号码验证
      'AppUser/sendSMS.ac', //app短信验证码发送
      'AppUser/register.ac', //app用户注册
      'AppUser/resetPassword.ac', //app用户重置密码
      'AppUser/wxLogin.ac' //微信小程序登录
    ].some(it => ctx.req.url.endsWith(it))
  ) {
    await next();
    return;
  }
  try {
    const token = ctx.req.header('token');
    //region 通过token获取用户类型
    const models = await appDB.execute(
      //language=PostgreSQL
      `
        select '${UserType.ADMIN}' as type
        from "user"
        where id = ?
        union
        select '${UserType.STAFF}' as type
        from staff
        where id = ?
      `,
      token,
      token
    );
    if (models.length != 1) throw new Error('无效的token');
    //用户类型
    const type = models[0].type;
    //endregion
    //根据用户类型填充用户数据
    if (type == UserType.STAFF) {
      //region 员工用户
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
      if (!staffModel) throw new Error('无效的员工用户');
      // region 查询机构绑定关系
      const areaModels: {
        primary: boolean;
        his: boolean;
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
          // 查询name
          const name = (
            await originalDB.execute(
              `select name from area where code = ?`,
              it.id
            )
          )[0]?.name;
          // 查询是否接入医疗绩效
          const his =
            (
              await mappingDB.execute(
                `select 1 from area_hospital_mapping where area = ? and etl_id like '%HIS%'`,
                it.id
              )
            ).length > 0;
          return {
            his,
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
      // endregion
      // 寻找主机构
      const primaryHospital = areaModels.find(it => it.primary);
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
        hospital: primaryHospital,
        //主机构科室 TODO: 兼容字段, jx-app依赖, 稍后删除
        department: primaryHospital?.department
      };
      //endregion
    } else if (type == UserType.ADMIN) {
      //region 管理员用户
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
      if (userModels.length === 0) throw new Error('无效的管理员用户');
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
      //endregion
    } else {
      throw new Error('无效的用户类型');
    }
  } catch (e) {
    throw new KatoLogicError('用户登录状态有误, 请重新登录', 10000);
  }
  await next();
}
