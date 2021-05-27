import * as dayjs from 'dayjs';
import {should} from 'kato-server';

/**
 * 获取时间区间
 *
 * @return {
 *   start: 默认开始时间 2021年5月
 *   end: 当前时间点
 * }
 */
export function getTimeRange(): {start: Date; end: Date} {
  return {
    start: dayjs('2021-05-01').toDate(),
    end: dayjs().toDate()
  };
}

/**
 * 月份参数校验
 */
export const monthValid = should
  .date()
  .min(getTimeRange().start)
  .max(getTimeRange().end)
  .required();

/**
 * 手工数据输入方式
 */
export enum HisManualDataInput {
  PROP = '属性',
  LOG = '日志'
}

/**
 * 医疗工分项目得分方式
 */
export enum HisWorkMethod {
  AMOUNT = '计数',
  SUM = '总和'
}

/**
 * 医疗工分项目来源
 */
export enum HisWorkSource {
  CHECK = '检查项目',
  DRUG = '药品',
  MANUAL = '手工数据'
}
