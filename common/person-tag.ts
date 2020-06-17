export const personTags = {
  C00: {label: '普通居民', type: true},
  C01: {label: '老年人', type: true},
  C02: {label: '高血压', type: true},
  C03: {label: '糖尿病', type: true},
  C04: {label: '孕产妇', type: true},
  C05: {label: '0~6岁儿童', type: true}
};
export const personTagList = [
  {
    id: 'C00',
    name: personTags.C00.label,
    type: true
  },
  {
    id: 'C01',
    name: personTags.C01.label,
    type: true
  },
  {
    id: 'C02',
    name: personTags.C02.label,
    type: true
  },
  {
    id: 'C03',
    name: personTags.C03.label,
    type: true
  },
  {
    id: 'C04',
    name: personTags.C04.label,
    type: true
  },
  {
    id: 'C05',
    name: personTags.C05.label,
    type: true
  }
];
export const documentTags = {
  S03(value) {
    return {
      label: `${value ? '' : '非'}动态使用`,
      type: !!value
    };
  },
  S23(value) {
    return {
      label: `档案${value ? '' : '不'}规范`,
      type: !!value
    };
  },
  O00(value) {
    return {
      label: `老年人健康管理${value ? '' : '不'}规范`,
      type: !!value
    };
  },
  O01(value) {
    return {
      label: `老年人体检${value ? '' : '不'}完整`,
      type: !!value
    };
  },
  O02(value) {
    return {
      label: `${value ? '' : '无'}老年人中医药管理`,
      type: !!value
    };
  },
  H01(value) {
    return {
      label: `高血压管理${value ? '' : '不'}规范`,
      type: !!value
    };
  },
  H02(value) {
    return {
      label: `高血压${value ? '已' : '未'}控制`,
      type: !!value
    };
  },
  D01(value) {
    return {
      label: `糖尿病管理${value ? '' : '不'}规范`,
      type: !!value
    };
  },
  D02(value) {
    return {
      label: `糖尿病${value ? '已' : '未'}控制`,
      type: !!value
    };
  }
};
export const documentTagList = [
  {
    id: 'S03',
    name: '非动态使用'
  },
  {
    id: 'S23',
    name: '档案不规范'
  },
  {
    id: 'O00',
    name: '老年人健康管理不规范'
  },
  {
    id: 'O01',
    name: '老年人体检不完整'
  },
  {
    id: 'O02',
    name: '无老年人中医药管理'
  },
  {
    id: 'H01',
    name: '高血压管理不规范'
  },
  {
    id: 'H02',
    name: '高血压未控制'
  },
  {
    id: 'D01',
    name: '糖尿病管理不规范'
  },
  {
    id: 'D02',
    name: '糖尿病未控制'
  }
];
