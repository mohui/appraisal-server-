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
    key: 'hospital',
    name: '金额列表'
  },
  {
    key: 'score',
    name: '推荐工分值'
  },
  {
    key: 'check-add',
    name: '新建规则'
  },
  {
    key: 'check-update',
    name: '修改规则'
  },
  {
    key: 'check-select-hospital',
    name: '配置机构'
  },
  {
    key: 'check-clone',
    name: '快速复制'
  },
  {
    key: 'check-import',
    name: '批量导入细则'
  },
  {
    key: 'check-open-grade',
    name: '全部开启打分'
  },
  {
    key: 'check-close-grade',
    name: '全部关闭打分'
  },
  {
    key: 'check-remove',
    name: '删除规则'
  },
  {
    key: 'rule-add',
    name: '新建细则'
  },
  {
    key: 'rule-update',
    name: '修改规则'
  },
  {
    key: 'rule-remove',
    name: '删除规则'
  },
  {
    key: 'profile',
    name: '个人档案'
  },
  {
    key: 'all-check',
    name: '管理所有考核'
  },
  {
    key: 'super-admin',
    name: '超级管理'
  },
  {
    key: 'tags-detail',
    name: '档案指标详情'
  },
  {
    key: 'person-excel',
    name: '档案详情导出'
  },
  {
    key: 'audit-log',
    name: '操作日志'
  },
  {
    key: 'ai',
    name: 'AI预测'
  },
  {
    key: 'guidelines',
    name: '医学指南'
  },
  {
    key: 'medical-configuration-list',
    name: '医疗绩效配置列表'
  },
  {
    key: 'medical-configuration-work',
    name: '工分项设置'
  },
  {
    key: 'medical-configuration-member',
    name: '员工配置'
  },
  {
    key: 'medical-configuration-member-his',
    name: '员工管理'
  },
  {
    key: 'medical-performance',
    name: '医疗绩效'
  },
  {
    key: 'medical-manual',
    name: '手工数据维护'
  },
  {
    key: 'medical-plan',
    name: '医疗考核方案'
  },
  {
    key: 'medical-work',
    name: '医疗工作列表'
  },
  {
    key: 'staff-binding-approval',
    name: '员工绑定审核'
  },
  {
    key: 'medical-configuration-department',
    name: '科室管理'
  },
  {
    key: 'news-index',
    name: '新闻资讯库'
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
  HOSPITAL: 'hospital',
  SCORE: 'score',
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
  PROFILE: 'profile',
  ALL_CHECK: 'all-check',
  SUPER_ADMIN: 'super-admin',
  TAGS_DETAIL: 'tags-detail',
  PERSON_EXCEL: 'person-excel',
  AUDIT_LOG: 'audit-log',
  AI: 'ai',
  GUIDELINES: 'guidelines',
  MEDICAL_CONFIGURATION_LIST: 'medical-configuration-list',
  MEDICAL_CONFIGURATION_WORK: 'medical-configuration-work',
  MEDICAL_CONFIGURATION_MEMBER_HIS: 'medical-configuration-member-his',
  MEDICAL_PERFORMANCE: 'medical-performance',
  MEDICAL_MANUAL: 'medical-manual',
  MEDICAL_PLAN: 'medical-plan',
  MEDICAL_WORK: 'medical-work',
  STAFF_BINDING_APPROVAL: 'staff-binding-approval',
  MEDICAL_CONFIGURATION_DEPARTMENT: 'medical-configuration-department',
  NEWS_INDEX: 'news-index'
};
export const PermissionTree = [
  {
    key: Permission.SUPER_ADMIN,
    label: '超级管理'
  },
  {
    key: Permission.HOME,
    label: '首页'
  },
  {
    key: Permission.APPRAISAL_RESULT,
    label: '绩效考核',
    children: [
      {
        key: Permission.APPRAISAL_RESULT,
        label: '考核结果'
      },
      {
        key: Permission.APPRAISAL_CONFIGURATION_MANAGEMENT,
        label: '配置管理',
        children: [
          {
            key: Permission.APPRAISAL_CONFIGURATION_MANAGEMENT,
            label: '配置管理首页'
          },
          {
            key: Permission.ALL_CHECK,
            label: '管理所有考核'
          },
          {
            key: 'check-index',
            label: '规则管理',
            children: [
              {
                key: Permission.CHECK_ADD,
                label: '新建规则'
              },
              {
                key: Permission.CHECK_UPDATE,
                label: '修改规则'
              },
              {
                key: Permission.CHECK_SELECT_HOSPITAL,
                label: '配置机构'
              },
              {
                key: Permission.CHECK_CLONE,
                label: '快速复制'
              },
              {
                key: Permission.CHECK_IMPORT,
                label: '批量导入细则'
              },
              {
                key: Permission.CHECK_OPEN_GRADE,
                label: '全部开启打分'
              },
              {
                key: Permission.CHECK_CLOSE_GRADE,
                label: '全部关闭打分'
              },
              {
                key: Permission.CHECK_REMOVE,
                label: '删除规则'
              }
            ]
          },
          {
            key: 'rule-index',
            label: '细则管理',
            children: [
              {
                key: Permission.RULE_ADD,
                label: '新建细则'
              },
              {
                key: Permission.RULE_UPDATE,
                label: '修改规则'
              },
              {
                key: Permission.RULE_REMOVE,
                label: '删除规则'
              }
            ]
          }
        ]
      },
      {
        key: Permission.APPRAISAL_BASIC_DATA,
        label: '基础数据'
      },
      {
        key: Permission.HOSPITAL,
        label: '金额列表'
      },
      {
        key: Permission.SCORE,
        label: '推荐工分值'
      }
    ]
  },
  {
    key: 'profile-index',
    label: '个人档案',
    children: [
      {
        key: Permission.PROFILE,
        label: '个人档案首页'
      },
      {
        key: Permission.TAGS_DETAIL,
        label: '档案指标详情'
      },
      {
        key: Permission.PERSON_EXCEL,
        label: '档案表格导出'
      }
    ]
  },
  {
    key: Permission.USER_INDEX,
    label: '用户管理',
    children: [
      {
        key: Permission.USER_INDEX,
        label: '用户列表',
        children: [
          {
            key: Permission.USER_ADD,
            label: '用户添加'
          },
          {
            key: Permission.USER_UPDATE,
            label: '用户更新'
          },
          {
            key: Permission.USER_REMOVE,
            label: '用户删除'
          }
        ]
      },
      {
        key: Permission.ROLE_INDEX,
        label: '角色管理'
      }
    ]
  },
  {
    key: Permission.AUDIT_LOG,
    label: '操作日志'
  },
  {
    key: Permission.AI,
    label: 'ai预测'
  },
  {
    key: Permission.GUIDELINES,
    label: '医学指南'
  },
  {
    key: Permission.MEDICAL_PERFORMANCE,
    label: '医疗绩效'
  },
  {
    key: 'medical-configuration',
    label: '医疗绩效配置',
    children: [
      {
        key: Permission.MEDICAL_CONFIGURATION_LIST,
        label: '工分项管理'
      },
      {
        key: Permission.MEDICAL_CONFIGURATION_WORK,
        label: '工分项设置'
      }
    ]
  },
  {
    key: Permission.MEDICAL_MANUAL,
    label: '手工数据维护'
  },
  {
    key: Permission.MEDICAL_PLAN,
    label: '医疗考核方案'
  },
  {
    key: Permission.MEDICAL_WORK,
    label: '医疗工作列表'
  },
  {
    key: Permission.MEDICAL_CONFIGURATION_MEMBER_HIS,
    label: '员工管理',
    children: [
      {
        key: Permission.MEDICAL_CONFIGURATION_MEMBER_HIS,
        label: '员工列表',
        children: [
          {
            key: Permission.MEDICAL_CONFIGURATION_DEPARTMENT,
            label: '科室管理'
          }
        ]
      },
      {
        key: Permission.STAFF_BINDING_APPROVAL,
        label: '员工绑定审核'
      }
    ]
  },
  {
    key: Permission.NEWS_INDEX,
    label: '新闻资讯库'
  }
];
export function getPermission(key) {
  return PermissionDetail.find(p => p.key === key);
}
