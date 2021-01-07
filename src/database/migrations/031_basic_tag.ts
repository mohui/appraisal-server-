import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class BasicTagAddYearMigration implements IMigration {
  name = '基础数据添加年份字段';
  version = 31;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(
      `
        alter table basic_tag_data drop column if exists year;
        update basic_tag_data set year = 2020 where year is null;
      `
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
