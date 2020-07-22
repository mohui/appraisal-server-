/**
 * 基础数据
 */
export const BasicTags = [
  {
    name: '居民健康档案管理服务',
    code: 'document',
    children: [
      {
        name: '辖区内常住人口',
        code: 'doc-people'
      }
    ]
  },
  {
    name: '老年人健康管理服务',
    code: 'old',
    children: [
      {
        name: '年内辖区内65岁及以上常住居民数',
        code: 'old-people'
      }
    ]
  },
  {
    name: '高血压患者健康管理服务',
    code: 'hypertension',
    children: [
      {
        name: '年内应管理高血压患者人数',
        code: 'hypertension-people'
      }
    ]
  },
  {
    name: '糖尿病患者健康管理服务',
    code: 'diabetes',
    children: [
      {
        name: '年内应管理糖尿病患者人数',
        code: 'diabetes-people'
      }
    ]
  },
  {
    name: '健康教育服务',
    code: 'HealthEducation',
    children: [
      {
        name: '发放健康教育印刷资料的种类',
        code: 'HE00'
      },
      {
        name: '发放健康教育印刷资料的数量',
        code: 'HE01'
      },
      {
        name: '播放健康教育音像资料的种类',
        code: 'HE02'
      },
      {
        name: '播放健康教育音像资料的次数',
        code: 'HE03'
      },
      {
        name: '播放健康教育音像资料的时间',
        code: 'HE04'
      },
      {
        name: '健康教育宣传栏设置几处',
        code: 'HE05'
      },
      {
        name: '健康教育宣传栏更新情况',
        code: 'HE06'
      },
      {
        name: '健康教育讲座的次数及明细(参加人数等)',
        code: 'HE07'
      },
      {
        name: '健康教育咨询活动的次数及明细(参加人数等)',
        code: 'HE08'
      }
    ]
  },
  {
    name: '预防接种服务',
    code: 'Inoculate',
    children: [
      {
        code: 'Inoculate00',
        name: '年度辖区内应建立预防接种人数'
      },
      {
        code: 'Inoculate01',
        name: '年度辖区内卡介苗疫苗应接种人数'
      },
      {
        code: 'Inoculate02',
        name: '年度辖区内乙肝疫苗应接种人数'
      },
      {
        code: 'Inoculate03',
        name: '年度辖区内脊灰疫苗应接种人数'
      },
      {
        code: 'Inoculate04',
        name: '年度辖区内麻风疫苗应接种人数'
      },
      {
        code: 'Inoculate05',
        name: '年度辖区内乙脑疫苗应接种人数'
      },
      {
        code: 'Inoculate06',
        name: '年度辖区内流脑疫苗应接种人数'
      },
      {
        code: 'Inoculate07',
        name: '年度辖区内无细胞百白破疫苗应接种人数'
      },
      {
        code: 'Inoculate08',
        name: '年度辖区内甲肝疫苗应接种人数'
      },
      {
        code: 'Inoculate09',
        name: '年度辖区内麻腮风疫苗应接种人数'
      },
      {
        code: 'Inoculate10',
        name: '年度辖区内无细胞百白破(加强)疫苗应接种人数'
      },
      {
        code: 'Inoculate11',
        name: '年度辖区内脊灰(加强)疫苗应接种人数'
      },
      {
        code: 'Inoculate12',
        name: '年度辖区内乙脑(加强)疫苗应接种人数'
      },
      {
        code: 'Inoculate13',
        name: '年度辖区内流脑(3周岁加强)疫苗应接种人数'
      },
      {
        code: 'Inoculate14',
        name: '年度辖区内白破疫苗应接种人数'
      },
      {
        code: 'Inoculate15',
        name: '年度辖区内流脑(6周岁加强)疫苗应接种人数'
      }
    ]
  },
  {
    code: 'Children',
    name: '0-6岁儿童健康管理服务',
    children: [
      {
        code: 'Children00',
        name: '年度辖区内活产数'
      },
      {
        code: 'Children01',
        name: '年度辖区内0-6岁儿童数'
      }
    ]
  },
  {
    code: 'Maternal',
    name: '孕产妇健康管理服务',
    children: [
      {
        code: 'Maternal00',
        name: '年度辖区内活产数'
      }
    ]
  },
  {
    code: 'Psychosis',
    name: '严重精神病障碍患者管理服务',
    children: [
      {
        code: 'Psychosis00',
        name: '年度辖区内按照规范要求进行管理的严重精神障碍患者人数'
      },
      {
        code: 'Psychosis01',
        name: '年度辖区内登记在册的确诊严重精神障碍患者人数'
      }
    ]
  },
  {
    code: 'Tuberculosis',
    name: '肺结核患者健康管理服务',
    children: [
      {
        code: 'Tuberculosis00',
        name: '年度辖区内已管理的肺结核患者人数'
      },
      {
        code: 'Tuberculosis01',
        name:
          '年度辖区内经上级定点医疗机构确诊并通知基层医疗卫生机构管理的肺结核患者人数'
      },
      {
        code: 'Tuberculosis02',
        name: '按照要求规则服药的肺结核患者人数'
      },
      {
        code: 'Tuberculosis03',
        name: '年度辖区内已完成治疗的肺结核患者人数'
      }
    ]
  },
  {
    name: '中医药健康管理服务',
    code: 'TCM',
    children: [
      {
        name: '年内辖区内65岁及以上常住居民数',
        code: 'TCM00'
      }
    ]
  },
  {
    code: 'PublicHealthEmergency',
    name: '传染病及突发公共卫生事件报告和处理服务',
    children: [
      {
        code: 'PublicHealthEmergency00',
        name: '登记传染病病例数'
      },
      {
        code: 'PublicHealthEmergency01',
        name: '报告及时的病例数'
      },
      {
        code: 'PublicHealthEmergency02',
        name: '报告的传染病病例数'
      },
      {
        code: 'PublicHealthEmergency03',
        name: '及时报告的突发公共卫生时间相关信息数'
      },
      {
        code: 'PublicHealthEmergency04',
        name: '报告突发公共卫生时间相关信息数'
      }
    ]
  },
  {
    code: 'Supervision',
    name: '卫生计生监督协管服务',
    children: [
      {
        code: 'Supervision00',
        name: '报告的时间或线索次数'
      },
      {
        code: 'Supervision01',
        name: '发现的事件或线索次数'
      },
      {
        code: 'Supervision02',
        name: '协助开展实地巡查次数'
      }
    ]
  }
];

