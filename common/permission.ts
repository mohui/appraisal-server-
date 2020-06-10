export const PermissionDetail = [
  {
    key: 'home',
    name: '首页'
  },
  {
    key: 'user-index',
    name: '用户首页'
  },
  {
    key: 'user-add',
    name: '用户添加'
  },
  {
    key: 'user-update',
    name: '用户更新'
  },
  {
    key: 'user-remove',
    name: '用户删除'
  },
  {
    key: 'role-index',
    name: '角色首页'
  },
  {
    key: 'appraisal-result',
    name: '考核结果'
  },
  {
    key: 'appraisal-configuration-management',
    name: '配置管理'
  },
  {
    key: 'appraisal-basic-data',
    name: '基础数据'
  },
  {
    key: 'check-add',
    label: '新建规则'
  },
  {
    key: 'check-update',
    label: '修改规则'
  },
  {
    key: 'check-select-hospital',
    label: '配置机构'
  },
  {
    key: 'check-clone',
    label: '快速复制'
  },
  {
    key: 'check-import',
    label: '批量导入细则'
  },
  {
    key: 'check-open-grade',
    label: '全部开启打分'
  },
  {
    key: 'check-close-grade',
    label: '全部关闭打分'
  },
  {
    key: 'check-remove',
    label: '删除规则'
  },
  {
    key: 'rule-add',
    label: '新建细则'
  },
  {
    key: 'rule-update',
    label: '修改规则'
  },
  {
    key: 'rule-remove',
    label: '删除规则'
  },
  {
    key: 'profile',
    name: '个人档案'
  }
];

export const Permission = {
  HOME: 'home',
  USER_INDEX: 'user-index',
  USER_ADD: 'user-add',
  USER_UPDATE: 'user-update',
  USER_REMOVE: 'user-remove',
  ROLE_INDEX: 'role-index',
  APPRAISAL_RESULT: 'appraisal-result',
  APPRAISAL_CONFIGURATION_MANAGEMENT: 'appraisal-configuration-management',
  APPRAISAL_BASIC_DATA: 'appraisal-basic-data',
  CHECK_ADD: 'check-add',
  CHECK_UPDATE: 'check-update',
  CHECK_SELECT_HOSPITAL: 'check-select-hospital',
  CHECK_CLONE: 'check-clone',
  CHECK_IMPORT: 'check-import',
  CHECK_OPEN_GRADE: 'check-open-grade',
  CHECK_CLOSE_GRADE: 'check-close-grade',
  CHECK_REMOVE: 'check-remove',
  RULE_ADD: 'rule-add',
  RULE_UPDATE: 'rule-update',
  RULE_REMOVE: 'rule-remove',
  PROFILE: 'profile'
};

export function getPermission(key) {
  return PermissionDetail.find(p => p.key === key);
}
