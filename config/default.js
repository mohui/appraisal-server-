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
    //     {
    //       path: '/reportCheck',
    //       type: 'local',
    //       options: {
    //         base: '/default',
    //         external: {
    //           baseUrl: 'http://127.0.0.1:3000',
    //           prefix: '/default',
    //           key: 'default'
    //         }
    //       }
    //     }
  ]
};
