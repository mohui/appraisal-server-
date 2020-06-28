import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class BasicTagValueMigration implements IMigration {
  name = '基础数据值改为Float类型';
  version = 14;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALter TABLE basic_tag_data ALTER COLUMN value TYPE FLOAT;
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
