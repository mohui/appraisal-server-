import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class CheckSystemMigration implements IMigration {
  name = '考核体系表初始化';
  version = 2;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "check_system"
      (
        "check_id"            UUID,
        "check_name"          VARCHAR(255),
        "total"         INTEGER,
        "province_code" VARCHAR(50),
        "province_name" VARCHAR(50),
        "city_code"     VARCHAR(50),
        "city_name"     VARCHAR(50),
        "district_code" VARCHAR(50),
        "district_name" VARCHAR(50),
        "create_by"     VARCHAR(50),
        "update_by"     VARCHAR(50),
        "check_year"    VARCHAR(50),
        "status"        VARCHAR(50),
        "remarks"       VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        PRIMARY KEY ("check_id")
      );
      COMMENT ON COLUMN "check_system"."check_id" IS '主键id';
      COMMENT ON COLUMN "check_system"."check_name" IS '考核体系名称';
      COMMENT ON COLUMN "check_system"."total" IS '满分，细则修改后更新';
      COMMENT ON COLUMN "check_system"."province_code" IS '省编码';
      COMMENT ON COLUMN "check_system"."province_name" IS '省名称';
      COMMENT ON COLUMN "check_system"."city_code" IS '市编码';
      COMMENT ON COLUMN "check_system"."city_name" IS '市名称';
      COMMENT ON COLUMN "check_system"."district_code" IS '区编码';
      COMMENT ON COLUMN "check_system"."district_name" IS '区名称';
      COMMENT ON COLUMN "check_system"."create_by" IS '创建人';
      COMMENT ON COLUMN "check_system"."update_by" IS '修改人';
      COMMENT ON COLUMN "check_system"."check_year" IS '考核年度';
      COMMENT ON COLUMN "check_system"."status" IS '状态';
      COMMENT ON COLUMN "check_system"."remarks" IS '备注';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      DROP TABLE IF EXISTS "check_system";
    `);
  }
}
