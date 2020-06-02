import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class TagEditorMigration implements IMigration {
  name = "基础数据表添加'修改人'字段";
  version = 8;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
        ALTER TABLE "basic_tag_data" ADD column IF NOT EXISTS editor varchar(50);
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
