import {originalDB} from '../../app';
import {monthToRange} from '../his/service';
import dayjs = require('dayjs');

export default class AppTotal {
  /**
   * 绩效小程序 汇总数量
   * return {money: '本月医疗收入'}
   */
  async total(hospital) {
    //获取当前月
    const month = dayjs().toDate();

    // 获取月份的时间范围
    const {start, end} = monthToRange(month);

    // 本月医疗收入
    const moneys = await originalDB.execute(
      `
        select sum(detail.total_price) as price
            from his_staff staff
             left join his_charge_detail detail on staff.id = detail.doctor
            where staff.hospital = ?
              and detail.operate_time > ?
              and detail.operate_time < ?`,
      hospital,
      start,
      end
    );
    return {
      money: moneys[0]?.price
    };
  }
}
