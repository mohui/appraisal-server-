import {originalDB} from '../../app';
import {monthToRange} from '../his/service';
import * as dayjs from 'dayjs';
import {getLeaves, getOriginalArray} from '../group';
import {Context} from '../context';

export default class AppHome {
  // 获取医疗人员数量
  async staffCount() {
    const group = Context.current.user.areaCode;
    const leaves = await getLeaves(group);

    const hisHospitals = await getOriginalArray(leaves.map(it => it.code));
    const hospitals = hisHospitals.map(it => it.code);

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
    return Number(doctor[0]?.count);
  }
  // 获取本月医疗收入
  async money() {
    const group = Context.current.user.areaCode;
    const leaves = await getLeaves(group);

    const hisHospitals = await getOriginalArray(leaves.map(it => it.code));
    const hospitals = hisHospitals.map(it => it.code);

    const day = dayjs().toDate();
    // 获取月份的时间范围
    const {start, end} = monthToRange(day);

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
    return Number(moneys[0]?.price);
  }
  // 获取本月诊疗人次
  async visits() {
    const group = Context.current.user.areaCode;
    const leaves = await getLeaves(group);

    const hisHospitals = await getOriginalArray(leaves.map(it => it.code));
    const hospitals = hisHospitals.map(it => it.code);

    const day = dayjs().toDate();
    // 获取月份的时间范围
    const {start, end} = monthToRange(day);

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
    return Number(rows[0]?.count);
  }
  // 居民档案数量
  async healthArchives() {
    const group = Context.current.user.areaCode;
    const leaves = await getLeaves(group);

    const hisHospitals = await getOriginalArray(leaves.map(it => it.code));
    const hospitalIds = hisHospitals.map(it => it.id);

    //获取当前月
    const year = dayjs().year();

    // 获取 居民档案数量(S00)
    const mark = await originalDB.execute(
      // language=PostgreSQL
      `
            select "S00"
            from mark_organization
            where id in (${hospitalIds.map(() => '?')})
              and year = ?
          `,
      ...hospitalIds,
      year
    );

    // 获取月份的时间范围
    return Number(mark[0]?.S00);
  }
  // 慢病管理人数
  async chronicDisease() {
    const group = Context.current.user.areaCode;
    const leaves = await getLeaves(group);

    const hisHospitals = await getOriginalArray(leaves.map(it => it.code));
    const hospitalIds = hisHospitals.map(it => it.id);

    //获取当前年
    const year = dayjs().year();

    // 获取 高血压数(H00), 糖尿病数(D00)
    const mark = await originalDB.execute(
      // language=PostgreSQL
      `
            select "H00", "D00"
            from mark_organization
            where id in (${hospitalIds.map(() => '?')})
              and year = ?
          `,
      ...hospitalIds,
      year
    );

    // 获取月份的时间范围
    return Number(mark[0]?.H00) + Number(mark[0]?.D00);
  }
}
