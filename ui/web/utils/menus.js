module.exports = [
  {
    index: 'home',
    router: '/home',
    label: '首页',
    icon: 'el-icon-s-home'
  },
  {
    index: 'test',
    label: '测试页',
    icon: 'el-icon-edit',
    children: [
      {
        index: 'test',
        router: '/test',
        label: '子测试页',
        icon: 'el-icon-user'
      }
    ]
  },
  {
    index: 'userManage',
    label: '用户管理',
    icon: 'el-icon-user',
    children: [
      {
        index: 'user',
        router: '/user',
        label: '用户列表',
        icon: 'el-icon-user-solid'
      },
      {
        index: 'role',
        router: '/role',
        label: '角色管理',
        icon: 'el-icon-user'
      }
    ]
  },
  {
    index: 'performance-appraisal',
    label: '绩效考核',
    icon: 'el-icon-data-analysis',
    children: [
      {
        index: 'appraisal-indicators',
        router: '/appraisal-indicators',
        label: '考核指标'
      },
      {
        index: 'new-appraisal-indicators',
        router: '/new-appraisal-indicators',
        label: 'New考核指标'
      }
    ]
  }
];
