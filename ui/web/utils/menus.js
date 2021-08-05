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
    icon: 'el-icon-data-analysis',
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
    icon: 'el-icon-edit',
    router: '/person'
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
    index: 'etl-hospital',
    permission: [Permission.ETL_HOSPITAL],
    label: '机构同步',
    icon: 'el-icon-refresh',
    router: '/etl'
  },
  {
    index: 'audit-log',
    permission: [Permission.AUDIT_LOG],
    label: '操作日志',
    icon: 'el-icon-refresh',
    router: '/audit-log'
  },
  {
    index: 'guidelines',
    permission: [Permission.GUIDELINES],
    label: '医学指南',
    icon: 'el-icon-guide',
    router: '/guidelines'
  },
  {
    index: 'medical-performance',
    permission: [Permission.MEDICAL_PERFORMANCE],
    label: '医疗绩效',
    sign: 'show',
    icon: 'el-icon-s-data',
    router: '/medical-performance'
  },
  {
    index: 'medical-configuration',
    permission: [
      Permission.MEDICAL_CONFIGURATION_LIST,
      Permission.MEDICAL_CONFIGURATION_WORK
    ],
    label: '医疗绩效配置',
    icon: 'el-icon-data-line',
    children: [
      {
        index: 'medical-configuration',
        permission: [Permission.MEDICAL_CONFIGURATION_LIST],
        router: '/medical-configuration',
        label: '工作量管理'
      },
      {
        index: 'medical-configuration-work',
        permission: [Permission.MEDICAL_CONFIGURATION_WORK],
        router: '/medical-configuration-work',
        label: '工分项管理'
      },
      {
        index: 'medical-configuration-member-his',
        permission: [Permission.MEDICAL_CONFIGURATION_MEMBER_HIS],
        router: '/medical-configuration-member-his',
        label: '员工管理'
      },
      {
        index: 'medical-configuration-department',
        permission: [Permission.MEDICAL_CONFIGURATION_DEPARTMENT],
        router: '/medical-configuration-department',
        label: '科室管理'
      }
    ]
  },
  {
    index: 'manual',
    permission: [Permission.MEDICAL_MANUAL],
    label: '手工数据维护',
    icon: 'el-icon-notebook-1',
    router: '/manual'
  },
  {
    index: 'plan',
    permission: [Permission.MEDICAL_PLAN],
    label: '医疗考核方案',
    icon: 'el-icon-setting',
    router: '/plan'
  },
  {
    index: 'work',
    permission: [Permission.MEDICAL_WORK],
    label: '医疗工作列表',
    icon: 'el-icon-notebook-2',
    router: '/work'
  }
];
