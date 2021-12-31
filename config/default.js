module.exports = {
  // api: "http://localhost:3000", // 使用dev:web时的后端服务地址
  host: '0.0.0.0',
  port: 3000,
  postgres: {
    dialect: 'postgres',
    host: 'localhost',
    port: '123456',
    username: 'root',
    password: 'root',
    database: 'appraisal-dev',
    define: {
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    timezone: '+8:00',
    logging: false
  },
  original: {
    dialect: 'postgres',
    host: 'localhost',
    port: '123456',
    username: 'root',
    password: 'root',
    database: 'appraisal-dev',
    define: {
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    timezone: '+8:00',
    logging: false
  },
  mapping: {
    dialect: 'postgres',
    host: 'localhost',
    port: '123456',
    username: 'root',
    password: 'root',
    database: 'mapping',
    define: {
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    timezone: '+8:00',
    logging: false
  },
  // 定时任务
  queue: {
    cron: '00 00 04 * * *',
    his: '' // 医疗绩效打分任务的cron配置
  },
  unifs: [
    // {
    //   path: '/reportCheck',
    //   type: 'local',
    //   options: {
    //     base: '/default',
    //     external: {
    //       baseUrl: 'http://127.0.0.1:3000',
    //       prefix: '/default',
    //       key: 'default'
    //     }
    //   }
    // },
    // {
    //   path: '/attach',
    //   type: 'oss',
    //   options: {
    //     accessKey: '',
    //     secretKey: '',
    //     region: 'oss-cn-shanghai',
    //     bucket: 'knrt-doctor-app'
    //   }
    // },
    // {
    //   path: '/personExcel',
    //   type: 'local',
    //   options: {
    //     base: '/local',
    //     external: {
    //       baseUrl: 'http://127.0.0.1:3000',
    //       prefix: '/personExcel',
    //       key: '1234'
    //     }
    //   }
    // },
    // {
    //   path: '/vouchers',
    //   type: 'local',
    //   options: {
    //     base: '/vouchers',
    //     external: {
    //       baseUrl: 'http://127.0.0.1:3000',
    //       prefix: '/vouchers',
    //       key: 'default'
    //     }
    //   }
    // },
    // {
    //   path: '/report', // 公卫报告地址
    //   type: 'oss',
    //   options: {
    //     accessKey: '',
    //     secretKey: '',
    //     region: 'oss-cn-shanghai',
    //     bucket: 'knrt-doctor-app'
    //   },
    // {
    //   path: '/guidelines', // 医学指南地址
    //   type: 'local',
    //   options: {
    //     base: '/guidelines',
    //     external: {
    //       baseUrl: 'http://127.0.0.1:3000',
    //       prefix: '/guidelines',
    //       key: 'default'
    //     }
    //   }
    // },
    // 医疗绩效手工数据附件
    // {
    //   path: '/his/manual',
    //   type: 'local',
    //   options: {
    //     // 本机存储路径
    //     base: '/tmp/his',
    //     external: {
    //       baseUrl: 'http://127.0.0.1:3000',
    //       prefix: '/his/manual',
    //       key: ''
    //     }
    //   }
    // }
  ],
  // 生成公卫报告定时任务
  generate: {
    cron: ''
  },
  //短信服务
  sms: {
    enabled: false, //是否启用
    key: '', //短信服务key
    secret: '', //短信服务secret
    //过期策略
    expired: {
      value: 2,
      unit: 'h'
    },
    //每日限额
    limit: 3
  }
};
