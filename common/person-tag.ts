/***
 * 人群分类的标记
 */
export const personTags = {
  C00: {label: '普通居民', type: true},
  C01: {label: '老年人', type: true},
  C02: {label: '高血压', type: true},
  C03: {label: '糖尿病', type: true},
  C04: {label: '孕产妇', type: true},
  C05: {label: '0~6岁儿童', type: true},
  C06: {label: '脑卒中', type: true},
  C07: {label: '计划生育特殊家庭对象', type: true},
  C08: {label: '严重精神病', type: true},
  C09: {label: '肺结核患者', type: true},
  C10: {label: '残疾人', type: true},
  C11: {label: '其他慢病', type: true},
  C13: {label: '高危人群', type: true},
  C14: {label: '高校', type: true}
};
/***
 * 人群分类的选项框options
 */
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
  },
  {
    id: 'C06',
    name: personTags.C06.label,
    type: true
  },
  {
    id: 'C07',
    name: personTags.C07.label,
    type: true
  },
  {
    id: 'C08',
    name: personTags.C08.label,
    type: true
  },
  {
    id: 'C09',
    name: personTags.C09.label,
    type: true
  },
  {
    id: 'C10',
    name: personTags.C10.label,
    type: true
  },
  {
    id: 'C11',
    name: personTags.C11.label,
    type: true
  },
  {
    id: 'C13',
    name: personTags.C13.label,
    type: true
  },
  {
    id: 'C14',
    name: personTags.C14.label,
    type: true
  }
];

/**
 * 档案问题的标记文案
 */
export const documentTags = {
  S03(value) {
    return {
      label: `${value ? '' : '非'}动态使用`,
      type: !!value
    };
  },
  S23(value) {
    return {
      label: `个人基本信息填写${value ? '' : '不'}规范`,
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
  },
  E00: {label: '人群标记错误', type: false}
};

/**
 * 用于档案问题选项框的options
 */
export const documentTagList = [
  {
    id: 'S03',
    name: '非动态使用'
  },
  {
    id: 'S23',
    name: '个人基本信息填写不规范'
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
  },
  {
    id: 'E00',
    name: documentTags.E00.label
  }
];

/**
 * 返回标记
 */
export function getTagsList(it) {
  it.tags = [];
  it.personTags = [];
  //重点人群
  if (it.C00) it.personTags.push(personTags.C00);
  if (it.C01) it.personTags.push(personTags.C01);
  if (it.C02) it.personTags.push(personTags.C02);
  if (it.C03) it.personTags.push(personTags.C03);
  if (it.C04) it.personTags.push(personTags.C04);
  if (it.C05) it.personTags.push(personTags.C05);
  if (it.C06) it.personTags.push(personTags.C06);
  if (it.C07) it.personTags.push(personTags.C07);
  if (it.C08) it.personTags.push(personTags.C08);
  if (it.C09) it.personTags.push(personTags.C09);
  if (it.C10) it.personTags.push(personTags.C10);
  if (it.C11) it.personTags.push(personTags.C11);
  if (it.C13) it.personTags.push(personTags.C13);
  if (it.C14) it.personTags.push(personTags.C14);
  // 健康档案标记
  if (it.S03 !== null) it.tags.push(documentTags.S03(it.S03));
  if (it.S23 !== null) it.tags.push(documentTags.S23(it.S23));
  // 人群标记错误
  if (it.E00) it.tags.push(documentTags.E00);
  // 老年人标记
  if (it.O00 !== null) it.tags.push(documentTags.O00(it.O00));
  if (it.O01 !== null) it.tags.push(documentTags.O01(it.O01));
  if (it.O02 !== null) it.tags.push(documentTags.O02(it.O02));
  // 高血压标记
  if (it.H01 !== null) it.tags.push(documentTags.H01(it.H01));
  if (it.H02 !== null) it.tags.push(documentTags.H02(it.H02));
  // 糖尿病标记
  if (it.D01 !== null) it.tags.push(documentTags.D01(it.D01));
  if (it.D02 !== null) it.tags.push(documentTags.D02(it.D02));
  return it;
}
