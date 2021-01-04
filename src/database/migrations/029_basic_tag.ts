import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class BasicTagDelYearMigration implements IMigration {
  name = '基础数据删除年份字段';
  version = 29;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(
      `alter table basic_tag_data drop column if exists year;`
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
