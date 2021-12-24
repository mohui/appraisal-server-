import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {appDB, originalDB} from '../app';
import {
  RoleModel,
  UserHospitalModel,
  UserModel,
  UserRoleModel,
  sql as sqlRender
} from '../database';
import {QueryTypes} from 'sequelize';
import {getPermission, Permission} from '../../common/permission';
import {Context} from './context';
import {imageSync} from 'qr-image';
import {UserType} from '../../common/user';
import {v4 as uuid} from 'uuid';

function countUserRender(params) {
  return sqlRender(
    `
    SELECT count(DISTINCT ("User"."id")) AS "count"
        FROM "user" AS "User"
         LEFT OUTER JOIN ( "user_role_mapping" AS "roles->UserRole" INNER JOIN "role" AS "roles" ON "roles"."id" = "roles->UserRole"."role_id")
                         ON "User"."id" = "roles->UserRole"."user_id"
         LEFT OUTER JOIN "user" AS "editor" ON "User"."editor" = "editor"."id"
         INNER JOIN "area" AS "area" ON "User"."area" = "area"."code"
         WHERE true
        {{#if regions}}
            AND "User"."area" IN
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
       "creator"."name"                        AS "creatorName"
    FROM (
        SELECT "User"."id",
             "User"."account",
             "User"."name",
             "User"."password",
             "User"."area",
             "User"."region"       AS "regionId",
             "User"."creator"      AS "creatorId",
             "User"."editor"       AS "editorId",
             "User"."created_at",
             "User"."updated_at",
              json_build_object(
               'code', _area.code,
               'name', _area.name
           ) AS "region"
        FROM "user" AS "User"
               INNER JOIN "area" AS _area ON "User"."area" = _area."code"
        WHERE true
        {{#if regions}}
            AND "User"."area" IN
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
      ORDER BY "User"."created_at" DESC
     `,
    params
  );
}

