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


      CREATE TABLE IF NOT EXISTS "area"
      (
        "code"       VARCHAR(36) PRIMARY KEY,
        "name"       VARCHAR(255),
        "parent"     VARCHAR(36),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      COMMENT ON COLUMN "area"."code" IS '主键id';
      COMMENT ON COLUMN "area"."name" IS '节点名';
      COMMENT ON COLUMN "area"."parent" IS '父节点id';

      CREATE TABLE IF NOT EXISTS "check_area" --考核地区表
      (
        "check_system" UUID                     NOT NULL REFERENCES "check_system" ("check_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "area"         VARCHAR(36)              NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("check_system", "area")
      );
      COMMENT ON COLUMN "check_area"."check_system" IS '考核id';
      COMMENT ON COLUMN "check_area"."area" IS '地区id';

      insert into "check_area"(
        select h.check_system, h.hospital, h.created_at, h.updated_at
        from "check_hospital" h
               left join check_system s on h.check_system = s.check_id
        where s.check_type = 1);

      CREATE TABLE IF NOT EXISTS "rule_area_score" -- 地区得分表
      (
        "rule"       UUID                     NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE, -- 考核细则id
        "area"       VARCHAR(36)              NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,          -- 地区编码
        "score"      FLOAT                    NOT NULL,                                                                           -- 得分
        "auto"       BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("rule", "area")
      );
      COMMENT ON COLUMN "rule_area_score"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_area_score"."area" IS '地区编码';
      COMMENT ON COLUMN "rule_area_score"."score" IS '得分';
      COMMENT ON COLUMN "rule_area_score"."auto" IS '是否自动打分, 默认是';



      CREATE TABLE IF NOT EXISTS "rule_area_budget" -- 地区金额分配表
      (
        "rule"             UUID                     NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "area"             VARCHAR(36)              NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "budget"           DECIMAL(15, 4) DEFAULT 0,
        "workPoint"        FLOAT          DEFAULT 0,
        "correctWorkPoint" FLOAT          DEFAULT 0,
        "score"            FLOAT          DEFAULT 0,
        "totalScore"       FLOAT          DEFAULT 0,
        "rate"             FLOAT          DEFAULT 0,
        "created_at"       TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at"       TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("rule", "area")
      );
      COMMENT ON COLUMN "rule_area_budget"."rule" IS '考核小项id';
      COMMENT ON COLUMN "rule_area_budget"."area" IS '地区id';
      COMMENT ON COLUMN "rule_area_budget"."budget" IS '分配金额';
      COMMENT ON COLUMN "rule_area_budget"."workPoint" IS '校正前工分';
      COMMENT ON COLUMN "rule_area_budget"."correctWorkPoint" IS '校正后工分';
      COMMENT ON COLUMN "rule_area_budget"."score" IS '得分';
      COMMENT ON COLUMN "rule_area_budget"."totalScore" IS '总分';
      COMMENT ON COLUMN "rule_area_budget"."rate" IS '质量系数';

      CREATE TABLE IF NOT EXISTS "report_area"
      (
        "check"          UUID REFERENCES "check_system" ("check_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "area"           VARCHAR(36) REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "totalWorkPoint" FLOAT                    DEFAULT 0,
        "workPoint"      FLOAT                    DEFAULT 0,
        "score"          FLOAT                    DEFAULT 0,
        "rate"           FLOAT                    DEFAULT 0,
        "created_at"     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at"     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("area", "check")
      );
      COMMENT ON COLUMN "report_area"."check" IS '考核id';
      COMMENT ON COLUMN "report_area"."area" IS '地区id';
      COMMENT ON COLUMN "report_area"."totalWorkPoint" IS '校正前工分';
      COMMENT ON COLUMN "report_area"."workPoint" IS '参与校正工分';
      COMMENT ON COLUMN "report_area"."score" IS '得分';
      COMMENT ON COLUMN "report_area"."rate" IS '质量系数';
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
