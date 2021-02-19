import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RuleDetailsMigration implements IMigration {
  name = '地区细则得分表添加指标解释数组字段';
  version = 30;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(
      `alter table rule_area_score add column if not exists details varchar(255)[];`
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
