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
    sign: 'show',
    icon: require('../../assets/menu-icon/check.png').default,
    iconActive: require('../../assets/menu-icon/check-active.png').default,
    children: [
      {
        index: 'appraisal-result',
        permission: [Permission.APPRAISAL_RESULT],
        router: '/appraisal-result',
        sign: 'show',
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
      },
      {
        index: 'hospital',
        permission: [Permission.HOSPITAL],
        router: '/hospital',
        label: '金额列表'
      },
      {
        index: 'score',
        permission: [Permission.SCORE],
        router: '/score',
        label: '推荐工分值'
      }
    ]
  },
  {
    index: 'person',
    permission: [Permission.PROFILE],
    label: '个人档案',
    sign: 'show',
    icon: require('../../assets/menu-icon/person.png').default,
    iconActive: require('../../assets/menu-icon/person-active.png').default,
    router: '/person'
  },
  {
    index: 'userManage',
    permission: [Permission.USER_INDEX, Permission.ROLE_INDEX],
    label: '用户管理',
    icon: require('../../assets/menu-icon/staff.png').default,
    iconActive: require('../../assets/menu-icon/staff-active.png').default,
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
    index: 'audit-log',
    permission: [Permission.AUDIT_LOG],
    label: '操作日志',
    icon: require('../../assets/menu-icon/opertion.png').default,
    iconActive: require('../../assets/menu-icon/operation-active.png').default,
    router: '/audit-log'
  },
  {
    index: 'guidelines',
    permission: [Permission.GUIDELINES],
    label: '医学指南',
    icon: require('../../assets/menu-icon/guide.png').default,
    iconActive: require('../../assets/menu-icon/guide-active.png').default,
    router: '/guidelines'
  },
  {
    index: 'medical-performance',
    permission: [Permission.MEDICAL_PERFORMANCE],
    label: '医疗绩效',
    sign: 'show',
    icon: require('../../assets/menu-icon/performance.png').default,
    iconActive: require('../../assets/menu-icon/performance-active.png')
      .default,
    router: '/medical-performance'
  },
  {
    index: 'medical-configuration',
    permission: [
      Permission.MEDICAL_CONFIGURATION_LIST,
      Permission.MEDICAL_CONFIGURATION_WORK
    ],
    label: '医疗绩效配置',
    icon: require('../../assets/menu-icon/config.png').default,
    iconActive: require('../../assets/menu-icon/config-active.png').default,
    children: [
      {
        index: 'medical-configuration',
        permission: [Permission.MEDICAL_CONFIGURATION_LIST],
        router: '/medical-configuration',
        label: '工分项管理'
      },
      {
        index: 'medical-configuration-work',
        permission: [Permission.MEDICAL_CONFIGURATION_WORK],
        router: '/medical-configuration-work',
        label: '工分项设置'
      },
      {
        index: 'medical-configuration-member-his',
        permission: [Permission.MEDICAL_CONFIGURATION_MEMBER_HIS],
        router: '/medical-configuration-member-his',
        label: '员工管理'
      }
    ]
  },
  {
    index: 'manual',
    permission: [Permission.MEDICAL_MANUAL],
    label: '手工数据维护',
    icon: require('../../assets/menu-icon/manual.png').default,
    iconActive: require('../../assets/menu-icon/manual-active.png').default,
    router: '/manual'
  },
  {
    index: 'plan',
    permission: [Permission.MEDICAL_PLAN],
    label: '医疗考核方案',
    icon: require('../../assets/menu-icon/plan.png').default,
    iconActive: require('../../assets/menu-icon/plan-active.png').default,
    router: '/plan'
  },
  {
    index: 'work',
    permission: [Permission.MEDICAL_WORK],
    label: '医疗工作列表',
    icon: require('../../assets/menu-icon/worklist.png').default,
    iconActive: require('../../assets/menu-icon/worklist-active.png').default,
    router: '/work'
  }
];
