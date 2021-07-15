import {originalDB} from '../../app';
import {monthToRange} from '../his/service';
import dayjs = require('dayjs');
import {getOriginalArray} from '../group';

export default class AppTotal {
  /**
   * 绩效小程序 汇总数量
   * return {money: '本月医疗收入', doctor: '医疗人员数量'}
   */
  async total(hospital) {
    // 医疗人员数量
    const doctorIds = await originalDB.execute(
      `
        select id
            from his_staff
            where hospital = ?
      `,
      hospital
    );
    //获取当前月
    const month = dayjs().toDate();
    const year = dayjs(month).year();

    // 获取机构
    const viewHospitals = await getOriginalArray([hospital]);
    // 获取居民档案数量(S00), 高血压数(H00), 糖尿病数(D00)
    const mark = await originalDB.execute(
      `
            select "S00", "H00", "D00"
            from mark_organization
            where id = ?
              and year = ?
          `,
      viewHospitals[0].id,
      year
    );

    // 获取月份的时间范围
    const {start, end} = monthToRange(month);

    // 本月诊疗人次
    const rows = await originalDB.execute(
      // language=PostgreSQL
      `
            select count(distinct master.treat) count
            from his_staff staff
            inner join his_charge_master master on staff.id = master.doctor
            where staff.hospital = ?
              and master.operate_time > ?
              and master.operate_time < ?
          `,
      hospital,
      start,
      end
    );

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
      doctor: doctorIds?.length,
      visits: Number(rows[0]?.count),
      money: Number(moneys[0]?.price),
      S00: Number(mark[0]?.S00),
      H00D00: Number(mark[0]?.H00) + Number(mark[0]?.D00)
    };
  }
}
