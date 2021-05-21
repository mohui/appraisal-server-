import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {Context} from '../context';
import {KatoRuntimeError, should, validate} from 'kato-server';

export async function getHospital() {
  if (
    Context.current.user.hospitals &&
    Context.current.user.hospitals.length > 1
  )
    throw new KatoRuntimeError(`没有查询his员工权限`);

  return Context.current.user.hospitals[0]['id'];
}
export default class HisStaff {
  /**
   * 查询his员工
   */
  async listHisStaffs() {
    const hospital = await getHospital();

    return await originalDB.execute(
      `select id, name, hospital from his_staff where hospital = ?`,
      hospital
    );
  }

  /**
   * 添加员工
   *
   * @param staff
   * @param account
   * @param password
   * @param name
   */
  @validate(
    should
      .string()
      .allow(null, '')
      .description('绑定his员工id'),
    should
      .string()
      .required()
      .description('登录名'),
    should
      .string()
      .required()
      .description('密码'),
    should
      .string()
      .required()
      .description('名称')
  )
  async add(staff, account, password, name) {
    const hospital = await getHospital();
    // 查询his员工是否已经被绑定
    const accountOne = await appDB.execute(
      `select * from staff where staff = ?`,
      staff
    );
    if (accountOne.length > 0) throw new KatoRuntimeError(`his员工已经存在`);
    return await appDB.execute(
      `insert into
            staff(
              id,
              hospital,
              staff,
              account,
              password,
              name,
              created_at,
              updated_at
              )
            values(?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(),
      hospital,
      staff,
      account,
      password,
      name,
      dayjs().toDate(),
      dayjs().toDate()
    );
  }
}
