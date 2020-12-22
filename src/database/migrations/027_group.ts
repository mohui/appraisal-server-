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


      CREATE TABLE IF NOT EXISTS "check_group" --考核地区表
      (
        "check_system" UUID        NOT NULL REFERENCES "check_system" ("check_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "group"   VARCHAR(36) NOT NULL REFERENCES "group" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("check_system", "group")
      );
      COMMENT ON COLUMN "check_group"."check_system" IS '考核id';
      COMMENT ON COLUMN "check_group"."group" IS '地区id';

      insert into "check_group"(
        select h.check_system,h.hospital, h.created_at, h.updated_at from "check_hospital"  h
        left join check_system s on h.check_system = s.check_id
        where s.check_type = 1);
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
