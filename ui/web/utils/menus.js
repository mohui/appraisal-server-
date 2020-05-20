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
  }
];
