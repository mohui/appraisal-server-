import {getHospital} from './his_staff';
import {appDB} from '../../app';
import * as dayjs from 'dayjs';
import {should, validate} from 'kato-server';

/**
 * 机构模块
 */
export default class HisHospital {
  /**
   * 结算指定月份
   *
   * @param month 月份
   */
  @validate(should.date().required())
  async settle(month) {
    const hospital = await getHospital();
    const date = dayjs(month)
      .startOf('M')
      .toDate();
    await appDB.execute(
      //language=PostgreSQL
      `
        insert into his_hospital_settle(hospital, month, settle)
        values (?, ?, true)
        on conflict (hospital, month)
          do update set settle     = true,
                        updated_at = now()
      `,
      hospital,
      date
    );
  }
}
