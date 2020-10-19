import {KatoCommonError, KatoLogicError, should, validate} from 'kato-server';
import {appDB} from '../app';
import {
  HospitalModel,
  RegionModel,
  RoleModel,
  UserHospitalModel,
  UserModel,
  UserRoleModel,
  sql as sqlRender
} from '../database';
import {Op, QueryTypes} from 'sequelize';
import {getPermission, Permission} from '../../common/permission';
import {Context} from './context';

function countUserRender(params) {
  return sqlRender(
    `
    SELECT count(DISTINCT ("User"."id")) AS "count"
        FROM "user" AS "User"
         LEFT OUTER JOIN ( "user_role_mapping" AS "roles->UserRole" INNER JOIN "role" AS "roles" ON "roles"."id" = "roles->UserRole"."role_id")
                         ON "User"."id" = "roles->UserRole"."user_id"
         LEFT OUTER JOIN "user" AS "editor" ON "User"."editor" = "editor"."id"
         INNER JOIN "region" AS "region" ON "User"."region" = "region"."code"
         LEFT OUTER JOIN ( "user_hospital_mapping" AS "hospitals->UserHospital" INNER JOIN "hospital" AS "hospitals" ON "hospitals"."id" = "hospitals->UserHospital"."hospital_id")
                         ON "User"."id" = "hospitals->UserHospital"."user_id"
         WHERE true
        {{#if regions}}
            AND "User"."region" IN
            ({{#each regions}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        {{/if}}
        {{#if account}}
            AND "User"."account" LIKE {{? account}}
        {{/if}}
        {{#if name}}
            AND "User"."name" LIKE {{? name}}
        {{/if}}
        {{#if roleUsers}}
        --某个角色的所有用户id
            AND "User"."id" IN ({{#each roleUsers}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        {{/if}}
     `,
    params
  );
}

function userListRender(params) {
  return sqlRender(
    `
    SELECT "User".*,
       "roles"."id"                            AS "rolesId",
       "roles"."name"                          AS "rolesName",
       "roles"."creator"                       AS "rolesCreator",
       "roles"."permissions"                   AS "rolesPermissions",
       "editor"."name"                         AS "editorName",
       "creator"."name"                        AS "creatorName",
       "hospitals"."id"                        AS "hospitalId",
       "hospitals"."name"                      AS "hospitalName",
       "hospitals"."parent"                    AS "hospitalParent",
       "hospitals"."region"                    AS "hospitalRegionId",
       "uhm"."user_id"     AS "hospitals.UserHospital.userId",
       "uhm"."hospital_id" AS "hospitals.UserHospital.hospitalId"
    FROM (
        SELECT "User"."id",
             "User"."account",
             "User"."name",
             "User"."password",
             "User"."region"       AS "regionId",
             "User"."creator"      AS "creatorId",
             "User"."editor"       AS "editorId",
             "User"."created_at",
             "User"."updated_at",
              json_build_object(
               'code', _region.code,
               'name', _region.name,
               'level', _region.level,
               'parent', _region.parent,
               'budget', _region.budget,
               'created_at', _region.created_at,
               'updated_at', _region.updated_at
           ) AS "region"
        FROM "user" AS "User"
               INNER JOIN "region" AS "_region" ON "User"."region" = "_region"."code"
        WHERE true
        {{#if regions}}
            AND "User"."region" IN
            ({{#each regions}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        {{/if}}
        {{#if account}}
            AND "User"."account" LIKE {{? account}}
        {{/if}}
        {{#if name}}
            AND "User"."name" LIKE {{? name}}
        {{/if}}
        {{#if roleUsers}}
        --某个角色的所有用户id
            AND "User"."id" IN ({{#each roleUsers}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        {{/if}}
      ORDER BY "User"."created_at" DESC
      LIMIT {{? pageSize}} OFFSET {{? pageNo}}) AS "User"
         LEFT OUTER JOIN ( "user_role_mapping" AS "ru" INNER JOIN "role" AS "roles" ON "roles"."id" = "ru"."role_id")
                         ON "User"."id" = "ru"."user_id"
         LEFT OUTER JOIN "user" AS "editor" ON "User"."editorId" = "editor"."id"
         LEFT OUTER JOIN "user" AS "creator" ON "User"."creatorId" = "creator"."id"
         LEFT OUTER JOIN ("user_hospital_mapping" AS "uhm" INNER JOIN "hospital" AS "hospitals" ON "hospitals"."id" = "uhm"."hospital_id")
                         ON "User"."id" = "uhm"."user_id"
      ORDER BY "User"."created_at" DESC
     `,
    params
  );
}

