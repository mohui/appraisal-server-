module.exports = {
  // api: "http://localhost:3000", // 使用dev:web时的后端服务地址
  host: '0.0.0.0',
  port: 3000,
  postgres: {
    host: 'localhost',
    port: '123456',
    username: 'root',
    password: 'root',
    database: 'appraisal-dev'
  },
  etl: {
    host: '192.168.2.248',
    port: '123456',
    username: 'root',
    password: 'root',
    database: 'appraisal-etl'
  },
  oss: {
    accessKeyId: '',
    accessKeySecret: '',
    region: '',
    bucket: ''
  }
};
