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
 * 医疗工分项目和员工绑定方式
 */
export enum HisStaffMethod {
  STATIC = '固定',
  DYNAMIC = '动态'
}

/**
 * 关联员工类型
 */
export enum HisStaffDeptType {
  Staff = '员工',
  DEPT = '科室',
  HOSPITAL = '机构',
  OTHER = '其他固定配置'
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
    value: '一',
    label: '服务提供',
    children: [
      {
        value: '一一',
        label: '功能定位',
        children: [
          {
            value: 'HIS00',
            label: '诊疗人次数',
            enabled: true
          },
          {
            value: 'a2',
            label: '出院人数',
            enabled: false
          },
          {
            value: 'a3',
            label: '中医药服务',
            enabled: false
          },
          {
            value: 'a4',
            label: '健康档案管理',
            enabled: false
          },
          {
            value: 'a5',
            label: '健康教育',
            enabled: false
          },
          {
            value: 'a6',
            label: '预防接种',
            enabled: false
          },
          {
            value: 'a7',
            label: '儿童健康管理',
            enabled: false
          },
          {
            value: 'a8',
            label: '孕产妇健康管理',
            enabled: false
          },
          {
            value: 'a9',
            label: '老年人健康管理',
            enabled: false
          },
          {
            value: 'a10',
            label: '高血压患者健康管理',
            enabled: false
          },
          {
            value: 'a11',
            label: '糖尿病患者健康管理',
            enabled: false
          },
          {
            value: 'a12',
            label: '严重精神障碍患者管理',
            enabled: false
          },
          {
            value: 'a13',
            label: '结核病患者健康管理',
            enabled: false
          },
          {
            value: 'a14',
            label: '传染病及突发公共卫生事件报告和处理',
            enabled: false
          },
          {
            value: 'a15',
            label: '卫生监督协管',
            enabled: false
          },
          {
            value: 'a16',
            label: '签约服务情况',
            enabled: false
          }
        ]
      },
      {
        value: '一二',
        label: '服务效率',
        children: [
          {
            value: 'a17',
            label: '医师日均担负诊疗人次',
            enabled: false
          },
          {
            value: 'a18',
            label: '医师日均担负住院床日',
            enabled: false
          },
          {
            value: 'a19',
            label: '病床使用率',
            enabled: false
          },
          {
            value: 'a20',
            label: '平均住院日',
            enabled: false
          }
        ]
      },
      {
        value: '一三',
        label: '医疗质量与安全',
        children: [
          {
            value: 'a21',
            label: '基本药物使用情况',
            enabled: false
          },
          {
            value: 'a22',
            label: '抗菌药物处方比例',
            enabled: false
          },
          {
            value: 'a23',
            label: '静脉注射剂使用比例',
            enabled: false
          },
          {
            value: 'a24',
            label: '院内感染管理',
            enabled: false
          },
          {
            value: 'a25',
            label: '医疗纠纷处理',
            enabled: false
          }
        ]
      }
    ]
  },
  {
    value: '二',
    label: '服务效率',
    children: [
      {
        value: '二一',
        label: '经济管理',
        children: [
          {
            value: 'a26',
            label: '门诊次均费用',
            enabled: false
          },
          {
            value: 'a27',
            label: '住院次均费用',
            enabled: false
          },
          {
            value: 'a28',
            label: '医疗收入变化情况',
            enabled: false
          },
          {
            value: 'a29',
            label: '医疗服务收入占比（不含药品、耗材、检查检验收入）',
            enabled: false
          },
          {
            value: 'a30',
            label: '收支结余',
            enabled: false
          },
          {
            value: 'a31',
            label: '人员支出占业务支出比例',
            enabled: false
          },
          {
            value: 'a32',
            label: '财务制度',
            enabled: false
          }
        ]
      },
      {
        value: '二二',
        label: '信息管理',
        children: [
          {
            value: 'a33',
            label: '信息管理系统应用',
            enabled: false
          }
        ]
      },
      {
        value: '二三',
        label: '协同服务',
        children: [
          {
            value: 'a34',
            label: '双向转诊',
            enabled: false
          },
          {
            value: 'a35',
            label: '一体化管理',
            enabled: false
          }
        ]
      }
    ]
  },
  {
    value: '三',
    label: '可持续发展',
    children: [
      {
        value: '三一',
        label: '人力配置',
        children: [
          {
            value: 'a36',
            label: '每万人口全科医生数',
            enabled: false
          },
          {
            value: 'a37',
            label: '医护比',
            enabled: false
          }
        ]
      },
      {
        value: '三二',
        label: '人员结构',
        children: [
          {
            value: 'a38',
            label: '卫生技术人员学历结构',
            enabled: false
          },
          {
            value: 'a39',
            label: '卫生技术人员职称结构',
            enabled: false
          },
          {
            value: 'a40',
            label: '中医类别医师占比',
            enabled: false
          }
        ]
      }
    ]
  },
  {
    value: '四',
    label: '满意度评价',
    children: [
      {
        value: '四一',
        label: '患者满意度',
        children: [
          {
            value: 'a41',
            label: '患者满意度',
            enabled: false
          }
        ]
      },
      {
        value: '四二',
        label: '医务人员满意度',
        children: [
          {
            value: 'a42',
            label: '医务人员满意度',
            enabled: false
          }
        ]
      }
    ]
  }
];
export const MarkTagUsages = {
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
