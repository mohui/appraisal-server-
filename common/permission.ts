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
    key: 'appraisal',
    name: '绩效考核'
  }
];

export const Permission = {
  HOME: 'home',
  USER_INDEX: 'user-index',
  USER_ADD: 'user-add',
  USER_UPDATE: 'user-update',
  USER_REMOVE: 'user-remove',
  ROLE_INDEX: 'role-index',
  APPRAISAL: 'appraisal'
};

export function getPermission(key) {
  return PermissionDetail.find(p => p.key === key);
}
