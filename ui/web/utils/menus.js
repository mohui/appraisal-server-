const Permission = require('../../../common/permission.ts').Permission;

module.exports = [
  {
    index: 'home',
    permission: [Permission.HOME],
    router: '/home',
    label: '首页',
    icon: 'el-icon-s-home'
  },
  {
    index: 'userManage',
    permission: [Permission.USER_INDEX, Permission.ROLE_INDEX],
    label: '用户管理',
    icon: 'el-icon-user',
    children: [
      {
        index: 'user',
        permission: [Permission.USER_INDEX],
        router: '/user',
        label: '用户列表',
        icon: 'el-icon-user-solid'
      },
      {
        index: 'role',
        permission: [Permission.ROLE_INDEX],
        router: '/role',
        label: '角色管理',
        icon: 'el-icon-user'
      }
    ]
  },
  {
    index: 'performance-appraisal',
    permission: [Permission.APPRAISAL],
    label: '绩效考核',
    icon: 'el-icon-data-analysis',
    children: [
      {
        index: 'appraisal-indicators',
        router: '/appraisal-indicators',
        label: '考核指标'
      },
      {
        index: 'check',
        router: '/check',
        label: '配置管理',
        icon: 'el-icon-setting'
      },
      {
        index: 'basic-data',
        router: '/basic-data',
        label: '基础数据',
        icon: 'el-icon-coin'
      }
    ]
  },
  {
    index: 'person',
    label: '个人档案',
    icon: 'el-icon-edit',
    router: '/person'
  }
];
