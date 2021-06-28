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
  etl: {
    dialect: 'mssql',
    host: 'localhost',
    port: '123456',
    username: 'root',
    password: 'root',
    database: 'appraisal-etl',
    dialectOptions: {
      options: {
        useUTC: false,
        requestTimeout: 300000
      }
    },
    logging: false,
    timezone: '+8:00'
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
  // 定时任务
  queue: {
    cron: '00 00 04 * * *'
  },
  oss: {
    accessKeyId: '',
    accessKeySecret: '',
    region: '',
    bucket: ''
  },
  report: {
    prefix: '' // 报告存储key的前缀
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
    // }
  ],
  // etl检查任务的配置
  checkETL: {
    cron: '00 00 07 * * *',
    email: {
      // 发件人配置
      sender: {
        host: '',
        port: '',
        email: '',
        password: ''
      },
      // 收件人配置
      receivers: ['']
    }
  },
  // 生成公卫报告定时任务
  generate: {
    cron: ''
  }
};
