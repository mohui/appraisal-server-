import {getHospital} from './his_staff';
import {appDB} from '../../app';
import * as dayjs from 'dayjs';
import {should, validate} from 'kato-server';

/**
 * 机构模块
 */
export default class HisHospital {
  /**
   * 获取当前机构是否结算
   *
   * @param month 月份
   */
  @validate(should.date().required())
  async getSettle(month) {
    const hospital = await getHospital();
    const date = dayjs(month)
      .startOf('M')
      .toDate();
    return (
      (
        await appDB.execute(
          `select settle from his_hospital_settle where hospital = ? and month = ?`,
          hospital,
          date
        )
      )[0]?.settle ?? false
    );
  }

  /**
   * 结算
   *
   * @param month 月份
   */
  @validate(should.date().required())
  async setSettle(month) {
    const hospital = await getHospital();
    const date = dayjs(month)
      .startOf('M')
      .toDate();
    await appDB.execute(
      `update his_hospital_settle set settle = true where hospital = ? and month = ?`,
      hospital,
      date
    );
  }
}
