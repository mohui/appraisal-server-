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
  HOSPITAL = '机构'
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

/**
 * 预览类型
 */
export enum PreviewType {
  HIS_STAFF = 'HIS员工',
  STAFF = '系统员工',
  PH_STAFF = '公卫员工',
  HOSPITAL = '系统机构'
}

//region 用户信息
/**
 * 学历
 */
export enum Education {
  COLLEGE = '专科及以下',
  BACHELOR = '本科',
  MASTER = '硕士',
  DOCTOR = '博士'
}

/**
 * 性别
 */
export const Gender = ['男', '女', '未说明的性别', '未知的性别'];

/**
 * 职称 类型
 */
export enum MajorType {
  PHYSICIAN = '医师',
  NURSE = '护士'
}

/**
 * 医生类型
 */
export enum DoctorType {
  TCM = '中医'
}

/**
 * 是否是卫生技术人员
 */
export enum MajorHealthType {
  healthWorkers = '卫生技术人员'
}

/**
 * 高级职称
 */

export enum HighTitle {
  highTitle = '高级职称'
}

/**
 * 职业信息 的 专业类别,职称名称
 */
export const Occupation = [
  {
    name: '临床（西医）医生',
    majorType: MajorType.PHYSICIAN,
    majorHealthType: MajorHealthType.healthWorkers,
    children: [
      {
        name: '助理医师'
      },
      {
        name: '医师'
      },
      {
        name: '主治（主管）医师'
      },
      {
        name: '副主任医师',
        level: HighTitle.highTitle
      },
      {
        name: '主任医师',
        level: HighTitle.highTitle
      }
    ]
  },
  {
    name: '公共卫生医生',
    majorType: MajorType.PHYSICIAN,
    majorHealthType: MajorHealthType.healthWorkers,
    children: [
      {
        name: '助理医师'
      },
      {
        name: '医师'
      },
      {
        name: '主治（主管）医师'
      },
      {
        name: '副主任医师',
        level: HighTitle.highTitle
      },
      {
        name: '主任医师',
        level: HighTitle.highTitle
      }
    ]
  },
  {
    name: '临床（中医）医生',
    majorType: MajorType.PHYSICIAN,
    doctorType: DoctorType.TCM,
    majorHealthType: MajorHealthType.healthWorkers,
    children: [
      {
        name: '助理医师'
      },
      {
        name: '医师'
      },
      {
        name: '主治（主管）医师'
      },
      {
        name: '副主任医师',
        level: HighTitle.highTitle
      },
      {
        name: '主任医师',
        level: HighTitle.highTitle
      }
    ]
  },
  {
    name: '药学人员',
    majorHealthType: MajorHealthType.healthWorkers,
    children: [
      {
        name: '药士'
      },
      {
        name: '药师'
      },
      {
        name: '主管药师'
      },
      {
        name: '副主任药师',
        level: HighTitle.highTitle
      },
      {
        name: '主任药师',
        level: HighTitle.highTitle
      }
    ]
  },
  {
    name: '护理人员',
    majorType: MajorType.NURSE,
    majorHealthType: MajorHealthType.healthWorkers,
    children: [
      {
        name: '护士'
      },
      {
        name: '护师'
      },
      {
        name: '主管护师'
      },
      {
        name: '副主任护师',
        level: HighTitle.highTitle
      },
      {
        name: '主任护师',
        level: HighTitle.highTitle
      }
    ]
  },
  {
    name: '技术人员',
    majorHealthType: MajorHealthType.healthWorkers,
    children: [
      {
        name: '技士'
      },
      {
        name: '技师'
      },
      {
        name: '主管技师'
      },
      {
        name: '副主任技师',
        level: HighTitle.highTitle
      },
      {
        name: '主任技师',
        level: HighTitle.highTitle
      }
    ]
  },
  {
    name: '管理及其他人员',
    children: [
      {
        name: '财务人员'
      },
      {
        name: '后勤人员'
      },
      {
        name: '中心主任',
        level: HighTitle.highTitle
      },
      {
        name: '中心副主任',
        level: HighTitle.highTitle
      }
    ]
  }
];
//endregion

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
            value: 'OutpatientIncreasesRate',
            label: '门急诊人次增长率',
            enabled: true
          },
          {
            value: 'ThousandOutpatientVisits',
            label: '每万人服务门诊当量',
            enabled: true
          },
          {
            value: 'DischargedIncreasesRate',
            label: '出院人次增长率',
            enabled: true
          },
          {
            value: 'ThousandInpatientVisits',
            label: '每万人服务住院当量',
            enabled: true
          },
          {
            value: 'PhysicianAverageOutpatientVisits',
            label: '医师日均担负诊疗人次',
            enabled: true
          },
          {
            value: 'StaffOutpatientVisits',
            label: '职工年平均担负门急诊人次',
            enabled: true
          },
          {
            value: 'OutpatientAverageIncomes',
            label: '门急诊次均费用',
            enabled: false
          },
          {
            value: 'OutpatientAverageIncomesIncreasesRate',
            label: '门急诊次均费用变化情况',
            enabled: false
          },
          {
            value: 'InpatientAverageIncomes',
            label: '住院次均费用',
            enabled: false
          },
          {
            value: 'InpatientAverageIncomesIncreasesRate',
            label: '住院次均费用变化情况',
            enabled: false
          },
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
            value: 'GPsPerW',
            label: '每万人口全科医生数',
            enabled: true
          },
          {
            value: 'IncreasesOfGPsPerW',
            label: '万人口全科医生年增长数',
            enabled: true
          },
          {
            value: 'RatioOfMedicalAndNursing',
            label: '医护比',
            enabled: true
          }
        ]
      },
      {
        value: '三二',
        label: '人员结构',
        children: [
          {
            value: 'RatioOfHealthTechnicianEducation',
            label: '卫生技术人员学历结构',
            enabled: true
          },
          {
            value: 'RatioOfHealthTechnicianTitles',
            label: '卫生技术人员职称结构',
            enabled: true
          },
          {
            value: 'RatioOfTCM',
            label: '中医类别医师占比',
            enabled: true
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
  },
  GPsPerW: {
    code: 'GPsPerW',
    name: '万人口全科医生数'
  },
  IncreasesOfGPsPerW: {
    code: 'IncreasesOfGPsPerW',
    name: '万人口全科医生年增长数'
  },
  RatioOfMedicalAndNursing: {
    code: 'RatioOfMedicalAndNursing',
    name: '医护比'
  },
  RatioOfHealthTechnicianEducation: {
    code: 'RatioOfHealthTechnicianEducation',
    name: '卫生技术人员学历结构'
  },
  RatioOfHealthTechnicianTitles: {
    code: 'RatioOfHealthTechnicianTitles',
    name: '卫生技术人员职称结构'
  },
  RatioOfTCM: {
    code: 'RatioOfTCM',
    name: '中医类别医师占比'
  },
  OutpatientIncreasesRate: {
    code: 'OutpatientIncreasesRate',
    name: '门急诊人次增长率'
  },
  ThousandOutpatientVisits: {
    code: 'ThousandOutpatientVisits',
    name: '每万人服务门诊当量'
  },
  DischargedIncreasesRate: {
    code: 'DischargedIncreasesRate',
    name: '出院人次增长率'
  },
  ThousandInpatientVisits: {
    code: 'ThousandInpatientVisits',
    name: '每万人服务住院当量'
  },
  PhysicianAverageOutpatientVisits: {
    code: 'PhysicianAverageOutpatientVisits',
    name: '医师日均担负诊疗人次'
  },
  StaffOutpatientVisits: {
    code: 'StaffOutpatientVisits',
    name: '职工年平均担负门急诊人次'
  },
  OutpatientAverageIncomes: {
    code: 'OutpatientAverageIncomes',
    name: '门急诊次均费用'
  },
  OutpatientAverageIncomesIncreasesRate: {
    code: 'OutpatientAverageIncomesIncreasesRate',
    name: '门急诊次均费用变化情况'
  },
  InpatientAverageIncomes: {
    code: 'InpatientAverageIncomes',
    name: '住院次均费用'
  },
  InpatientAverageIncomesIncreasesRate: {
    code: 'InpatientAverageIncomesIncreasesRate',
    name: '住院次均费用变化情况'
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
