import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class GroupMigration implements IMigration {
  name = '分层考核';
  version = 27;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "group"
      (
        "code"       VARCHAR(36) PRIMARY KEY,
        "name"       VARCHAR(255),
        "parent"     VARCHAR(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      COMMENT ON COLUMN "group"."code" IS '主键id';
      COMMENT ON COLUMN "group"."name" IS '节点名';
      COMMENT ON COLUMN "group"."parent" IS '父节点id';
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
