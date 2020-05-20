import {v4 as uuid} from 'uuid';
import {context} from './index';
import {Transaction} from 'sequelize';
import {ExtendedSequelize} from './client';

export class TransactionContext {
  private isTopLevelTx = false;
  private savePointName = 'sp' + uuid().replace(/-/g, '');
  private nativeTx: Transaction;

  constructor(private client: ExtendedSequelize, private join = true) {}

  async do(actions: () => Promise<any>): Promise<any> {
    return context.runAndReturn(async () => {
      //初始化
      await this.init();
      //开启事务
      await this.begin();

      try {
        //执行实际的操作
        const result = await actions();
        //提交事务
        await this.commit();
        return result;
      } catch (e) {
        await this.rollback();
        throw e;
      }
    });
  }

  private async init() {
    if (this.join && context.get('transaction')) {
      //上层的tx存在,则不需要新建tx
      this.nativeTx = context.get('transaction');
      this.isTopLevelTx = false;
    } else {
      //不需要加入上层的tx,或者上层的tx不存在,则新建一个tx
      this.nativeTx = await this.client.transaction();
      //把新的transaction加入到cls中
      context.set('transaction', this.nativeTx);
      this.isTopLevelTx = true;
    }
  }

  private async begin() {
    //如果不是顶层tx,则需要手动开启savepoint
    if (!this.isTopLevelTx)
      await this.client.query(`SAVEPOINT ${this.savePointName};`);
  }

  private async commit() {
    if (this.isTopLevelTx)
      //如果是顶层tx,则提交它
      await this.nativeTx.commit();
    //如果不是顶层,则删除前面的savepoint就OK了
    else await this.client.query(`RELEASE SAVEPOINT ${this.savePointName};`);
  }

  private async rollback() {
    if (this.isTopLevelTx)
      //如果是顶层的tx,则回滚
      await this.nativeTx.rollback();
    //如果不是顶层的,只需要回滚到对应的savepoint就OK了
    else await this.client.query(`ROLLBACK TO ${this.savePointName};`);
  }
}
