import * as dayjs from 'dayjs';

/**
 * 获取时间区间(前闭后开)
 *
 * @return {
 *   start: 默认开始时间
 *   end: 下一年
 * }
 */
export function getTimeRange(): {start: Date; end: Date} {
  return {
    start: dayjs('2020-01-01').toDate(),
    end: dayjs()
      .startOf('y')
      .add(1, 'y')
      .toDate()
  };
}
