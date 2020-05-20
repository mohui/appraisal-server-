import crypts from 'crypts';
import {KatoLogicError, should, validate} from 'kato-server';
import * as dayjs from 'dayjs';
import {dataDB, knrtDB} from '../app';
import {UserModel} from '../database/model';
import {Op} from 'sequelize';

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
    should.object({
      account: should.string().allow('', null),
      pageSize: should.number(),
      pageNo: should.number()
    })
  )
  async list(params) {
    const {pageNo = 1, pageSize = 20, account = ''} = params;
    let whereOption = {};
    if (account) whereOption['account'] = {[Op.like]: `%${account}%`};
    return await UserModel.findAll({
      where: whereOption,
      attributes: {exclude: ['password']},
      offset: (pageNo - 1) * pageSize,
      limit: pageSize
    });
  }
}
