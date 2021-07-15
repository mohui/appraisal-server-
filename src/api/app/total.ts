import {originalDB} from '../../app';
import {monthToRange} from '../his/service';
import dayjs = require('dayjs');
import {getLeaves, getOriginalArray} from '../group';

export default class AppTotal {
  /**
   * 绩效小程序 汇总数量
   *
   * group 地区编码
   *
   * return {
   *  money: '本月医疗收入',
   *  doctor: '医疗人员数量',
   *  visits: '诊疗人次',
   *  S00: '居民档案次数'
   *  H00D00: '慢病管理人数'
   * }
   */
  async total(group) {
    const leaves = await getLeaves(group);

    const hisHospitals = await getOriginalArray(leaves.map(it => it.code));
    const hospitals = hisHospitals.map(it => it.code);
    const hospitalIds = hisHospitals.map(it => it.id);

    // 医疗人员数量
    const doctor = await originalDB.execute(
      // language=PostgreSQL
      `
        select count(id) count
            from his_staff
            where hospital in (${hospitals.map(() => '?')})
      `,
      ...hospitals
    );

    //获取当前月
    const month = dayjs().toDate();
    const year = dayjs(month).year();

    // 获取 居民档案数量(S00), 高血压数(H00), 糖尿病数(D00)
    const mark = await originalDB.execute(
      // language=PostgreSQL
      `
            select "S00", "H00", "D00"
            from mark_organization
            where id in (${hospitalIds.map(() => '?')})
              and year = ?
          `,
      ...hospitalIds,
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
            where staff.hospital in (${hospitals.map(() => '?')})
              and master.operate_time > ?
              and master.operate_time < ?
          `,
      ...hospitals,
      start,
      end
    );

    // 本月医疗收入
    const moneys = await originalDB.execute(
      // language=PostgreSQL
      `
        select sum(detail.total_price) as price
            from his_staff staff
             left join his_charge_detail detail on staff.id = detail.doctor
            where staff.hospital in (${hospitals.map(() => '?')})
              and detail.operate_time > ?
              and detail.operate_time < ?`,
      ...hospitals,
      start,
      end
    );
    return {
      doctor: Number(doctor[0]?.count),
      visits: Number(rows[0]?.count),
      money: Number(moneys[0]?.price),
      S00: Number(mark[0]?.S00),
      H00D00: Number(mark[0]?.H00) + Number(mark[0]?.D00)
    };
  }
}
