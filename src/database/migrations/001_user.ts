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
        "id"         UUID,
        "name"       VARCHAR(255) UNIQUE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "role"."id" IS '主键id';
      COMMENT ON COLUMN "role"."name" IS '角色名';

      CREATE TABLE IF NOT EXISTS "user_role"
      (
        "user_id"    UUID                     NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "role_id"    UUID                     NOT NULL REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        UNIQUE ("user_id", "role_id"),
        PRIMARY KEY ("user_id", "role_id")
      );

       CREATE TABLE IF NOT EXISTS "permission"
      (
        "id"         UUID,
        "type"       VARCHAR(255) UNIQUE,
        "name"       VARCHAR(255) UNIQUE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "permission"."id" IS '主键id';
      COMMENT ON COLUMN "permission"."type" IS '权限类型';
      COMMENT ON COLUMN "permission"."name" IS '权限名';

      CREATE TABLE IF NOT EXISTS "role_permission"
      (
        "role_id"          UUID                     NOT NULL REFERENCES "role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "permission_id"    UUID                     NOT NULL REFERENCES "permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        UNIQUE ("role_id", "permission_id"),
        PRIMARY KEY ("role_id", "permission_id")
      );
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      DROP TABLE IF EXISTS "user_role";
      DROP TABLE IF EXISTS "role_permission";
      DROP TABLE IF EXISTS "role";
      DROP TABLE IF EXISTS "user";
      DROP TABLE IF EXISTS "permission";
    `);
  }
}
