import * as dayjs from 'dayjs';
import {KatoRuntimeError, should} from 'kato-server';
import {getTimeRange} from '../../../common/his';
import {appDB} from '../../app';

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
 * 如果是历史日期, 则返回该月最后一天, 否则返回本月的最后一天
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
  .max(getTimeRange().end)
  .required();

/**
 * 获取结算状态
 *
 * @param id 医院id
 * @param month 月份
 */
export async function getSettle(id, month): Promise<boolean> {
  // language=PostgreSQL
  let settle =
    (
      await appDB.execute(
        `
          select settle
          from his_hospital_settle
          where hospital = ?
            and month = ?
        `,
        id,
        month
      )
    )[0]?.settle ?? false;
  if (dayjs().diff(month, 'M') > 1) settle = true;
  return settle;
}