export const BasicTagUsages = {
  DocPeople: 'doc-people',
  OldPeople: 'old-people',
  HypertensionPeople: 'hypertension-people',
  DiabetesPeople: 'diabetes-people'
};

/**
 * 考核指标
 */
export const MarkTags = [
  {
    name: '公卫指标',
    code: 'PublicHealth',
    children: [
      {
        name: '居民健康档案管理服务',
        code: 'document',
        children: [
          {
            code: 'S01',
            name: '建档率',
            enabled: true
          },
          {
            code: 'S23',
            name: '电子档案规范率',
            enabled: true
          },
          {
            code: 'S03',
            name: '健康档案使用率',
            enabled: true
          },
          {
            code: 'S04',
            name: '建立电子健康档案人数',
            enabled: false
          }
        ]
      },
      {
        name: '老年人健康管理服务',
        code: 'old',
        children: [
          {
            code: 'O00',
            name: '老年人健康管理率',
            enabled: true
          },
          {
            code: 'O01',
            name: '老年人体检完整率',
            enabled: true
          },
          {
            code: 'O02',
            name: '老年人中医药健康管理率',
            enabled: true
          },
          {
            code: 'O03',
            name: '年内接受健康管理的老年人人数',
            enabled: false
          },
          {
            code: 'O04',
            name: '老年人中医药健康管理率',
            enabled: false
          }
        ]
      },
      {
        name: '高血压患者健康管理服务',
        code: 'hypertension',
        children: [
          {
            name: '高血压患者管理率',
            code: 'H00',
            enabled: true
          },
          {
            name: '高血压患者规范管理率',
            code: 'H01',
            enabled: true
          },
          {
            name: '高血压患者血压控制率',
            code: 'H02',
            enabled: true
          },
          {
            name: '为机构内初次就诊的35岁以上患者免费测血压',
            code: 'H03',
            enabled: false
          },
          {
            name: '血压异常者应建档案管理',
            code: 'H04',
            enabled: false
          },
          {
            name: '高血压定期年检人数',
            code: 'H05',
            enabled: false
          },
          {
            name: '一年内已管理的高血压患者数',
            code: 'H06',
            enabled: false
          },
          {
            name: '按照规范要求进行高血压患者健康管理的人数',
            code: 'H07',
            enabled: false
          },
          {
            name: '一年内最近一次随访血压达标人数',
            code: 'H08',
            enabled: false
          }
        ]
      },
      {
        name: '2型糖尿病患者健康管理服务',
        code: 'diabetes',
        children: [
          {
            name: '2型糖尿病患者管理率',
            code: 'D00',
            enabled: true
          },
          {
            name: '2型糖尿病患者规范管理率',
            code: 'D01',
            enabled: true
          },
          {
            name: '2型糖尿病患者血压控制率',
            code: 'D02',
            enabled: true
          },
          {
            name: '糖尿病定期年检人数',
            code: 'D03',
            enabled: false
          },
          {
            name: '一年内已管理的2型糖尿病患者数',
            code: 'D04',
            enabled: false
          },
          {
            name: '按照规范要求进行2型糖尿病患者健康管理的人数',
            code: 'D05',
            enabled: false
          },
          {
            name: '一年内最近一次随访空腹血糖达标人数',
            code: 'D06',
            enabled: false
          }
        ]
      },
      {
        name: '预防接种服务',
        code: 'vaccination',
        children: [
          {
            name: '建证率',
            code: 'V01',
            enabled: false
          },
          {
            name: 'xxx疫苗接种率',
            code: 'V02',
            enabled: false
          }
        ]
      },
      {
        name: '0~6岁儿童健康管理服务',
        code: 'childHealth',
        children: [
          {
            name: '新生儿访视率',
            code: 'C01',
            enabled: false
          },
          {
            name: '儿童健康管理率',
            code: 'C02',
            enabled: false
          }
        ]
      },
      {
        name: '孕产妇健康管理服务',
        code: 'maternal',
        children: [
          {
            name: '早孕建册率',
            code: 'M01',
            enabled: false
          },
          {
            name: '产后访视率',
            code: 'M02',
            enabled: false
          }
        ]
      },
      {
        name: '严重精神病障碍患者管理服务',
        code: 'mental',
        children: [
          {
            name: '严重精神病障碍患者规范管理率',
            code: 'M03',
            enabled: false
          }
        ]
      },
      {
        name: '肺结核患者健康管理服务',
        code: 'phthisis',
        children: [
          {
            name: '肺结核患者管理率',
            code: 'P01',
            enabled: false
          },
          {
            name: '肺结核患者规则服药率',
            code: 'P02',
            enabled: false
          }
        ]
      },
      {
        name: '传染病及突发公共卫生事件报告和处理服务',
        code: 'contagion',
        children: [
          {
            name: '传染病疫情报告率',
            code: 'C03',
            enabled: false
          },
          {
            name: '传染病疫情报告及时率',
            code: 'C04',
            enabled: false
          },
          {
            name: '突发公共卫生事件相关信息报告率',
            code: 'C05',
            enabled: false
          }
        ]
      },
      {
        name: '卫生计生监督协管服务',
        code: 'supervise',
        children: [
          {
            name: '卫生计生监督协管信息报告率',
            code: 'S05',
            enabled: false
          }
        ]
      },
      {
        name: '健康教育服务',
        code: 'education',
        children: [
          {
            name: '发放健康教育印刷资料的种类',
            code: 'E01',
            enabled: false
          },
          {
            name: '发放健康教育印刷资料的数量',
            code: 'E02',
            enabled: false
          },
          {
            name: '播放健康教育音像资料的种类',
            code: 'E03',
            enabled: false
          },
          {
            name: '播放健康教育音像资料的次数',
            code: 'E04',
            enabled: false
          },
          {
            name: '播放健康教育音像资料的时间',
            code: 'E05',
            enabled: false
          },
          {
            name: '健康教育宣传栏设置几处',
            code: 'E06',
            enabled: false
          },
          {
            name: '健康教育宣传栏更新情况',
            code: 'E07',
            enabled: false
          },
          {
            name: '健康教育讲座的次数及明细（参加人数等）',
            code: 'E08',
            enabled: false
          },
          {
            name: '健康教育咨询活动的次数及明细（参加人数等）',
            code: 'E09',
            enabled: false
          }
        ]
      }
    ]
  },
  {
    name: '医疗指标',
    code: 'Medical',
    children: [
      {
        name: '家庭医生签约服务',
        code: 'sign',
        children: [
          {
            code: 'SIGN01',
            name: '签约服务覆盖率',
            enabled: false
          },
          {
            code: 'SIGN02',
            name: '重点人群签约服务覆盖率',
            enabled: false
          },
          {
            code: 'SIGN03',
            name: '签约居民续签率',
            enabled: false
          }
        ]
      },
      {
        name: '诊疗人次服务',
        code: 'patient',
        children: [
          {
            code: 'outpatient',
            name: '门诊患者人数'
          },
          {
            code: 'inpatient',
            name: '住院患者人数'
          },
          {
            code: 'diseases',
            name: '就诊病种种类'
          },
          {
            code: 'outpatient-growth',
            name: '同期年度门诊人次增幅'
          }
        ]
      },
      {
        name: '合理用药',
        code: 'drug',
        children: [
          {
            name: '用药不适宜',
            code: 'drug-00'
          },
          {
            name: '静脉输液处方占比',
            code: 'drug-01'
          },
          {
            name: '抗菌药物处方占比',
            code: 'drug-02'
          },
          {
            name: '联合用药抗菌药物处方占比',
            code: 'drug-03'
          },
          {
            name: '门诊处方均次药品费用',
            code: 'drug-04'
          }
        ]
      }
    ]
  },
  {
    name: '定性指标',
    code: 'AttachParent',
    children: [
      {
        name: '定性指标',
        code: 'Attach0',
        children: [
          {
            name: '定性指标',
            code: 'Attach',
            enabled: true
          }
        ]
      }
    ]
  }
];

