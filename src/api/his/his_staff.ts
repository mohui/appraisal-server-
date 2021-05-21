import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {Context} from '../context';

export default class HisStaff {
  /**
   * 查询his员工
   */
  async listHisStaffs() {
    // Context.current.user.hospitals;
    //
    // const hisStaffs = await originalDB.execute(
    //   `select id, name, hospital from his_staff where hospital = ?`,
    //   hospital
    // );
    // return hisStaffs;
  }

  /**
   * 添加员工
   *
   * @param hospital
   * @param staff
   * @param account
   * @param password
   * @param username
   */
  async add(hospital, staff, account, password, name) {
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
