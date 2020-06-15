const Permission = require('../../../common/permission.ts').Permission;

module.exports = [
  {
    index: 'performance-appraisal',
    permission: [
      Permission.APPRAISAL_RESULT,
      Permission.APPRAISAL_CONFIGURATION_MANAGEMENT,
      Permission.APPRAISAL_BASIC_DATA
    ],
    label: '绩效考核',
    icon: 'el-icon-data-analysis',
    children: [
      {
        index: 'appraisal-result-institutions',
        permission: [Permission.APPRAISAL_RESULT],
        router: '/appraisal-result-institutions',
        label: '考核结果'
      },
      {
        index: 'check',
        permission: [Permission.APPRAISAL_CONFIGURATION_MANAGEMENT],
        router: '/check',
        label: '配置管理'
      },
      {
        index: 'basic-data',
        permission: [Permission.APPRAISAL_BASIC_DATA],
        router: '/basic-data',
        label: '基础数据'
      }
    ]
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
        label: '用户列表'
      },
      {
        index: 'role',
        permission: [Permission.ROLE_INDEX],
        router: '/role',
        label: '角色管理'
      }
    ]
  },
  {
    index: 'person',
    permission: [Permission.PROFILE],
    label: '个人档案',
    icon: 'el-icon-edit',
    router: '/person'
  }
];
