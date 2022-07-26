import {appDB, originalDB} from '../../app';
import {
  DoctorType,
  Education,
  HighTitle,
  MajorHealthType,
  MajorType,
  Occupation
} from '../../../common/his';
import * as dayjs from 'dayjs';
import {monthToRange} from './service';
import {getHospitals} from '../group/common';

/**
 * 员工统计信息
 *
 * @param hospital 地区ID
 * @param date 时间
 * @return {
 *     GPCount: 基层医疗卫生机构全科医生数
 *     increasesGPCount: 基层医疗卫生机构全科医生增长数
 *     nurseCount: 护士数量
 *     physicianCount: 医师数量
 *     bachelorCount: 本科及以上卫生技术人员数
 *     healthWorkersCount: 同期卫生技术人员总数
 *     highTitleCount: 具有高级职称的卫生技术人员数
 *     TCMCount: 中医数量
 *     staffCount: 所有职工数量
 *     TCMList: [{
 *       id: 员工ID
 *       account: 员工账号
 *       name: 员工名称
 *       major: 专业类别
 *       title: 职称名称
 *       education: 学历
 *       isGP: 是否为全科医师
 *       created_at: 创建时间
 *       area: 所属机构
 *       staff: his员工id
 *       majorType: 职称 类型
 *       doctorType: 医生类型
 *       majorHealthType: 是否是卫生技术人员
 *       level: 职称
 *     }]
 *   }
 */
export async function getStaffList(
  hospital,
  date
): Promise<{
  GPCount: number;
  increasesGPCount: number;
  nurseCount: number;
  physicianCount: number;
  bachelorCount: number;
  healthWorkersCount: number;
  highTitleCount: number;
  TCMCount: number;
  staffCount: number;
  TCMList: {
    id: string;
    account?: string;
    name?: string;
    major?: string;
    title?: string;
    education?: string;
    isGP: boolean;
    created_at: Date;
    area: string;
    staff?: string;
    majorType?: string;
    doctorType?: string;
    majorHealthType?: string;
    level?: string;
  }[];
}> {
  // region 员工信息

  // 年份的开始时间
  const yearStart = dayjs(date)
    .startOf('y')
    .toDate();
  // 月份的结束时间
  const monthEnd = dayjs(date)
    .add(1, 'month')
    .startOf('month')
    .toDate();

  const hospitals = await getHospitals(hospital);
  // 获取机构id
  const hospitalIds = hospitals.map(it => it.code);

  // 获取机构下所有his员工
  const hisStaffModels = await originalDB.execute(
    // language=PostgreSQL
    `
      select id,
             name
      from his_staff
      where hospital in (${hospitalIds.map(() => '?')})
    `,
    ...hospitalIds
  );
  // 获取his员工ID
  const hisStaffIds = hisStaffModels.map(it => it.id);

  // his员工和员工关联
  let hisStaffs = [];
  if (hisStaffIds.length > 0) {
    hisStaffs = await appDB.execute(
      // language=PostgreSQL
      `
        select his.staff, his.his_staff, area.area
        from staff_area_mapping area
               inner join staff_his_mapping his on area.staff = his.staff
        where area.area in (${hospitalIds.map(() => '?')})
          and his.his_staff in (${hisStaffIds.map(() => '?')})
      `,
      ...hospitalIds,
      ...hisStaffIds
    );
  }

  // 查询员工信息
  const staffModels = await appDB.execute(
    // language=PostgreSQL
    `
      select staff.id,
             staff.account,
             staff.name,
             staff.major,
             staff.title,
             staff.education,
             staff."isGP",
             staff.created_at,
             areaMapping.area
      from staff
             inner join staff_area_mapping areaMapping on staff.id = areaMapping.staff
      where areaMapping.area in (${hospitalIds.map(() => '?')})
        and staff.created_at <= ?
        and staff.status = true
    `,
    ...hospitalIds,
    monthEnd
  );
  // 给员工标注
  const staffList = staffModels.map(it => {
    // 先查找 专业类别,找到此专业类别的类型
    const findIndex = Occupation.find(majorIt => majorIt.name === it.major);
    // 根据查找到的专业类别, 查找 职称名称 的职称类型
    let titleIndex;
    if (findIndex) {
      titleIndex = findIndex?.children?.find(
        titleIt => titleIt.name === it.title
      );
    }
    // 查找此员工所绑定的his员工
    const hisFind = hisStaffs.find(
      hisIt => hisIt.staff === it.id && hisIt.area === it.area
    );
    return {
      ...it,
      staff: hisFind?.his_staff ?? null,
      majorType: findIndex?.majorType ?? null,
      doctorType: findIndex?.doctorType ?? null,
      majorHealthType: findIndex?.majorHealthType ?? null,
      level: titleIndex?.level ?? null
    };
  });
  // endregion

  // region 得出机构下各种员工数

  // 基层医疗卫生机构全科医生数
  const GPList = staffList.filter(it => it.isGP);

  // 基层医疗卫生机构全科医生增长数
  const increasesGPList = staffList.filter(
    it => it.isGP && it.created_at >= yearStart
  );

  // 护士列表
  const nurseList = staffList.filter(it => it.majorType === MajorType.NURSE);

  // 医师列表
  const physicianList = staffList.filter(
    it => it.majorType === MajorType.PHYSICIAN
  );

  // 查询所有不是专科及以下的,就是本科及以上, 切学历不能为空,必须是卫生技术人员
  const bachelorList = staffList.filter(
    it =>
      it.education != Education.COLLEGE &&
      it.education &&
      it.majorHealthType === MajorHealthType.healthWorkers
  );
  // 同期卫生技术人员总数
  const healthWorkersList = staffList.filter(
    it => it.majorHealthType === MajorHealthType.healthWorkers
  );

  // 具有 高级职称 的卫生技术人员数
  const highTitleList = staffList.filter(
    it => it.level === HighTitle.highTitle
  );

  // 中医列表
  const TCMList = staffList.filter(it => it.doctorType === DoctorType.TCM);
  // endregion

  return {
    GPCount: GPList.length, // 基层医疗卫生机构全科医生数
    increasesGPCount: increasesGPList.length, // 基层医疗卫生机构全科医生增长数
    nurseCount: nurseList.length, // 护士数量
    physicianCount: physicianList.length, // 医师数量
    bachelorCount: bachelorList.length, // 本科及以上卫生技术人员数
    healthWorkersCount: healthWorkersList.length, // 同期卫生技术人员总数
    highTitleCount: highTitleList.length, // 具有高级职称的卫生技术人员数
    TCMCount: TCMList.length, // 中医数量
    staffCount: staffModels.length, // 所有职工数量
    TCMList
  };
}

