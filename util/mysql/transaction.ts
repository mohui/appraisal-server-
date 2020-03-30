import getLogger from 'debug';
import {createContext} from "conctx";
import {v4 as uuid} from 'uuid'

import {MySQLConnection} from "./connection";
import {MySQL} from "./client";

//事务的上下文
const context = createContext();

//上下文中的事务连接存储键
const txSymbol = Symbol('context:tx');

//事务类
export class Transaction {
  public txId = uuid().replace(/\-/g, '');

  private simpleTxId = this.txId.substring(0, 4);
  private parent?: Transaction;
  private connection?: MySQLConnection;
  private savePoint = `sp${this.txId}`;
  private isTopLevelTx = false;
  private txStack: string[];
  private log = getLogger(`knrt:mysql:tx:${this.simpleTxId}`);

  constructor(private mysql: MySQL, private join = true) {
  }

  public async do(actions: (MySQLConnection) => Promise<any>): Promise<any> {
    //初始化
    await this.init();

    //把当前事务加入到异步上下文中
    if (context.current[txSymbol]) {
      console.log(`tx:同一个异步节点出现两次异步事件`);
    }
    context.current[txSymbol] = this;
    this.log(`当前事务上下文 ROOT->${this.txContextPath().map(it => it.toString()).join('->')}`);

    //添加开始事务堆栈
    this.topTx.txStack.push(`+${this.toString()}`);
    this.log(`当前事务堆栈: [${this.topTx.txStack.join(',')}]`);

    //启动事务
    await this.begin();
    this.log('事务开始');

    try {
      //执行语句
      const result = await actions(this.connection);
      await this.commit();
      this.log('事务提交完成');
      return result;
    } catch (e) {
      await this.rollback();
      this.log(`事务回滚完成,因为事务出现异常[${e.message}]`);
      throw e;
    } finally {
      if (this.isTopLevelTx) {
        //释放连接
        this.connection.release();
      }

      //清除上下文中的事务存储
      if (context[txSymbol].txId !== this.txId)
        console.error('tx:清除到了不属于自己的上下文');

      //防止过早清除不属于自己的上下文节点,尤其是顶级事务节点
      if (!context[txSymbol].isTopLevelTx || this.isTopLevelTx)
        context[txSymbol] = undefined;
      else
        console.error('tx:非顶级节点企图删除顶级节点上下文');

      //添加完成事务堆栈
      this.topTx.txStack.push(`-${this.toString()}`);
      this.log(`当前事务堆栈: [${this.topTx.txStack.join(',')}]`);
      this.log(`事务完成,剩余事务上下文 ROOT->${this.txContextPath().map(it => it.toString()).join('->')}`);
    }
  }

  private async init() {
    if (this.join && context[txSymbol]) {
      this.isTopLevelTx = false;

      const parent = context[txSymbol] as Transaction;
      this.connection = parent.connection;
      this.parent = parent;
      this.log(`事务初始化完成,加入${parent.toString()}`);
    } else {
      this.isTopLevelTx = true;
      this.txStack = [];
      this.connection = await this.mysql.getConnection();
      this.log(`事务初始化完成${this.join ? ',没有找到上层事务,该事务是新建的' : ''}`);
    }
  }

  private async begin() {
    if (this.isTopLevelTx) {
      await this.connection.beginTransaction();
    } else {
      // language=MySQL
      // @ts-ignore
      await this.connection.query(`savepoint ${this.savePoint}`)
    }
  }

  private async commit() {
    if (this.isTopLevelTx) {
      //判断事务的嵌套顺序,保证不要出现堆叠效果
      //如果出现了堆叠效果直接抛出异常,保证整个事务的回滚
      const stack = [...this.topTx.txStack];
      const tempStack = [];
      stack.forEach((it: string) => {
        if (it.startsWith('+')) {
          tempStack.push(it);
        } else {
          if (tempStack.pop() !== `+${it.substring(1, it.length)}`) {
            throw new Error('事务嵌套错误,请不要并行传递事务,以免出现堆叠嵌套');
          }
        }
      });
      if (tempStack.length > 0) {
        if (tempStack.length > 1 || tempStack[0] !== `+${this.toString()}`)
          throw new Error('事务嵌套错误,还有嵌套事务没有退出,请不要并行传递事务,以免出现堆叠嵌套');
      }

      await this.connection.commit();
    } else {
      try {
        // language=MySQL
        // @ts-ignore
        await this.connection.query(`release
          savepoint ${this.savePoint}`)
      } catch (e) {
        console.error('提交嵌套事务时出现错误,', e.message)
      }
    }
  }

  private async rollback() {
    if (this.isTopLevelTx) {
      await this.connection.rollback();
    } else {
      try {
        // language=MySQL
        // @ts-ignore
        await this.connection.query(`rollback
          to ${this.savePoint}`)
      } catch (e) {
        console.error('回滚嵌套事务时出现错误,', e.message)
      }
    }
  }

  get topTx() {
    let current: Transaction = this;
    while (current.parent) {
      current = current.parent;
    }
    return current;
  }

  public toString() {
    return `TX:${this.simpleTxId}`
  }

  public txContextPath() {
    return context.all[txSymbol].reverse();
  }
}
