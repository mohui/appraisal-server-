import {originalDB} from '../../app';
import {monthToRange} from '../his/service';
import * as dayjs from 'dayjs';
import * as dayOfYear from 'dayjs/plugin/dayOfYear';
import * as isLeapYear from 'dayjs/plugin/isLeapYear';
import {Context} from '../context';
import {getBasicData, getMarks} from '../group/score';
import {BasicTagUsages} from '../../../common/rule-score';
import {getHospitals} from '../group/common';
import {KatoRuntimeError} from 'kato-server';
import {getStaffList, getMarkMetric} from '../his/common';

//dayjs 加载插件
dayjs.extend(dayOfYear);
dayjs.extend(isLeapYear);

export default class AppHome {
  // region 小程序

  // 获取医疗人员数量
  async staff() {
    const group = Context.current.user.areaCode;

    const areaModels = await getHospitals(group);
    // 获取机构id
    const hospitals = areaModels.map(it => it.code);

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
    const areaModels = await getHospitals(group);
    // 获取机构id
    const hospitals = areaModels.map(it => it.code);

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
    const areaModels = await getHospitals(group);
    // 获取机构id
    const hospitals = areaModels.map(it => it.code);

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
    //获取当前月
    const year = dayjs().year();
    const markModel = await getMarks(Context.current.user.code, year);
    return markModel?.S00 ?? 0;
  }

  /**
   * 慢病管理人数
   *
   * 包括高血压, 糖尿病, 脑卒中 严重精神病, 肺结核, 其他慢病
   */
  async chronic() {
    //获取当前年
    const year = dayjs().year();
    //查询机构id
    const viewHospitals = (await getHospitals(Context.current.user.code)).map(
      it => it.code
    );
    if (viewHospitals.length === 0) {
      return 0;
    }
    //language=PostgreSQL
    const amount = (
      await originalDB.execute(
        `
          select count(1) as amount
          from mark_person mp
                 inner join ph_person vp on mp.id = vp.id
            and vp.adminorganization in (${viewHospitals.map(() => '?').join()})
          where mp.year = ?
            and (
                mp."C02" = true or mp."C03" = true or mp."C06" = true
              or mp."C08" = true or mp."C09" = true or mp."C11" = true
            )
        `,
        ...viewHospitals,
        year
      )
    )[0].amount;
    return Number(amount);
  }

  /**
   * 高血压规范管理率
   */
  async htn() {
    const year = dayjs().year();
    const markModel = await getMarks(Context.current.user.code, year);
    return markModel.H00 ? markModel.H01 / markModel.H00 : 0;
  }

  /**
   * 糖尿病规范管理率
   */
  async t2dm() {
    const year = dayjs().year();
    const markModel = await getMarks(Context.current.user.code, year);
    return markModel.D00 ? markModel.D01 / markModel.D00 : 0;
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

  // endregion

  // region 员工考核相关指标

  // 万人口全科医生数(基层医疗卫生机构全科医生数 / 服务人口数 × 10000)
  async GPsPerW() {
    const group = Context.current.user.areaCode;
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);
    const hospital = areaModels[0]?.code;

    // 获取员工数
    const staffs = await getStaffList(hospital);

    // 服务人口数
    const basicData = await getBasicData(
      [hospital],
      BasicTagUsages.DocPeople,
      dayjs().year()
    );

    return basicData > 0 ? (staffs.GPCount / basicData) * 10000 : 0;
  }

  // 万人口全科医生年增长数
  async increasesOfGPsPerW() {
    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital);

    // 服务人口数
    const basicData = await getBasicData(
      [hospital],
      BasicTagUsages.DocPeople,
      dayjs().year()
    );

    return basicData > 0 ? (staffs.increasesGPCount / basicData) * 10000 : 0;
  }

  // 医护比(注册执业（助理）医师数/同期注册护士数)
  async ratioOfMedicalAndNursing() {
    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital);

    return staffs.nurseCount > 0
      ? staffs.physicianCount / staffs.nurseCount
      : 0;
  }

  // 卫生技术人员学历结构(具有本科及以上学历的卫生技术人员数/同期卫生技术人员总数×100%)
  async ratioOfHealthTechnicianEducation() {
    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital);

    return staffs.healthWorkersCount > 0
      ? staffs.bachelorCount / staffs.healthWorkersCount
      : 0;
  }

  // 卫生技术人员职称结构(具有高级职称的卫生技术人员数/同期卫生技术人员总数×100%)
  async ratioOfHealthTechnicianTitles() {
    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital);

    return staffs.healthWorkersCount > 0
      ? staffs.highTitleCount / staffs.healthWorkersCount
      : 0;
  }

  // 医师日均担负诊疗人次数(门急诊人次数/医师数)
  async physicianAverageOutpatientVisits() {
    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital);

    const metricModels = await getMarkMetric(hospital);
    return staffs.physicianCount > 0
      ? metricModels['HIS.OutpatientVisits'] / staffs.physicianCount
      : 0;
  }

  // 出院人员数量
  async dischargedVisits() {
    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    const metricModels = await getMarkMetric(hospital);
    return metricModels['HIS.DischargedVisits'];
  }

  // endregion
}
