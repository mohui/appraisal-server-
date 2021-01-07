import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class BasicTagAddYearMigration implements IMigration {
  name = '基础数据添加年份字段同时将考核体系的年份字段修正为int';
  version = 31;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(
      `
        alter table basic_tag_data drop column if exists year;
        update basic_tag_data set year = 2020 where year is null;
        alter table check_system alter column check_year type integer using (check_year::integer);
      `
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
