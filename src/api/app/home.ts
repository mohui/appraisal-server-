import {originalDB} from '../../app';
import {monthToRange} from '../his/service';
import * as dayjs from 'dayjs';
import * as dayOfYear from 'dayjs/plugin/dayOfYear';
import * as isLeapYear from 'dayjs/plugin/isLeapYear';
import {getLeaves, getOriginalArray} from '../group';
import {Context} from '../context';
import {getBasicData, getMarks} from '../group/score';
import {BasicTagUsages} from '../../../common/rule-score';
import {getHospitals} from '../group/common';

//dayjs 加载插件
dayjs.extend(dayOfYear);
dayjs.extend(isLeapYear);

export default class AppHome {
  // 获取医疗人员数量
  async staff() {
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

    // 获取月份的时间范围
    const {start, end} = monthToRange(dayjs().toDate());

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

    // 获取月份的时间范围
    const {start, end} = monthToRange(dayjs().toDate());

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
  async person() {
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
  async chronic() {
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

  /**
   * 高血压规范管理率
   */
  async htn() {
    const year = dayjs().year();
    const markModel = await getMarks(Context.current.user.code, year);
    return markModel.H00 ? 0 : markModel.H01 / markModel.H00;
  }

  /**
   * 糖尿病规范管理率
   */
  async t2dm() {
    const year = dayjs().year();
    const markModel = await getMarks(Context.current.user.code, year);
    return markModel.D00 ? 0 : markModel.D01 / markModel.D00;
  }

  /**
   * 老年人管理率
   */
  async old() {
    const areaCode = Context.current.user.code;
    const year = dayjs().year();
    const markModel = await getMarks(areaCode, year);
    if (!markModel.O00) {
      return 0;
    }

    const hospitals = await getHospitals(areaCode);
    // 获取机构id
    const hospitalIds = hospitals.map(it => it.code);

    const basicData = await getBasicData(
      hospitalIds,
      BasicTagUsages.OldPeople,
      year
    );
    return markModel.O00 / basicData;
  }

  /**
   * 医师日均诊疗人次
   */
  async doctorDailyVisits() {
    const areaCode = Context.current.user.code;
    //医师人数
    const doctors =
      (
        await originalDB.execute(
          //language=PostgreSQL
          `
            with recursive area_tree as (
              select *
              from area
              where code = ?
              union all
              select self.*
              from area self
                     inner join area_tree on self.parent = area_tree.code
            )
            select count(1) as counts
            from his_staff
                   inner join area_tree on his_staff.hospital = area_tree.code
          `,
          areaCode
        )
      )[0]?.counts ?? 0;
    if (!doctors) {
      return 0;
    }
    //诊疗人次
    const today = dayjs();
    const counts =
      (
        await originalDB.execute(
          //language=PostgreSQL
          `
            with recursive area_tree as (
              select *
              from area
              where code = ?
              union all
              select self.*
              from area self
                     inner join area_tree on self.parent = area_tree.code
            )
            select count(distinct cm.treat) as counts
            from his_charge_master cm
                   inner join area_tree at on cm.hospital = at.code
            where extract(year from cm.operate_time) = ?
          `,
          areaCode,
          today.year()
        )
      )[0]?.counts ?? 0;
    return (counts / doctors / today.dayOfYear() / 251) * 365;
  }
}