export default class User {
  @validate(
    should
      .string()
      .required()
      .description('用户名'),
    should
      .string()
      .required()
      .description('密码')
  )
  async login(account, password) {
    let user = await UserModel.findOne({
      where: {account, password},
      include: [RoleModel, RegionModel]
    });
    //是否查询出结果
    if (!user) throw new KatoLogicError('账户密码有误', 1002);
    return user;
  }

  @validate(
    should
      .object({
        account: should.string().allow('', null),
        name: should.string().allow('', null),
        roleId: should.string().allow('', null),
        pageSize: should.number(),
        pageNo: should.number()
      })
      .allow(null)
  )
  async list(params) {
    const {pageNo = 0, pageSize = 20, account = '', name = '', roleId = ''} =
      params || {};
    let whereOption = {};

    let sqlParams = {pageSize, pageNo};

    //如果不是超级管理权限,则要进行用户权限判断,只允许查询当前权限以下(不包括自己)的用户
    if (!Context.current.user.permissions.includes(Permission.SUPER_ADMIN)) {
      //递归查询用户所属地区的所有下属地区
      const childrenCode = (
        await appDB.query(
          `
            with recursive r as (
                select * from region
                where code='${Context.current.user.regionId}'
                union all
                select region.*
                from region,
                    r
                where r.code = region.parent
            )
            select code
            from r where code!='${Context.current.user.regionId}';
          `,
          {
            replacements: params,
            type: QueryTypes.SELECT
          }
        )
      ).map(it => it.code);
      //添加权限方面的查询条件
      whereOption['region'] = {[Op.in]: childrenCode};
      //sql
      sqlParams['regions'] = childrenCode;
    }
    if (account) sqlParams['account'] = `%${account}%`;
    // whereOption['account'] = {[Op.like]: `%${account}%`};
    if (name) sqlParams['name'] = `%${name}%`;
    // whereOption['name'] = {[Op.like]: `%${name}%`};

    //如果传递roleId则从用户角色关系表中查询该角色的用户id
    if (roleId)
      sqlParams['roleUsers'] = await UserRoleModel.findAll({
        where: {roleId}
      }).map(r => r.userId);
    //构成条件
    // whereOption['id'] = {
    //   [Op.in]: await UserRoleModel.findAll({where: {roleId}}).map(
    //     r => r.userId
    //   )
    // };

    const sqlObject = userListRender(sqlParams);

    const rows = (
      await appDB.query(sqlObject[0], {
        replacements: sqlObject[1],
        type: QueryTypes.SELECT
      })
    )
      .map(it => {
        return {...it, hospital: it['hospitalId']};
      })
      .reduce((pre, next) => {
        let current = pre.find(p => p.id === next.id);
        if (current) {
          current.roles.push({
            id: next.rolesId,
            name: next.rolesName,
            creator: next.rolesCreator,
            permissions: next.rolesPermissions
          });
        } else
          pre.push({
            id: next.id,
            account: next.account,
            name: next.name,
            password: next.password,
            regionId: next.regionId,
            created_at: next.created_at,
            updated_at: next.updated_at,
            roles: [
              {
                id: next.rolesId,
                name: next.rolesName,
                creator: next.rolesCreator,
                permissions: next.rolesPermissions
              }
            ],
            region: next.region,
            editorName: next.editorName,
            creatorName: next.creatorName,
            hospital: {
              id: next.hospitalId,
              name: next.hospitalName,
              parent: next.hospitalParent,
              region: next.hospitalRegionId
            }
          });
        console.log(pre);
        return pre;
      }, []);
    const countObject = countUserRender(sqlParams);
    const count = await appDB.query(countObject[0], {
      replacements: countObject[1],
      type: QueryTypes.SELECT
    });
    return {total: count[0].count, rows};
  }