export const MarkTagUsages = {
  S01: {
    code: 'S01',
    name: '建档率'
  },
  S23: {
    code: 'S23',
    name: '电子档案规范率'
  },
  S03: {
    code: 'S03',
    name: '健康档案使用率'
  },
  O00: {
    code: 'O00',
    name: '老年人健康管理率'
  },
  O01: {
    code: 'O01',
    name: '老年人体检完整率'
  },
  O02: {
    code: 'O02',
    name: '老年人中医药健康管理率'
  },
  H00: {
    code: 'H00',
    name: '高血压患者管理率'
  },
  H01: {
    code: 'H01',
    name: '高血压患者规范管理率'
  },
  H02: {
    code: 'H02',
    name: '高血压患者血压控制率'
  },
  D00: {
    code: 'D00',
    name: '2型糖尿病患者管理率'
  },
  D01: {
    code: 'D01',
    name: '2型糖尿病患者规范管理率'
  },
  D02: {
    code: 'D02',
    name: '2型糖尿病患者血压控制率'
  },
  Attach: {
    name: '定性指标',
    code: 'Attach'
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
  },
  {
    code: 'attach',
    name: '根据附件打分（仅输出结果）'
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
  },
  attach: {
    code: 'attach',
    name: '根据附件打分（仅输出结果）'
  }
};
