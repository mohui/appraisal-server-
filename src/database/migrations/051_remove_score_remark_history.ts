import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RemoveScoreRemarkHistoryMigration implements IMigration {
  name = '删除无用的score_remark_history表';
  version = 51;

  async up(client: ExtendedSequelize): Promise<void> {
    //该表已经在28迁移任务里被manual_score_history代替了
    await client.execute(`drop table if exists score_remark_history`);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
