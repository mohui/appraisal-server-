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

      CREATE TABLE IF NOT EXISTS "check_rule"
      (
        "rule_id"           UUID,
        "check_id"          UUID REFERENCES "check_system" ("check_id") ON DELETE SET NULL ON UPDATE CASCADE,
        "parent_rule_id"    VARCHAR(50),
        "rule_name"         VARCHAR(255),
        "rule_score"        INTEGER,
        "check_standard"    VARCHAR(50),
        "check_method"      VARCHAR(50),
        "evaluate_standard" VARCHAR(50),
        "create_by"         VARCHAR(50),
        "update_by"         VARCHAR(50),
        "status"            VARCHAR(50),
        "standard_ids"      VARCHAR(255)[],
        "standard_names"    VARCHAR(255)[] ,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        PRIMARY KEY ("rule_id")
      );
      COMMENT ON COLUMN "check_rule"."rule_id" IS '规则主键id';
      COMMENT ON COLUMN "check_rule"."check_id" IS '考核体系id';
      COMMENT ON COLUMN "check_rule"."parent_rule_id" IS '父规则id';
      COMMENT ON COLUMN "check_rule"."rule_name" IS '规则名称';
      COMMENT ON COLUMN "check_rule"."rule_score" IS '得分';
      COMMENT ON COLUMN "check_rule"."check_standard" IS '考核标准';
      COMMENT ON COLUMN "check_rule"."check_method" IS '考核方法';
      COMMENT ON COLUMN "check_rule"."evaluate_standard" IS '评分标准';
      COMMENT ON COLUMN "check_rule"."create_by" IS '创建人';
      COMMENT ON COLUMN "check_rule"."update_by" IS '修改人';
      COMMENT ON COLUMN "check_rule"."status" IS '状态';
      COMMENT ON COLUMN "check_rule"."standard_ids" IS '关联指标Id';
      COMMENT ON COLUMN "check_rule"."standard_names" IS '关联的指标名称';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      DROP TABLE IF EXISTS "check_system";
      DROP TABLE IF EXISTS "check_rule";
    `);
  }
}
