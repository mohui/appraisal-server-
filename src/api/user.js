import {KatoCommonError, KatoLogicError, should, validate} from 'kato-server';
import {appDB} from '../app';
import {
  HospitalModel,
  RegionModel,
  RoleModel,
  UserHospitalModel,
  UserModel,
  UserRoleModel
} from '../database/model';
import {Op} from 'sequelize';
import {getPermission} from '../../common/permission';
import {Context} from './context';

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
    const {pageNo = 1, pageSize = 20, account = '', name = '', roleId = ''} =
      params || {};
    let whereOption = {};
    if (account) whereOption['account'] = {[Op.like]: `%${account}%`};
    if (name) whereOption['name'] = {[Op.like]: `%${name}%`};
    //如果传递roleId则从用户角色关系表中查询该角色的用户id
    if (roleId)
      //构成条件
      whereOption['id'] = {
        [Op.in]: await UserRoleModel.findAll({where: {roleId}}).map(
          r => r.userId
        )
      };
    return UserModel.findAndCountAll({
      where: whereOption,
      attributes: {exclude: ['password']},
      offset: (pageNo - 1) * pageSize,
      limit: pageSize,
      order: [['created_at', 'DESC']],
      include: [
        {
          model: RoleModel,
          through: {attributes: []},
          required: false
        },
        {model: RegionModel, required: true}
      ]
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
      await UserModel.update(user, {where: {id: user.id}});
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
      permissions: it.permissions.map(key => getPermission(key))
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
      let user = await UserModel.findOne({
        where: {
          id: Context.req.headers.token
        }
      });
      if (!user) throw new KatoCommonError('该用户不存在');
      user.name = params.name;
      return await user.save();
    });
  }
}
