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
    name: '根据件打分（仅输出结果）'
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
    name: '根据件打分（仅输出结果）'
  }
};
