import * as dayjs from 'dayjs';

/**
 * 获取时间区间
 *
 * @return {
 *   start: 默认开始时间
 *   end: 当前时间点
 * }
 */
export function getTimeRange(): {start: Date; end: Date} {
  return {
    //TODO: 暂时定在2021年1月
    start: dayjs('2021-01-01').toDate(),
    end: dayjs()
      .endOf('d')
      .toDate()
  };
}

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

/**
 * 工分组成类型
 */
export enum HisWorkScoreType {
  WORK_ITEM = '工分项目',
  STAFF = '员工'
}

//region 指标相关
/**
 * 指标
 */
const MarkTag = [];
const MarkTagUsages = {
  HIS00: {
    code: 'HIS00',
    name: '诊疗人次'
  }
};

/**
 * 指标计算方式
 */
export const TagAlgorithm = [
  {
    code: 'empty',
    name: '无自动打分关系（仅输出结果）'
  },
  {
    code: 'Y01',
    name: '结果为”是“时，得满分'
  },
  {
    code: 'N01',
    name: '结果为“否”时，得满分'
  },
  {
    code: 'egt',
    name: '“≥”时得满分，不足按比例得分'
  },
  {
    code: 'elt',
    name: '“≤”时得满分，超过按比例得分'
  }
];
export const TagAlgorithmUsages = {
  empty: {
    code: 'empty',
    name: '无自动打分关系（仅输出结果）'
  },
  Y01: {
    code: 'Y01',
    name: '结果为”是“时，得满分'
  },
  N01: {
    code: 'N01',
    name: '结果为“否”时，得满分'
  },
  egt: {
    code: 'egt',
    name: '“≥”时得满分，不足按比例得分'
  },
  elt: {
    code: 'elt',
    name: '“≤”时得满分，超过按比例得分'
  }
};

//endregion
