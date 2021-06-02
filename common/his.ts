import * as dayjs from 'dayjs';

/**
 * 获取时间区间(前闭后开)
 *
 * @return {
 *   start: 默认开始时间
 *   end: 下个月
 * }
 */
export function getTimeRange(): {start: Date; end: Date} {
  return {
    //TODO: 暂时定在2021年1月
    start: dayjs('2021-01-01').toDate(),
    end: dayjs()
      .startOf('M')
      .add(1, 'M')
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
export const MarkTag = [
  {
    value: 'A',
    label: '服务效率',
    children: [
      {
        value: 'HIS00',
        label: '医师日均担负诊疗人次',
        enabled: true
      },
      {
        value: 'a2',
        label: '医师日均担负住院床日',
        enabled: false
      },
      {
        value: 'a3',
        label: '病床使用率',
        enabled: false
      },
      {
        value: 'a4',
        label: '平均住院日',
        enabled: false
      }
    ]
  },
  {
    value: 'B',
    label: '医疗质量与安全',
    children: [
      {
        value: 'b1',
        label: '基本药物使用情况',
        enabled: false
      },
      {
        value: 'b2',
        label: '抗菌药物处方比例',
        enabled: false
      },
      {
        value: 'b3',
        label: '静脉注射剂使用比例',
        enabled: false
      },
      {
        value: 'b4',
        label: '院内感染管理',
        enabled: false
      },
      {
        value: 'b5',
        label: '医疗纠纷处理',
        enabled: false
      }
    ]
  },
  {
    value: 'C',
    label: '经济管理',
    children: [
      {
        value: 'c1',
        label: '门诊次均费用',
        enabled: false
      },
      {
        value: 'c2',
        label: '住院次均费用',
        enabled: false
      },
      {
        value: 'c3',
        label: '医疗收入变化情况',
        enabled: false
      },
      {
        value: 'c4',
        label: '医疗服务收入占比',
        enabled: false
      },
      {
        value: 'c5',
        label: '收支结余',
        enabled: false
      },
      {
        value: 'c6',
        label: '人员支出占业务支出比例',
        enabled: false
      },
      {
        value: 'c7',
        label: '财务制度',
        enabled: false
      }
    ]
  },
  {
    value: 'D',
    label: '信息管理',
    children: [
      {
        value: 'd1',
        label: '信息管理系统应用',
        enabled: false
      }
    ]
  },
  {
    value: 'E',
    label: '协同服务',
    children: [
      {
        value: 'e1',
        label: '双向转诊',
        enabled: false
      },
      {
        value: 'e2',
        label: '一体化管理',
        enabled: false
      }
    ]
  },
  {
    value: 'F',
    label: '人力配置',
    children: [
      {
        value: 'f1',
        label: '每万人口全科医生数',
        enabled: false
      },
      {
        value: 'f2',
        label: '医护比',
        enabled: false
      }
    ]
  },
  {
    value: 'G',
    label: '人员结构',
    children: [
      {
        value: 'g1',
        label: '卫生技术人员学历结构',
        enabled: false
      },
      {
        value: 'g2',
        label: '卫生技术人员职称结构',
        enabled: false
      },
      {
        value: 'g3',
        label: '中医类别医师占比',
        enabled: false
      }
    ]
  },
  {
    value: 'H',
    label: '患者满意度',
    children: [
      {
        value: 'h1',
        label: '患者满意度',
        enabled: false
      }
    ]
  },
  {
    value: 'I',
    label: '医务人员满意度',
    children: [
      {
        value: 'i1',
        label: '医务人员满意度',
        enabled: false
      }
    ]
  }
];
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
  }
];
export const TagAlgorithmUsages = {
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
  }
};

//endregion
