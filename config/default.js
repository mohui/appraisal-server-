module.exports = {
  // api: "http://localhost:3000", // 使用dev:web时的后端服务地址
  host: '0.0.0.0',
  port: 3000,
  data: {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'root',
    database: 'data_34_2016',
    decimalNumbers: true,
    multipleStatements: true
  },
  knrt: {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'root',
    database: 'knrt',
    decimalNumbers: true,
    multipleStatements: true
  },
  intl: {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'root',
    database: 'ht_intl',
    decimalNumbers: true,
    multipleStatements: true
  },
  publicHealth: {
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: 'root',
    database: 'publichealth',
    decimalNumbers: true,
    multipleStatements: true
  },
  postgres: {
    host: '192.168.2.248',
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
  }
};
