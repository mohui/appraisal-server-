import crypts from 'crypts';
import {KatoCommonError, KatoLogicError, should, validate} from 'kato-server';
import * as dayjs from 'dayjs';
import {dataDB, knrtDB, appDB} from '../app';
import {RoleModel, UserModel, UserRoleModel} from '../database/model';
import {Op} from 'sequelize';
import {Permission} from '../../common/permission';

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
  async login(username, password) {
    let users = await knrtDB.execute(
      `
      select user.id           userId,
             user.username,
             user.realname     reallName,
             user.telephone,
             user.remark,
             user.token,
             user.ipaddress,
             user.iparea,
             user.devicecode,
             user.status,
             user.duty,
             user.institutions userAuthorization,
             user.headPic,
             user.usertype,
             access.level,
             access.code,
             access.sys_code   sysCode
      from leader_user user
             left join leader_access access on user.id = access.u_id
      where (username = ? or telephone = ?)
        and passwd = ?`,
      username,
      username,
      crypts.md5(password.toString())
    );
    //是否查询出结果
    if (users.length === 0) throw new KatoLogicError('用户名或密码错误', 1002);

    if (users.length > 1) throw new KatoLogicError('账号信息有误', 1002);

    const user = users[0];
    if (user['status'] === 2) throw new KatoLogicError('该账号已删除', 1002);

    if (user['status'] !== 1)
      throw new KatoLogicError('用户处于停用状态', 1002);

    if (!user['sysCode']) throw new KatoLogicError('权限为空', 1002);

    let date = dayjs().format('YYYY-MM-DD HH:mm:ss');

    // 修改最后登录时间
    // await knrtDB.execute(`update leader_user set lastlogintime = ? where id = ?`, date, userInfo[0]['userId']);
    // 添加日志
    await knrtDB.execute(
      `
      insert into Leader_log(username, token, machinecode, machinename, event, ipaddress, iparea, logintime)
      values (?, ?, '', '', '后台登录', ?, ?, ?)`,
      user['username'],
      user['token'],
      user['ipaddress'],
      user['iparea'],
      date
    );

    let areaInfo = await dataDB.execute(
      `
      select province_code,
             province_name,
             city_code,
             city_name,
             district_code,
             district_name,
             community_code,
             community_name,
             sys_code,
             area_name,
             area_grade
      from code_area_data
      where SYS_CODE = ?`,
      user['sysCode']
    );

    user['time'] = dayjs();
    user['area'] = areaInfo[0]['area_name'];

    // 地区信息数据
    let areaCodeArray = [
      {
        code: areaInfo[0]['province_code'],
        name: areaInfo[0]['province_name']
      },
      {
        code: areaInfo[0]['city_code'],
        name: areaInfo[0]['city_name']
      },
      {
        code: areaInfo[0]['district_code'],
        name: areaInfo[0]['district_name']
      },
      {
        code: areaInfo[0]['community_code'],
        name: areaInfo[0]['community_name']
      }
    ];

    // 如果是机构，把机构信息push到数组中
    if (user.level === 5)
      areaCodeArray.push({
        code: areaInfo[0]['sys_code'],
        name: areaInfo[0]['area_name']
      });

    // 所有的父级地区code
    user['subTitle'] = areaCodeArray.filter(it => it.code);

    return user;
  }

  @validate(
    should
      .object({
        account: should.string().allow('', null),
        pageSize: should.number(),
        pageNo: should.number()
      })
      .allow(null)
  )
  async list(params) {
    const {pageNo = 1, pageSize = 20, account = ''} = params || {};
    let whereOption = {};
    if (account) whereOption['account'] = {[Op.like]: `%${account}%`};
    return await UserModel.findAndCountAll({
      where: whereOption,
      attributes: {exclude: ['password']},
      offset: (pageNo - 1) * pageSize,
      limit: pageSize,
      distinct: true,
      include: {model: RoleModel, through: {attributes: []}}
    });
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
        .description('角色数组')
    })
  )
  async addUser(user) {
    return appDB.transaction(async () => {
      //查询该账户是否存在
      const result = await UserModel.findOne({where: {account: user.account}});
      if (result) throw new KatoCommonError('该账户已存在');
      const newUser = await UserModel.create(user);
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
    should
      .string()
      .required()
      .description('用户id'),
    should
      .string()
      .required()
      .description('角色id')
  )
  async setRole(userId, roleId) {
    const role = await RoleModel.findOne({where: {id: roleId}});
    if (!role) throw new KatoCommonError('该角色不存在');

    const user = await UserModel.findOne({where: {id: userId}});
    if (!user) throw new KatoCommonError('该用户不存在');

    const user_role = await UserRoleModel.findOne({where: {userId, roleId}});
    if (user_role) throw new KatoCommonError('重复设置');

    return await UserRoleModel.create({userId, roleId});
  }

  async cancelRole(userId, roleId) {
    const role = await RoleModel.findOne({where: {id: roleId}});
    if (!role) throw new KatoCommonError('该角色不存在');

    const user = await UserModel.findOne({where: {id: userId}});
    if (!user) throw new KatoCommonError('该用户不存在');

    const user_role = await UserRoleModel.findOne({where: {userId, roleId}});
    if (!user_role) throw new KatoCommonError('未绑定该角色');

    return await user_role.destroy();
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
    //查询是否存在该角色
    const role = await RoleModel.findOne({where: {name}});
    if (role) throw new KatoCommonError('该角色已存在');
    //角色新增操作
    return await RoleModel.create({name, permissions});
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
    result.rows = result.rows.map(it => ({
      ...it.toJSON(),
      permissions: it.permissions.map(key =>
        Permission.find(p => p.key === key)
      )
    }));
    return result;
  }

  @validate(should.string().required(), should.string().required())
  async updatePassword(userId, password) {
    return appDB.transaction(async () => {
      const user = await UserModel.findOne({where: {id: userId}});
      if (!user) throw new KatoCommonError('该用户不存在');
      return UserModel.update({password}, {where: {id: userId}});
    });
  }
}
