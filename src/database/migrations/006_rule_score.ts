import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RuleScoreMigration implements IMigration {
  name = '考核得分表结构初始化';
  version = 6;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "rule_hospital"
      (
        "rule"       UUID                     NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE, -- 考核细则id
        "hospital"   UUID                     NOT NULL REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,        -- 机构id
        "auto"       BOOLEAN DEFAULT true,                                                                                        -- 是否自动打分, 默认是
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("rule", hospital)
      );
      COMMENT ON COLUMN "rule_hospital"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_hospital"."hospital" IS '机构';
      COMMENT ON COLUMN "rule_hospital"."auto" IS '是否自动打分, 默认是';

      CREATE TABLE IF NOT EXISTS "rule_tag"
      (
        "id"         UUID,                                                                                                        -- 主键id
        "rule"       UUID                     NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE, -- 考核细则id
        "tag"        VARCHAR(255)             NOT NULL,                                                                           -- 考核指标
        "algorithm"  VARCHAR(255)             NOT NULL,                                                                           -- 计算方式
        "baseline"   FLOAT,                                                                                                       -- 参考值; 个别计算方式, 需要参考值
        "score"      FLOAT                    NOT NULL,                                                                           -- 分值
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "rule_tag"."id" IS '主键id';
      COMMENT ON COLUMN "rule_tag"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_tag"."tag" IS '考核指标';
      COMMENT ON COLUMN "rule_tag"."algorithm" IS '计算方式';
      COMMENT ON COLUMN "rule_tag"."baseline" IS '参考值; 个别计算方式, 需要参考值';
      COMMENT ON COLUMN "rule_tag"."score" IS '分值';

      CREATE TABLE IF NOT EXISTS "rule_hospital_score"
      (
        "id"         UUID,                                                                                                        -- 主键id
        "rule"       UUID                     NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE, -- 考核细则id
        "hospital"   UUID                     NOT NULL REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,        -- 机构id
        "score"      FLOAT                    NOT NULL,                                                                           -- 得分
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "rule_hospital_score"."id" IS '主键id';
      COMMENT ON COLUMN "rule_hospital_score"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_hospital_score"."hospital" IS '机构id';
      COMMENT ON COLUMN "rule_hospital_score"."score" IS '得分'
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    await client.execute(`
      DROP TABLE IF EXISTS "rule_hospital";
      DROP TABLE IF EXISTS "Rule_tag";
      DROP TABLE IF EXISTS "rule_hospital_score";
    `);
  }
}