  @validate(
    should.object({
      account: should
        .string()
        .required()
        .description('账户名'),
      name: should
        .string()
        .required()
        .description('用户名'),
      password: should
        .string()
        .required()
        .description('密码'),
      roles: should
        .array()
        .items(should.string())
        .required()
        .allow([])
        .description('角色数组'),
      regionId: should
        .string()
        .required()
        .description('地区code')
    })
  )
  async addUser(user) {
    return appDB.transaction(async () => {
      //查询该账户是否存在
      const result = await UserModel.findOne({where: {account: user.account}});
      if (result) throw new KatoCommonError('该账户已存在');
      //操作者id
      const currentId = Context.current.user.id;
      const newUser = await UserModel.create({
        ...user,
        creatorId: currentId,
        editorId: currentId
      });
      //绑定角色关系
      const roleUser = user.roles.map(roleId => ({
        userId: newUser.id,
        roleId: roleId
      }));
      //批量设置用户角色关系
      await UserRoleModel.bulkCreate(roleUser);
      return newUser;
    });
  }

  @validate(
    should.object({
      id: should
        .string()
        .required()
        .description('用户id'),
      name: should.string(),
      roles: should
        .array()
        .items(should.string())
        .allow([])
        .description('角色数组'),
      regionId: should
        .string()
        .required()
        .description('地区code')
    })
  )
  update(user) {
    return appDB.transaction(async () => {
      //查询用户,并锁定
      let result = await UserModel.findOne({where: {id: user.id}, lock: true});
      if (!result) throw new KatoCommonError('该用户不存在');
      //查询该用户所有的角色
      const roleList = await UserRoleModel.findAll({
        where: {userId: user.id},
        lock: true
      });
      //删除解除的角色关系
      await Promise.all(
        roleList
          .filter(it => !user.roles.includes(it.roleId)) //筛选出需要解除的role
          .map(async item => await item.destroy({force: true}))
      );
      //添加新的角色关系
      await UserRoleModel.bulkCreate(
        user.roles
          .filter(id => !roleList.find(role => role.roleId === id)) //筛选出需要新增的role
          .map(roleId => ({userId: user.id, roleId: roleId}))
      );
      //修改操作
      await UserModel.update(
        {...user, editorId: Context.current.user.id},
        {where: {id: user.id}}
      );
    });
  }

