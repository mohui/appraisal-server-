import * as dayjs from 'dayjs';
import Decimal from 'decimal.js';

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
        label: '医疗功能定位',
        children: [
          {
            value: 'HIS00',
            label: '诊疗人次数',
            enabled: true
          },
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
            value: 'DischargedVisits',
            label: '出院人次数',
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
            value: 'TCMVisits',
            label: '中医诊疗人次数',
            enabled: true
          },
          {
            value: 'TCMVisitsRate',
            label: '中医诊疗人次占比',
            enabled: true
          },
          {
            value: 'a5',
            label: '中医医疗技术方法种类',
            enabled: false
          },
          {
            value: 'a6',
            label: '门诊中医非药物疗法诊疗人次占比',
            enabled: false
          }
        ]
      },
      {
        value: '一二',
        label: '服务效率',
        children: [
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
            value: 'PhysicianAverageBedDay',
            label: '医师日均担负住院床日',
            enabled: true
          },
          {
            value: 'SickbedUsageRate',
            label: '病床使用率',
            enabled: true
          },
          {
            value: 'AverageHospitalizedDay',
            label: '平均住院日',
            enabled: true
          }
        ]
      },
      {
        value: '一三',
        label: '医疗质量与安全',
        children: [
          {
            value: 'a21',
            label: '基本药物采购品种比例',
            enabled: false
          },
          {
            value: 'a22',
            label: '基本药物采购金额比例',
            enabled: false
          },
          {
            value: 'a222',
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
            label: '两联抗菌药物使用比例',
            enabled: false
          },
          {
            value: 'a25',
            label: '中成药处方比例',
            enabled: false
          },
          {
            value: 'a251',
            label: '中草药处方比例',
            enabled: false
          },
          {
            value: 'a252',
            label: '非药物处方比例',
            enabled: false
          },
          {
            value: 'a253',
            label: '不合理处方比例',
            enabled: false
          }
        ]
      }
    ]
  },
  {
    value: '二',
    label: '综合管理',
    children: [
      {
        value: '二一',
        label: '经济管理',
        children: [
          {
            value: 'OutpatientAverageIncomes',
            label: '门急诊次均费用',
            enabled: true
          },
          {
            value: 'OutpatientAverageIncomesIncreasesRate',
            label: '门急诊次均费用变化情况',
            enabled: true
          },
          {
            value: 'InpatientAverageIncomes',
            label: '住院次均费用',
            enabled: true
          },
          {
            value: 'InpatientAverageIncomesIncreasesRate',
            label: '住院次均费用变化情况',
            enabled: true
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
            label: '万人口全科医生数',
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
  DischargedVisits: {
    code: 'DischargedVisits',
    name: '出院人次数'
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
  },
  SickbedUsageRate: {
    code: 'SickbedUsageRate',
    name: '病床使用率'
  },
  TCMVisits: {
    code: 'TCMVisits',
    name: '中医诊疗人次数'
  },
  TCMVisitsRate: {
    code: 'TCMVisitsRate',
    name: '中医诊疗人次占比'
  },
  PhysicianAverageBedDay: {
    code: 'PhysicianAverageBedDay',
    name: '医师日均担负住院床日'
  },
  AverageHospitalizedDay: {
    code: 'AverageHospitalizedDay',
    name: '平均住院日'
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

/**
 * 工作量阶梯式算分
 *
 * @param rules 阶梯式规则 [{
 *   start: 开始
 *   end: 结束
 *   unit: 工作量分值
 * }]
 * @param num 总工作量
 * @return [{
 *   start: 开始
 *   end: 结束
 *   unit: 工作量分值
 *   num: 工作量
 *   total: 工分
 * }]
 */
export function multistep(
  rules: {start: number | null; end: number | null; unit: number}[],
  num: number
): {start: number; end: number; unit: number; num: number; total: number}[] {
  return rules.map(rule => {
    let stepNum = 0;
    //0不参与计算
    if (num !== 0) {
      if (rule.start == null) {
        //全范围 正无穷到负无穷
        if (rule.end == null) {
          stepNum = Decimal.abs(num).toNumber();
        } else if (num == rule.end) {
          //最小区间的最大值特殊处理
          // thisNum = 1;
        } else if (num < rule.end) {
          stepNum = Decimal.sub(num, rule.end < 0 ? rule.end : 0)
            .abs()
            .toNumber();
        } else if (rule.end > 0 && num > rule.end) {
          //当最小区间的最大值大于0 且num大于此值时 工作量为最大值-0
          stepNum = rule.end - 0;
        }
      } else {
        //检查数据正向交集
        if (
          num >= rule.start &&
          (rule.end === null || num < 0 || (num > 0 && rule.end >= 0))
        ) {
          //当num大于区间的最大值时 以最大值结算 否则以num作为终点
          //当num为负数时区间最大值为非负数 或 num为正数区间最小值为非正数 以0作为计算起点 否则以区间最小值结算
          stepNum = Decimal.sub(
            rule.end !== null && num > rule.end ? rule.end : num,
            (num < 0 && rule.end >= 0) || (num > 0 && rule.start <= 0)
              ? 0
              : rule.start
          )
            .abs()
            .toNumber();
        } else if (rule.start < 0 && num < rule.start) {
          //当区间最小值小于0 且num小于此值时 工作量为(最大值小于0时以最大值计算 否则以0计算)-最小值
          stepNum = Decimal.sub(
            rule.end !== null && rule.end < 0 ? rule.end : 0,
            rule.start
          )
            .abs()
            .toNumber();
        }
      }
    }
    return {
      ...rule,
      num: stepNum,
      total: stepNum * rule.unit
    };
  });
}
