import * as dayjs from 'dayjs';
import {KatoRuntimeError, should} from 'kato-server';
import {getTimeRange} from '../../../common/his';
import {appDB} from '../../app';
import {Context} from '../context';
import {UserType} from '../../../common/user';

//region 时间相关
/**
 * 月份转开始结束时间
 *
 * @param month 时间
 */
export function monthToRange(month: Date): {start: Date; end: Date} {
  const time = dayjs(month);
  const start = time.startOf('M').toDate();
  const end = time
    .add(1, 'M')
    .startOf('M')
    .toDate();
  return {start, end};
}

/**
 * 将日期参数转换成合法日期
 *
 * 如果是历史日期, 则返回该月最后一天, 否则返回本月的当前时间
 * @month date 日期
 */
export function getEndTime(month: Date): Date {
  // 根据时间获取月份的开始时间和结束时间
  const {start, end} = monthToRange(month);
  // 判断当前时间是否在时间范围内
  const now = dayjs()
    .startOf('d')
    .toDate();

  // 如果开始时间减去当前时间大于0, 说明传的时间是这个月之后的日期,不合法
  if (dayjs(start).diff(now, 'd') > 0)
    throw new KatoRuntimeError(`时间不合法,大于当前月`);

  // 如果结束时间减去当前时间小于1,说明是之前月
  if (dayjs(end).diff(now, 'd') < 1) {
    return dayjs(end)
      .subtract(1, 'd')
      .toDate();
  } else {
    return now;
  }
}

/**
 * 获取这一天的开始和结束时间区间
 *
 * @param day 日期
 */
export function dayToRange(day: Date): {start: Date; end: Date} {
  return {
    start: dayjs(day)
      .startOf('d')
      .toDate(),
    end: dayjs(day)
      .add(1, 'd')
      .startOf('d')
      .toDate()
  };
}

/**
 * 日期参数校验
 */
export const dateValid = should
  .date()
  .min(getTimeRange().start)
  .less(getTimeRange().end)
  .required();

//endregion

/**
 * 获取结算状态
 *
 * @param id 医院id
 * @param month 月份
 */
export async function getSettle(id, month): Promise<boolean> {
  return (
    (
      await appDB.execute(
        // language=PostgreSQL
        `
          select settle
          from his_hospital_settle
          where hospital = ?
            and month = ?
        `,
        id,
        month
      )
    )[0]?.settle ?? false
  );
}

/**
 * 获取登录用户的机构数据
 * TODO: 苟且方案, 需要和数据权限一同调整
 */
export async function getHospital(): Promise<string> {
  // 如果是员工用户, 获取主机构
  if (Context.current.user.type === UserType.STAFF) {
    return Context.current.user.hospital?.id;
  } else if (Context.current.user.type === UserType.ADMIN) {
    // 如果是地区用户,判断是否是机构用户
    if (
      Context.current.user.hospitals &&
      Context.current.user.hospitals.length > 1
    )
      throw new KatoRuntimeError(`没有查询his员工权限`);

    return Context.current.user.hospitals[0]['id'];
  } else {
    throw new KatoRuntimeError(`账号未绑定地区权限`);
  }
}

//region 类型定义
/**
 * 员工方案考核结果
 */
export type StaffAssessModel = {
  id: string;
  name: string;
  //考核规则得分
  scores: {
    id: string;
    auto: boolean;
    name: string;
    detail: string;
    metric: string;
    operator: string;
    value: number;
    score: number;
    total: number;
  }[];
  //质量系数
  rate?: number;
};

/**
 * 员工工分结果Model
 */
export type StaffWorkModel = {
  //本人工分项目的工分列表
  self: {id: string; name: string; score: number}[];
  //本人工分来源的员工列表(不包括自己)
  staffs: {
    id: string;
    name: string;
    score: number;
  }[];
};
//endregion
