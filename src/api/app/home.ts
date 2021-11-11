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
import {getStaffList, getMarkMetric, divisionOperation} from '../his/common';

//dayjs 加载插件
dayjs.extend(dayOfYear);
dayjs.extend(isLeapYear);

export default class AppHome {
  // region 小程序

  // 获取医疗人员数量(基础数据暂未提供员工入职时间)
  async staff(date) {
    if (!date) date = dayjs().toDate();

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
  async money(date) {
    if (!date) date = dayjs().toDate();

    const group = Context.current.user.areaCode;
    const metricModels = await getMarkMetric(group, date);
    return (
      metricModels['HIS.InpatientIncomes'] +
      metricModels['HIS.OutpatientIncomes']
    );
  }

  // 获取本月诊疗人次
  async visits(date) {
    if (!date) date = dayjs().toDate();

    const group = Context.current.user.areaCode;
    const metricModels = await getMarkMetric(group, date);
    return metricModels['HIS.OutpatientVisits'];
  }

  // 居民档案数量
  async person(date) {
    if (!date) date = dayjs().toDate();

    //获取当前月
    const year = dayjs(date).year();
    const markModel = await getMarks(Context.current.user.code, year);
    return markModel?.S00 ?? 0;
  }

  /**
   * 慢病管理人数
   *
   * 包括高血压, 糖尿病, 脑卒中 严重精神病, 肺结核, 其他慢病
   */
  async chronic(date) {
    if (!date) date = dayjs().toDate();

    //获取当前年
    const year = dayjs(date).year();
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
  async htn(date) {
    if (!date) date = dayjs().toDate();

    const year = dayjs(date).year();
    const markModel = await getMarks(Context.current.user.code, year);
    return markModel.H00 ? markModel.H01 / markModel.H00 : 0;
  }

  /**
   * 糖尿病规范管理率
   */
  async t2dm(date) {
    if (!date) date = dayjs().toDate();

    const year = dayjs(date).year();
    const markModel = await getMarks(Context.current.user.code, year);
    return markModel.D00 ? markModel.D01 / markModel.D00 : 0;
  }

  /**
   * 老年人管理率
   */
  async old(date) {
    if (!date) date = dayjs().toDate();

    const areaCode = Context.current.user.code;
    const year = dayjs(date).year();
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

  // 医师日均担负诊疗人次数(门急诊人次数 / 医师数 / 251)
  async doctorDailyVisits(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(group, date);

    const metricModels = await getMarkMetric(group, date);

    return (
      divisionOperation(
        metricModels['HIS.OutpatientVisits'],
        staffs.physicianCount
      ) / 251
    );
  }

  // endregion

  // region 员工考核相关指标

  // 万人口全科医生数(基层医疗卫生机构全科医生数 / 服务人口数 × 10000)
  async GPsPerW(date) {
    if (!date) date = dayjs().toDate();

    const group = Context.current.user.areaCode;
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);
    const hospital = areaModels[0]?.code;
    const year = dayjs(date).year();

    // 获取员工数
    const staffs = await getStaffList(hospital, date);

    // 服务人口数
    const basicData = await getBasicData(
      [hospital],
      BasicTagUsages.DocPeople,
      year
    );

    return divisionOperation(staffs.GPCount, basicData) * 10000;
  }

  // 万人口全科医生年增长数
  async increasesOfGPsPerW(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    const year = dayjs(date).year();

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital, date);

    // 服务人口数
    const basicData = await getBasicData(
      [hospital],
      BasicTagUsages.DocPeople,
      year
    );

    return divisionOperation(staffs.increasesGPCount, basicData) * 10000;
  }

  // 医护比(注册执业（助理）医师数/同期注册护士数)
  async ratioOfMedicalAndNursing(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital, date);

    return divisionOperation(staffs.physicianCount, staffs.nurseCount);
  }

  // 卫生技术人员学历结构(具有本科及以上学历的卫生技术人员数/同期卫生技术人员总数×100%)
  async ratioOfHealthTechnicianEducation(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital, date);

    return divisionOperation(staffs.bachelorCount, staffs.healthWorkersCount);
  }

  // 卫生技术人员职称结构(具有高级职称的卫生技术人员数/同期卫生技术人员总数×100%)
  async ratioOfHealthTechnicianTitles(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital, date);

    return divisionOperation(staffs.highTitleCount, staffs.healthWorkersCount);
  }

  /**
   * 出院人员数量
   */
  async dischargedVisits(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    const metricModels = await getMarkMetric(hospital, date);
    return metricModels['HIS.DischargedVisits'];
  }

  /**
   * 病床使用率
   */
  async sickbedUsageRate() {
    return null;
  }

  /**
   * 门急诊次均费用(门急诊收入/年门急诊人次数)
   */
  async outpatientAverageIncomes(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    const metricModels = await getMarkMetric(hospital, date);

    return divisionOperation(
      metricModels['HIS.OutpatientIncomes'],
      metricModels['HIS.OutpatientVisits']
    );
  }

  /**
   * 住院次均费用(住院业务总收入/年住院总人次数)
   */
  async inpatientAverageIncomes(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    const metricModels = await getMarkMetric(hospital, date);

    return divisionOperation(
      metricModels['HIS.InpatientIncomes'],
      metricModels['HIS.InpatientVisits']
    );
  }

  /**
   * 中医类别医师占比
   */
  async RatioOfTCM(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    // 取出机构下所有医生信息
    const staffs = await getStaffList(hospital, date);

    return divisionOperation(staffs.TCMCount, staffs.physicianCount);
  }

  /**
   * 每万人服务门诊当量(辖区门诊服务总当量 / 辖区内常住居民数 x 10000)
   */
  async thousandOutpatientVisits(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    const metricModels = await getMarkMetric(hospital, date);

    const year = dayjs(date).year();
    // 辖区内常住居民数
    const basicData = await getBasicData(
      [hospital],
      BasicTagUsages.DocPeople,
      year
    );
    return (
      divisionOperation(metricModels['HIS.OutpatientVisits'], basicData) * 10000
    );
  }

  /**
   * 每万人服务住院当量(辖区住院总人次数/辖区内常住居民数×10000)
   */
  async thousandInpatientVisits(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    const year = dayjs(date).year();
    const metricModels = await getMarkMetric(hospital, date);

    // 辖区内常住居民数
    const basicData = await getBasicData(
      [hospital],
      BasicTagUsages.DocPeople,
      year
    );
    return (
      divisionOperation(metricModels['HIS.InpatientVisits'], basicData) * 10000
    );
  }

  /**
   * 职工年平均担负门急诊人次(门急诊人次数/在岗职工数×100%)
   */
  async staffOutpatientVisits(date) {
    if (!date) date = dayjs().toDate();

    // 获取所属地区
    const group = Context.current.user.areaCode;
    // 获取权限下机构
    const areaModels = await getHospitals(group);
    if (areaModels.length > 1) throw new KatoRuntimeError(`不是机构权限`);

    // 取出机构id
    const hospital = areaModels[0]?.code;

    const metricModels = await getMarkMetric(hospital, date);
    const staffs = await getStaffList(hospital, date);

    return divisionOperation(
      metricModels['HIS.OutpatientVisits'],
      staffs.staffCount
    );
  }
  // endregion
}