/**
 * 指标数量
 *
 * @param hospital 机构id
 * @param date 时间
 *
 * @return {
 *   OutpatientVisits: 门急诊人次数
 *   OutpatientIncomes: 门急诊收入
 *   DischargedVisits: 出院人次数
 *   InpatientVisits: 住院人次数
 *   InpatientIncomes: 住院收入
 *   InpatientDays: 实际占用总床日数
 *   DisChargedPatientDays: 出院病人占用总床日数
 *   DisChargedIncomes: 出院患者住院收入
 * }
 */
export async function getMarkMetric(
  hospital,
  date
): Promise<{
  'HIS.OutpatientVisits': number;
  'HIS.OutpatientIncomes': number;
  'HIS.DischargedVisits': number;
  'HIS.InpatientVisits': number;
  'HIS.InpatientIncomes': number;
  'HIS.InpatientDays': number;
  'HIS.DisChargedPatientDays': number;
  'HIS.DisChargedIncomes': number;
}> {
  const {start, end} = monthToRange(date);
  // 查询机构指标信息
  const markMetricModels = await originalDB.execute(
    // language=PostgreSQL
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
      select metric.name,
             sum(metric.value) as value
      from mark_metric metric
             inner join area_tree at on metric.id = at.code
      where metric.date >= ?
        and metric.date < ?
      group by metric.name
    `,
    hospital,
    start,
    end
  );

  const obj = {
    'HIS.OutpatientVisits': 0, // 门急诊人次数
    'HIS.OutpatientIncomes': 0, // 门急诊收入
    'HIS.DischargedVisits': 0, // 出院人次数
    'HIS.InpatientVisits': 0, // 住院人次数
    'HIS.InpatientIncomes': 0, // 住院收入
    'HIS.InpatientDays': 0, // 实际占用总床日数
    'HIS.DisChargedPatientDays': 0, // 出院病人占用总床日数
    'HIS.DisChargedIncomes': 0 // 出院患者住院收入
  };

  for (const it of markMetricModels) {
    obj[it.name] = it.value ?? 0;
  }
  return obj;
}

/**
 * 除法运算
 *
 * @param numerator 分子
 * @param denominator 分母
 */
export function divisionOperation(
  numerator: number,
  denominator: number
): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * 获取附加分
 *
 * @param staff 员工id
 * @param hospital 机构id
 * @param month 时间
 * @return number || null
 */
export async function getStaffExtraScore(
  staff,
  hospital,
  month
): Promise<number | null> {
  const {start} = monthToRange(month);

  // 获取员工所在机构的附加分,如果查询结果为空返回null
  return (
    (
      await appDB.execute(
        // language=PostgreSQL
        `
          select score
          from his_staff_extra_score
          where staff = ?
            and area = ?
            and month = ?
        `,
        staff,
        hospital,
        start
      )
    )[0]?.score ?? null
  );
}

/**
 * 获取HIS员工列表
 *
 * @param hospital 机构id
 */
export async function getHisStaff(hospital) {
  return await originalDB.execute(
    // language=PostgreSQL
    `
      select id,
             department,
             hospital,
             name,
             sex,
             phone,
             birth
      from his_staff
      where hospital = ?
    `,
    hospital
  );
}

/**
 * 获取公卫员工
 *
 * @param hospital 机构id
 */
export async function getPhStaff(hospital) {
  return await originalDB.execute(
    // language=PostgreSQL
    `
      select id,
             hospital,
             name,
             states
      from ph_user
      where hospital = ?
    `,
    hospital
  );
}

/**
 * 获取单个员工信息
 * @param id 员工id
 */
export async function getStaffModel(
  id
): Promise<{
  id: string;
  hospital: string;
  department: string;
  account: string;
  name: string;
  remark: string;
  phone: string;
  gender: string;
  major: string;
  title: string;
  education: string;
  isGP: boolean;
}> {
  return (
    await appDB.execute(
      // language=PostgreSQL
      `
        select id,
               hospital,
               department,
               account,
               name,
               remark,
               phone,
               gender,
               major,
               title,
               education,
               "isGP"
        from staff
        where id = ?
      `,
      id
    )
  )[0];
}
