import {createPool, Pool, PoolOptions} from 'mysql2/promise';
import {MySQLConnection, MySQLResult} from './connection';
import {Transaction} from './transaction';
import Decimal from 'decimal.js';

//MySQL连接池
export class MySQL {
  private readonly pool: Pool;

  constructor(config: PoolOptions) {
    this.pool = createPool(config);
  }

  async getConnection() {
    return new MySQLConnection(await this.pool.getConnection());
  }

  //直接获取连接,并执行语句,然后返回结果
  async execute(sql, ...params): Promise<MySQLResult> {
    const connection = await this.getConnection();
    try {
      return await connection.execute(sql, ...params);
    } finally {
      connection.release();
    }
  }

  //分页助手方法
  async count(sql: string, ...params) {
    sql = sql.trim();
    if (sql[sql.length - 1] === ';') sql = sql.substring(0, sql.length - 1);

    //优化sql中可能带order的情况
    const lastOrderByIndex = sql.toLowerCase().lastIndexOf('order by');
    let lastOrderByParamsNum = 0;
    if (lastOrderByIndex >= 0) {
      //提取出最后一个order by之后的sql片段
      const orderByStatement = sql.substring(lastOrderByIndex);
      //通过括号匹配来判断这个order by片段是不是最后一个独立的order by
      const chars = orderByStatement.split('');
      const isValid =
        chars.filter(c => c === '(').length ===
        chars.filter(c => c === ')').length;
      //如果是,则把这个order by从sql中去掉
      if (isValid) {
        sql = sql.replace(orderByStatement, '');
        lastOrderByParamsNum = orderByStatement.split('?').length - 1;
      }
    }

    // 删除 order by 后参数
    if (params.length === 1 && params[0] instanceof Array)
      params = [...params[0]];
    params = params.slice(0, params.length - lastOrderByParamsNum);

    const countSql = `select count(*) as rows from (${sql}) as counted`;
    const countResult = await this.execute(countSql, ...params);
    return countResult[0]['rows'];
  }

  //分页助手方法
  async page(sql: string, pageNo: number, pageSize: number, ...params) {
    if (typeof pageNo !== 'number' || !/^[1-9]\d*/.test(pageNo.toString())) {
      throw new Error('pageNo：必须是大于0的整数！');
    }
    if (
      typeof pageSize !== 'number' ||
      !/^[1-9]\d*/.test(pageSize.toString())
    ) {
      throw new Error('pageSize：必须是大于0的整数！');
    }

    sql = sql.trim();
    if (sql[sql.length - 1] === ';') sql = sql.substring(0, sql.length - 1);

    //拿到数据的总行数
    const rows = await this.count(sql, ...params);

    let pageResult: MySQLResult = [];
    let pages = 0;

    //如果有结果(行数大于0),请求具体数据
    if (rows > 0) {
      const pageSql = `${sql} limit ${(pageNo - 1) * pageSize},${pageSize}`;
      pageResult = await this.execute(pageSql, ...params);
      pages = Math.ceil(
        new Decimal(rows).div(new Decimal(pageSize)).toNumber()
      );
    }

    return {
      data: pageResult,
      rows,
      pages
    };
  }

  //新建一个事务,然后执行actions函数,最后做事务的提交和回滚
  async tx(actions: (MySQLConnection) => any): Promise<any> {
    //创建新的独立事务
    const tx = new Transaction(this, false);
    return await tx.do(actions);
  }

  //如果上层有事务,则使用上层的事务执行actions中的内容
  async jointx(actions: (MySQLConnection) => any): Promise<any> {
    //创建一个事务,并加入到上层事务中去
    const tx = new Transaction(this);
    return await tx.do(actions);
  }
}
