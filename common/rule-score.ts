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
  }
];

export const BasicTagUsages = {
  DocPeople: 'doc-people'
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
            name: '建档率'
          },
          {
            code: 'S23',
            name: '电子档案规范率'
          },
          {
            code: 'S03',
            name: '健康档案使用率'
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