export default class User {
  /**
   * 登录接口
   * @param account 用户名
   * @param password 密码
   */
  @validate(should.string().required(), should.string().required())
  async login(account, password) {
    //region 验证账号是否重复, 用户名密码是否正确
    const models = await appDB.execute(
      //language=PostgreSQL
      `
        select 1
        from "user"
        where account = ?
          and password = ?
        union
        select 1
        from staff
        where account = ?
          and password = ?
      `,
      account,
      password,
      account,
      password
    );
    if (models.length > 1)
      throw new KatoRuntimeError('用户信息有误, 请联系管理员');
    if (models.length === 0) throw new KatoCommonError('用户名密码错误');
    //endregion
    //region 查询员工表
    const staffModel = (
      await appDB.execute(
        //language=PostgreSQL
        `
          select s.id, s.name, s.hospital, d.id as department_id, d.name as department_name
          from staff s
                 left join his_department d on s.department = d.id
          where s.account = ?
            and s.password = ?
        `,
        account,
        password
      )
    )[0];
    if (staffModel)
      return {
        type: UserType.STAFF,
        token: staffModel.id,
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
    //endregion
    //region 查询管理员表
    //查询账号密码是否正确
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
                    "user".updated_at,
                    role.id "roleId",
                    role.name "roleName",
                    role.creator "roleCreator",
                    role.permissions
             from "user"
             left join user_role_mapping mapping on "user".id = mapping.user_id
             inner join role on mapping.role_id = role.id
             where account = ? and password = ?`,
      account,
      password
    );
    if (userModels.length > 0) {
      const user = {
        type: UserType.ADMIN,
        token: userModels[0]?.id,
        id: userModels[0]?.id,
        account: userModels[0]?.account,
        name: userModels[0]?.name,
        password: userModels[0]?.password,
        areaCode: userModels[0]?.areaCode,
        regionId: userModels[0]?.regionId,
        creatorId: userModels[0]?.creatorId,
        editorId: userModels[0]?.editorId,
        // eslint-disable-next-line @typescript-eslint/camelcase
        created_at: userModels[0]?.created_at,
        roles: [],
        region: null
      };
      userModels.forEach(it => {
        const index = user.roles.find(item => item.id === it.roleId);
        if (!index) {
          user.roles.push({
            id: it.roleId,
            name: it.roleName,
            creator: it.roleCreator,
            permissions: it.permissions
          });
        }
      });

      user.region =
        (
          await originalDB.execute(
            `select code, name, parent, label, path from area where code = ?`,
            user.areaCode
          )
        )[0] ?? null;
      return user;
    }
    //endregion
    throw new KatoRuntimeError('用户数据异常, 请联系管理员');
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
    const {pageNo = 1, pageSize = 20, account = '', name = '', roleId = ''} =
      params || {};
    const sqlParams = {pageSize, pageNo: (pageNo - 1) * pageSize};

    //如果不是超级管理权限,则要进行用户权限判断,只允许查询当前权限以下(不包括自己)的用户
    if (!Context.current.user.permissions.includes(Permission.SUPER_ADMIN)) {
      // 递归查询用户所属地区的所有下属地区,添加权限方面的查询条件
      sqlParams['regions'] = (
        await originalDB.query(
          `
            with recursive r as (
                select * from area
                where code='${Context.current.user.areaCode}'
                union all
                select area.*
                from area,
                    r
                where r.code = area.parent
            )
            select code
            from r where code!='${Context.current.user.areaCode}';
          `,
          {
            replacements: params,
            type: QueryTypes.SELECT
          }
        )
      ).map(it => it.code);
    }
    //构成条件
    if (account) sqlParams['account'] = `%${account}%`;
    if (name) sqlParams['name'] = `%${name}%`;
    //如果传递roleId则从用户角色关系表中查询该角色的用户id
    if (roleId)
      sqlParams['roleUsers'] = (
        await appDB.execute(
          // language=PostgreSQL
          `
            select user_id, role_id
            from user_role_mapping
            where role_id = ?
          `,
          roleId
        )
      ).map(r => r.user_id);

    //生成SQL语句和参数数组
    const sqlObject = userListRender(sqlParams);

    const rows = (await appDB.execute(sqlObject[0], ...sqlObject[1])).reduce(
      //1个用户多个角色的情况,将角色信息折叠进该用户信息内
      (pre, next) => {
        const current = pre.find(p => p.id === next.id);
        //查找出有过这个用户,并发现有另一个角色信息,push进该用户的roles数组内
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
            // eslint-disable-next-line @typescript-eslint/camelcase
            created_at: next.created_at,
            // eslint-disable-next-line @typescript-eslint/camelcase
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
            areaCode: next.area || ''
          });
        return pre;
      },
      []
    );
    const countObject = countUserRender(sqlParams);
    const count = await appDB.execute(countObject[0], ...countObject[1]);
    return {count: Number(count[0].count), rows};
  }

  /**
   * 添加用户
   *
   * @param user {
   *   account: 账户名,
   *   name: 用户名,
   *   password: 密码,
   *   roles: 角色数组[],
   *   areaCode: 地区code,
   * }
   */
  @validate(
    should.object({
      account: should.string().required(),
      name: should.string().required(),
      password: should.string().required(),
      roles: should
        .array()
        .items(should.string())
        .required()
        .allow([]),
      areaCode: should.string().required()
    })
  )
  async addUser(user) {
    return appDB.transaction(async () => {
      //查询该账户是否存在
      const userModels = await appDB.execute(
        // language=PostgreSQL
        `
          select id, account, name
          from "user"
          where account = ?
        `,
        user.account
      );
      if (userModels.length > 0) throw new KatoCommonError('该账户已存在');
      // 操作者id
      const currentId = Context.current.user.id;
      // 用户id
      const userId = uuid();
      const newUser = await appDB.execute(
        // language=PostgreSQL
        `
          insert into "user"(id,
                             account,
                             name,
                             password,
                             created_at,
                             updated_at,
                             creator,
                             editor,
                             area)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        userId,
        user.account,
        user.name,
        user.password,
        new Date(),
        new Date(),
        currentId,
        currentId,
        user.areaCode
      );
      // 绑定角色关系
      for (const it of user.roles) {
        await appDB.execute(
          // language=PostgreSQL
          `
            insert into user_role_mapping(user_id, role_id, created_at, updated_at)
            values (?, ?, ?, ?)
          `,
          userId,
          it,
          new Date(),
          new Date()
        );
      }
      return newUser;
    });
  }

  /**
   * 修改用户
   *
   * @param user {
   *   id: 用户id
   *   roles: 角色数组,
   *   areaCode: 地区code
   * }
   */
  @validate(
    should.object({
      id: should.string().required(),
      name: should.string(),
      roles: should
        .array()
        .items(should.string())
        .allow([]),
      areaCode: should.string().required()
    })
  )
  update(user) {
    return appDB.joinTx(async () => {
      // 查询用户是否存在
      const userModel = await appDB.execute(
        // language=PostgreSQL
        `
          select id, account, name
          from "user"
          where id = ?
        `,
        user.id
      );
      if (userModel.length === 0) throw new KatoCommonError('该用户不存在');
      // 先删除,再添加
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from user_role_mapping
          where user_id = ?
        `,
        user.id
      );
      // 添加新的角色关系
      for (const it of user.roles) {
        await appDB.execute(
          // language=PostgreSQL
          `
            insert into user_role_mapping(user_id, role_id, updated_at, created_at)
            VALUES (?, ?, ?, ?)
          `,
          user.id,
          it,
          new Date(),
          new Date()
        );
      }
      // 修改用户
      await appDB.execute(
        // language=PostgreSQL
        `
          update "user"
          set name       = ?,
              area       = ?,
              updated_at = ?,
              editor     = ?
          where id = ?
        `,
        user.name,
        user.areaCode,
        new Date(),
        Context.current.user.id,
        user.id
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

  /**
   * 新增权限
   *
   * @param name 权限名
   * @param permissions 权限数组
   */
  @validate(
    should.string().required(),
    should
      .array()
      .items(should.string())
      .allow([])
      .required()
  )
  async addRole(name, permissions) {
    //检查权限是否在描述文件里有配置
    const res = permissions.find(it => !getPermission(it));
    if (res) throw new KatoCommonError(`'${res}'权限不存在`);
    //查询是否存在该角色
    const role = await appDB.execute(
      //language=PostgreSQL
      `
        select id, name
        from role
        where name = ?
      `,
      name
    );
    if (role.length > 0) throw new KatoCommonError('该角色已存在');
    return await appDB.execute(
      //language=PostgreSQL
      `
        insert into role(id, name, permissions, created_at, updated_at, creator)
        values (?, ?, ?, ?, ?, ?)
      `,
      uuid(),
      name,
      `{${permissions?.map(item => `"${item}"`).join()}}`,
      new Date(),
      new Date(),
      Context.current.user.id
    );
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
    // 判断是否是超过超级管理员账户, 如果不是, 按照条件查询,如果是,查询所有
    let IsSuperAdmin = true;
    if (Context.current.user.permissions.includes(Permission.SUPER_ADMIN)) {
      // 如果是, 不设置条件
      IsSuperAdmin = false;
    }
    const [sql, paramList] = sqlRender(
      `
        select count(1) count from role
         where 1 = 1
        {{#if IsSuperAdmin}}
          and role.permissions:: text[] <@ array[{{#each allRoles}}{{? this}}{{#sep}},{{/sep}}{{/each}}]
        {{/if}} offset {{? pageNo}} limit  {{? pageSize}}
      `,
      {
        allRoles: Context.current.user.permissions,
        IsSuperAdmin
      }
    );
    const count = await appDB.execute(sql, ...paramList);
    // 如果不是超越超级管理员账户
    const [ruleSql, ruleParams] = sqlRender(
      `
      select
        role.id,
        role.name,
        role.permissions,
        role.deleted_at,
        role.creator,
        role.created_at,
        role.updated_at,
        u.id "userId",
        u.account,
        u.name "userName"
      from (
        select * from role
         where 1 = 1
        {{#if IsSuperAdmin}}
          and role.permissions:: text[] <@ array[{{#each allRoles}}{{? this}}{{#sep}},{{/sep}}{{/each}}]
        {{/if}}
        order by name
        offset {{? pageNo}} limit  {{? pageSize}}
      ) role
      left join user_role_mapping mapping on role.id = mapping.role_id
      left join "user" u on u.id = mapping.user_id
      `,
      {
        allRoles: Context.current.user.permissions,
        IsSuperAdmin,
        pageNo: pageNo === 1 ? 0 : (pageNo - 1) * pageSize,
        pageSize
      }
    );
    // 查询所有权限
    const roles = await appDB.execute(ruleSql, ...ruleParams);
    const list = [];
    roles.forEach(it => {
      const index = list.find(item => item.id === it.id);
      if (index) {
        if (it.userId) {
          index.users.push({
            id: it.userId,
            account: it.account,
            name: it.userName
          });
        }
      } else {
        list.push({
          id: it.id,
          name: it.name,
          creator: it.creator,
          // eslint-disable-next-line @typescript-eslint/camelcase
          created_at: it.created_at,
          // eslint-disable-next-line @typescript-eslint/camelcase
          updated_at: it.updated_at,
          permissions: it.permissions
            .map(key => getPermission(key))
            .filter(it => it),
          users: it.userId
            ? [
                {
                  id: it.userId,
                  account: it.account,
                  name: it.userName
                }
              ]
            : []
        });
      }
    });
    return {rows: list, count: Number(count[0]?.count ?? 0)};
  }

  @validate(should.string().required(), should.string().required())
  async updatePassword(userId, password) {
    return appDB.transaction(async () => {
      const userModels = await appDB.execute(
        // language=PostgreSQL
        `
          select id, account, name
          from "user"
          where id = ?
        `,
        userId
      );
      if (userModels.length === 0) throw new KatoCommonError('该用户不存在');
      return await appDB.execute(
        // language=PostgreSQL
        `
          update "user"
          set password   = ?,
              updated_at = ?,
              editor     = ?
          where id = ?
        `,
        password,
        new Date(),
        Context.current.user.id,
        userId
      );
    });
  }

  /**
   * 删除用户
   *
   * @param id 用户id
   */
  @validate(should.string().required())
  async remove(id) {
    return appDB.joinTx(async () => {
      const userModels = await appDB.execute(
        // language=PostgreSQL
        `
          select id, account, name
          from "user"
          where id = ?
        `,
        id
      );
      if (userModels.length === 0) throw new KatoCommonError('该用户不存在');
      // 删除用户和角色的关联
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from user_role_mapping
          where user_id = ?
        `,
        id
      );
      // 删除用户
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from "user"
          where id = ?
        `,
        id
      );
    });
  }

  /**
   * 删除角色
   *
   * @param id 角色id
   */
  @validate(should.string().required())
  async removeRole(id) {
    return appDB.transaction(async () => {
      // 查询该角色是否绑定了用户
      const roleModels = await appDB.execute(
        // language=PostgreSQL
        `
          select "user".id
          from role
                 inner join user_role_mapping roleMapping
                            on role.id = roleMapping.role_id
                 inner join "user" on roleMapping.user_id = "user".id
          where role.id = ?
        `,
        id
      );
      if (roleModels.length > 0 && roleModels[0]?.id)
        throw new KatoCommonError('该角色下绑定了用户,无法删除');
      // 删除角色
      return await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from role
          where id = ?
        `,
        id
      );
    });
  }

  async profile() {
    return Context.current.user;
  }

  /**
   * 个人中心,基本设置,修改真实姓名
   *
   * @param params {
   *   name: 个人名次
   * }
   */
  @validate(
    should.object({
      name: should.string().required()
    })
  )
  async updateProfile(params) {
    return appDB.transaction(async () => {
      const user = Context.current.user;
      if (!user) throw new KatoCommonError('该用户不存在');
      user.name = params.name;
      return await appDB.execute(
        // language=PostgreSQL
        `
          update "user"
          set name = ?
          where id = ?
        `,
        user.name,
        user.id
      );
    });
  }

  @validate(should.string().description('用户id'))
  async resetPassword(id) {
    return appDB.transaction(async () => {
      const userModels = await appDB.execute(
        // language=PostgreSQL
        `
          select id, account, name
          from "user"
          where id = ?
        `,
        id
      );
      if (userModels.length === 0) throw new KatoCommonError('该用户不存在');
      return await appDB.execute(
        // language=PostgreSQL
        `
          update "user"
          set password   = ?,
              updated_at = ?,
              editor     = ?
          where id = ?
        `,
        '666666',
        new Date(),
        Context.current.user.id,
        id
      );
    });
  }

  // 获取二维码
  async getQRCode(id) {
    let token = Context.req.headers.token;
    if (id) {
      token = (await appDB.execute(`select id from staff where id = ?`, id))[0]
        ?.id;
      if (!token) throw new KatoRuntimeError(`员工不存在`);
    }
    // 生成微信二维码
    const imageBuffer = imageSync(
      JSON.stringify({
        code: token,
        type: id ? UserType.STAFF : null
      }),
      {type: 'png'}
    );
    return {
      image: `data:image/png;base64,${imageBuffer.toString('base64')}`
    };
  }
}
