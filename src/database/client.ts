import {Sequelize} from 'sequelize-typescript';
import {TransactionContext} from './tx';

export interface ExtendedSequelize extends Sequelize {
  tx<T>(actions: () => PromiseLike<T>): Promise<T>;

  joinTx<T>(actions: () => PromiseLike<T>): Promise<T>;

  execute(sql: string, ...params: any[]): Promise<any[]>;

  page(
    sql: string,
    pageNo: number,
    pageSize: number,
    ...params: any[]
  ): Promise<{data: any[]; rows: number; pages: number}>;

  count(sql: string, ...params: any[]): Promise<number>;
}

export function createExtendedSequelize(s: Sequelize): ExtendedSequelize {
  const es = s as ExtendedSequelize;
  es.tx = function(actions: () => Promise<any>) {
    const tx = new TransactionContext(this, false);
    return tx.do(actions);
  };
  es.joinTx = function(actions: () => Promise<any>) {
    const tx = new TransactionContext(this);
    return tx.do(actions);
  };
  es.execute = async function(sql: string, ...params: any[]) {
    return (await this.query(sql, {replacements: params}))[0];
  };
  es.page = async function(
    sql: string,
    pageNo: number,
    pageSize: number,
    ...params: any[]
  ) {
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

    let pageResult = [];
    let pages = 0;

    //如果有结果(行数大于0),请求具体数据
    if (rows > 0) {
      const pageSql = `${sql} limit ${pageSize} offset ${(pageNo - 1) *
        pageSize}`;
      pageResult = await this.execute(pageSql, ...params);
      pages = Math.ceil(rows / pageSize);
    }

    return {
      data: pageResult,
      rows,
      pages
    };
  };
  es.count = async function(sql: string, ...params: any[]) {
    sql = sql.trim();
    if (sql[sql.length - 1] === ';') sql = sql.substring(0, sql.length - 1);

    const countSql = `select count(*) as rows from (${sql}) as counted`;
    const countResult = await this.execute(countSql, ...params);
    return Number(countResult[0]['rows']);
  };

  return es;
}
