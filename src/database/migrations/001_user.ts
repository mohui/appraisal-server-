import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UserMigration implements IMigration {
  name = '用户,角色,权限表结构初始化';
  version = 1;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "user"
      (
        "id"         UUID,
        "account"    VARCHAR(255) UNIQUE,
        "name"       VARCHAR(255),
        "password"   VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "user"."id" IS '主键id';
      COMMENT ON COLUMN "user"."account" IS '登录名';
      COMMENT ON COLUMN "user"."name" IS '用户名';
      COMMENT ON COLUMN "user"."password" IS '密码';

      CREATE TABLE IF NOT EXISTS "role"
      (
        "id"          UUID,
        "name"        VARCHAR(255) UNIQUE,
        "permissions" VARCHAR(255)[],
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "role"."id" IS '主键id';
      COMMENT ON COLUMN "role"."name" IS '角色名';
      COMMENT ON COLUMN "role"."permissions" IS '权限数组';

      CREATE TABLE IF NOT EXISTS "user_role_mapping"
      (
        "user_id"    UUID                     NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "role_id"    UUID                     NOT NULL REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        UNIQUE ("user_id", "role_id"),
        PRIMARY KEY ("user_id", "role_id")
      );
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      DROP TABLE IF EXISTS "user_role_mapping";
      DROP TABLE IF EXISTS "role";
      DROP TABLE IF EXISTS "user";
    `);
  }
}
