import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UpdateNewsUuid implements IMigration {
  name = '修改varchar字段格式为uuid';
  version = 61;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      alter table news
        alter column published_by drop default;
      ALTER TABLE news
        ALTER COLUMN "created_by" TYPE uuid USING "created_by"::uuid,
        ALTER COLUMN "updated_by" TYPE uuid USING "updated_by"::uuid,
        ALTER COLUMN "published_by" TYPE uuid USING "published_by"::uuid;
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
