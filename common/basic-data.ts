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