  @validate(
    should.object({
      id: should
        .string()
        .required()
        .description('角色id'),
      name: should.string().description('角色名'),
      permissions: should
        .array()
        .items(should.string())
        .allow([])
        .description('权限数组')
    })
  )
  async updateRole(role) {
    return appDB.transaction(async () => {
      //检查权限是否在描述文件里有配置
      const res = role.permissions.find(it => !getPermission(it));
      if (res) throw new KatoCommonError(`'${res}'权限不存在`);
      //查询是否有该角色,并锁定
      const result = await RoleModel.findOne({
        where: {id: role.id},
        lock: true
      });
      if (!result) throw new KatoCommonError('该角色不存在');
      //进行角色更新操作
      return RoleModel.update(role, {where: {id: role.id}});
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('权限名'),
    should
      .array()
      .items(should.string())
      .allow([])
      .required()
      .description('权限数组')
  )
  async addRole(name, permissions) {
    //检查权限是否在描述文件里有配置
    const res = permissions.find(it => !getPermission(it));
    if (res) throw new KatoCommonError(`'${res}'权限不存在`);
    //查询是否存在该角色
    const role = await RoleModel.findOne({where: {name}});
    if (role) throw new KatoCommonError('该角色已存在');
    //角色新增操作
    return RoleModel.create({
      name,
      permissions,
      creator: Context.current.user.id
    });
  }

  @validate(
    should
      .object({
        pageSize: should.number(),
        pageNo: should.number()
      })
      .allow(null)
  )
  async listRole(params) {
    const {pageNo = 1, pageSize = 20} = params || {};
    let result = await RoleModel.findAndCountAll({
      offset: (pageNo - 1) * pageSize,
      limit: pageSize,
      distinct: true,
      include: [
        {
          model: UserModel,
          attributes: {exclude: ['password']},
          through: {attributes: []}
        }
      ]
    });
    result.rows = result.rows
      .map(it => ({
        ...it.toJSON(),
        permissions: it.permissions.map(key => getPermission(key))
      }))
      .filter(
        //过滤掉当前用户没有权限的角色
        it =>
          Context.current.user.permissions.includes(Permission.SUPER_ADMIN) ||
          !it.permissions.some(
            p => !Context.current.user.permissions.includes(p.key)
          )
      );
    return {rows: result.rows, count: result.rows.length};
  }

  @validate(should.string().required(), should.string().required())
  async updatePassword(userId, password) {
    return appDB.transaction(async () => {
      const user = await UserModel.findOne({where: {id: userId}});
      if (!user) throw new KatoCommonError('该用户不存在');
      return UserModel.update({password}, {where: {id: userId}});
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('用户id')
  )
  async remove(id) {
    return appDB.transaction(async () => {
      //查询用户是否存在,并锁定
      const result = await UserModel.findOne({
        where: {id: id},
        lock: {of: UserModel},
        include: [{model: RoleModel}]
      });
      if (!result) throw new KatoCommonError('该用户不存在');
      //删除机构关系
      await UserHospitalModel.destroy({where: {userId: id}});
      //删除角色关系
      await Promise.all(
        result.roles.map(
          async role => await role.UserRole.destroy({force: true})
        )
      );
      //删除该用户
      await result.destroy({force: true});
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('角色id')
  )
  async removeRole(id) {
    return appDB.transaction(async () => {
      //查询该角色,并锁定
      const result = await RoleModel.findOne({
        where: {id},
        include: [UserModel],
        lock: {of: RoleModel}
      });
      if (result.users.length > 0)
        throw new KatoCommonError('该角色下绑定了用户,无法删除');
      result.destroy({force: true});
    });
  }

  //用户关联机构
  @validate(
    should.object({
      id: should
        .string()
        .required()
        .description('用户id'),
      hospitals: should
        .array()
        .items(should.string())
        .allow([])
        .description('机构id数组')
    })
  )
  async setHospitals(params) {
    //查询用户是否存在
    const result = await UserModel.findOne({
      where: {id: params.id},
      paranoid: false,
      attributes: {exclude: ['deleted_at']}
    });
    if (!result) throw new KatoCommonError('该用户不存在');
    //查询该用户原有的机构关系
    const originHospital = await UserHospitalModel.findAll({
      where: {userId: params.id},
      paranoid: false,
      attributes: {exclude: ['deleted_at']}
    });
    //关联新添加的机构关系
    await UserHospitalModel.bulkCreate(
      params.hospitals
        .filter(id => !originHospital.find(it => it.hospitalId === id))
        .map(hId => ({
          userId: params.id,
          hospitalId: hId
        }))
    );
    //删除解绑的机构
    await Promise.all(
      originHospital
        .filter(h => !params.hospitals.includes(h.hospitalId))
        .map(async hospital => hospital.destroy({force: true}))
    );
  }

  //查询该用户的机构关系
  @validate(should.string().required())
  async listHospital(id) {
    //查询用户是否存在
    const result = await UserModel.findOne({
      where: {id},
      paranoid: false,
      attributes: {exclude: ['deleted_at']},
      include: {
        model: HospitalModel,
        paranoid: false,
        attributes: {exclude: ['deleted_at']}
      }
    });
    if (!result) throw new KatoCommonError('该用户不存在');
    return result;
  }

  async profile() {
    return Context.current.user;
  }

  @validate(
    should.object({
      name: should
        .string()
        .required()
        .description('个人名称')
    })
  )
  async updateProfile(params) {
    return appDB.transaction(async () => {
      let user = Context.current.user;
      if (!user) throw new KatoCommonError('该用户不存在');
      user.name = params.name;
      return UserModel.update(user, {where: {id: user.id}});
    });
  }

  @validate(
    should.object({
      id: should
        .string()
        .required()
        .description('用户id'),
      region: should
        .string()
        .required()
        .description('地区code'),
      hospitalId: should
        .string()
        .allow('', null)
        .description('机构id')
    })
  )
  async setPermission(params) {
    return appDB.transaction(async () => {
      let {id, region, hospitalId} = params;
      //查询用户是否存在
      const user = await UserModel.findOne({
        where: {id}
      });
      if (!user) throw new KatoCommonError('该用户不存在');
      //清空其机构绑定
      await UserHospitalModel.destroy({where: {userId: id}});
      if (hospitalId) {
        //查询机构是否存在
        const hospital = await HospitalModel.findOne({
          where: {id: hospitalId}
        });
        if (!hospital) throw new KatoCommonError('该机构不存在');
        //绑定新的机构
        await UserHospitalModel.create({userId: id, hospitalId: hospitalId});
        //修改地区绑定
        region = hospital.regionId;
      }
      user.regionId = region;
      return await user.save();
    });
  }

  @validate(should.string().description('用户id'))
  async resetPassword(id) {
    return appDB.transaction(async () => {
      const user = await UserModel.findOne({where: {id}, lock: true});
      if (!user) throw new KatoCommonError('该用户不存在');
      user.password = '666666';
      await user.save();
    });
  }
}
