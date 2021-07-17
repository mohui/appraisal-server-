import {originalDB} from '../../app';
import {monthToRange} from '../his/service';
import dayjs = require('dayjs');
import {getLeaves, getOriginalArray} from '../group';

export default class AppHome {
  /**
   * 绩效小程序 汇总数量
   *
   * group 地区编码
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
    return [
      {
        code: 'doctor',
        title: '医疗人员数量',
        data: Number(doctor[0]?.count),
        description: '根据机构的所有医疗人员汇总'
      },
      {
        code: 'visits',
        title: '本月诊疗人次',
        data: Number(rows[0]?.count),
        description: '本月诊疗人次'
      },
      {
        code: 'money',
        title: '本月医疗收入',
        data: Number(moneys[0]?.price),
        description: '本月医疗收入'
      },
      {
        code: 'S00',
        title: '居民档案数量',
        data: Number(mark[0]?.S00),
        description: null
      },
      {
        code: 'H00D00',
        title: '慢病管理人数',
        data: Number(mark[0]?.H00) + Number(mark[0]?.D00),
        description: null
      }
    ];
  }
}
