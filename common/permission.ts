export const Permission = {
  HOME: {
    key: 'home',
    name: '首页'
  },
  USER_INDEX: {
    key: 'user-index',
    group: 'user',
    name: '用户首页'
  },
  USER_ADD: {
    key: 'user-add',
    group: 'user',
    name: '用户添加'
  },
  USER_UPDATE: {
    key: 'user-update',
    group: 'user',
    name: '用户更新'
  },
  USER_REMOVE: {
    key: 'user-remove',
    group: 'user',
    name: '用户删除'
  },
  ROLE_INDEX: {
    key: 'role-index',
    name: '角色管理'
  }
};

export const PermissionArray = Object.values(Permission);
