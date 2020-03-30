import {OkPacket, PoolConnection, RowDataPacket} from "mysql2/promise";
import * as config from 'config';
import {Context} from "kato-server";

//调试输出器
const debug = require('debug')('knrt:mysql:client');

//定义执行结果
export type MySQLResult = RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[] | any;

//MySQL客户端
export class MySQLConnection {
  constructor(private connection: PoolConnection) {
  }

  async execute(sql, ...params): Promise<MySQLResult> {
    //增加数组参数的判断,execute(`sql query`, 1, 2, 3) 等价 execute(`sql query`, [ 1, 2, 3])
    if (params.length === 1 && params[0] instanceof Array)
      params = [...params[0]];

    debug('SQLQuery:', sql);
    debug('SQLParams:', params);
    // 传参校验
    params = params.map(item => (item === undefined ? null : item));
    let [rows] = await this.connection.execute(sql, params);
    return rows;
  }

  async query(sql, ...params): Promise<MySQLResult> {
    //增加数组参数的判断,execute(`sql query`, 1, 2, 3) 等价 execute(`sql query`, [ 1, 2, 3])
    if (params.length === 1 && params[0] instanceof Array)
      params = [...params[0]];
    debug('SQLQuery:', sql);
    debug('SQLParams:', params);
    // 传参校验
    params = params.map(item => (item === undefined ? null : item));
    return await this.connection.query(sql, params);
  }

  async beginTransaction() {
    return this.connection.beginTransaction();
  }

  async commit() {
    return this.connection.commit();
  }

  async rollback() {
    return this.connection.rollback();
  }

  release() {
    this.connection.release();
  }
}
