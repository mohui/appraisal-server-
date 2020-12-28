import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class GroupMigration implements IMigration {
  name = '分层考核';
  version = 28;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "group"
      (
        "code"       VARCHAR(36) PRIMARY KEY,
        "name"       VARCHAR(255),
        "parent"     VARCHAR(36),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      COMMENT ON COLUMN "group"."code" IS '主键id';
      COMMENT ON COLUMN "group"."name" IS '节点名';
      COMMENT ON COLUMN "group"."parent" IS '父节点id';


      CREATE TABLE IF NOT EXISTS "area"
      (
        "code"       VARCHAR(36) PRIMARY KEY,
        "name"       VARCHAR(255),
        "parent"     VARCHAR(36),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      COMMENT ON COLUMN "area"."code" IS '主键id';
      COMMENT ON COLUMN "area"."name" IS '节点名';
      COMMENT ON COLUMN "area"."parent" IS '父节点id';

      CREATE TABLE IF NOT EXISTS "check_area" --考核地区表
      (
        "check_system" UUID                                               NOT NULL REFERENCES "check_system" ("check_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "area"         VARCHAR(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "created_at"   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at"   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("check_system", "area")
      );
      COMMENT ON COLUMN "check_area"."check_system" IS '考核id';
      COMMENT ON COLUMN "check_area"."area" IS '地区id';

      insert into "check_area"(
        select h.check_system, h.hospital, h.created_at, h.updated_at
        from "check_hospital" h
               left join check_system s on h.check_system = s.check_id
        where s.check_type = 1);

-- 考核细则附件表, 用于存储定性指标上传的附件
      CREATE TABLE IF NOT EXISTS "rule_area_attach"
      (
        "id"         VARCHAR(36) primary key,
        rule         UUID                                               NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE, -- 考核细则id
        area         VARCHAR(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        name         VARCHAR(255)                                       NOT NULL,
        url          VARCHAR(255)                                       NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      COMMENT ON COLUMN "rule_area_attach"."id" IS '主键id';
      COMMENT ON COLUMN "rule_area_attach"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_area_attach"."area" IS '地区编码';
      COMMENT ON COLUMN "rule_area_attach"."name" IS '附件中文名';
      COMMENT ON COLUMN "rule_area_attach"."url" IS '附件URL地址';
      COMMENT ON COLUMN "rule_area_attach"."updated_at" IS '更新时间';

      CREATE TABLE IF NOT EXISTS "rule_area_score" -- 地区得分表
      (
        "rule"       UUID                                               NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE, -- 考核细则id
        "area"       VARCHAR(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,          -- 地区编码
        "score"      FLOAT                                              NOT NULL,                                                                           -- 得分
        "auto"       BOOLEAN                  DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("rule", "area")
      );
      COMMENT ON COLUMN "rule_area_score"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_area_score"."area" IS '地区编码';
      COMMENT ON COLUMN "rule_area_score"."score" IS '得分';
      COMMENT ON COLUMN "rule_area_score"."auto" IS '是否自动打分, 默认是';



      CREATE TABLE IF NOT EXISTS "rule_area_budget" -- 地区金额分配表
      (
        "rule"             UUID                                               NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "area"             VARCHAR(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "budget"           DECIMAL(15, 4)           DEFAULT 0,
        "workPoint"        FLOAT                    DEFAULT 0,
        "correctWorkPoint" FLOAT                    DEFAULT 0,
        "score"            FLOAT                    DEFAULT 0,
        "totalScore"       FLOAT                    DEFAULT 0,
        "rate"             FLOAT                    DEFAULT 0,
        "created_at"       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at"       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
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
        "budget"         DECIMAL(15, 4)           DEFAULT 0,
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
      COMMENT ON COLUMN "report_area"."budget" IS '分配金额';

      CREATE TABLE IF NOT EXISTS "report_area_history"
      (
        "date"           DATE,
        "check"          UUID REFERENCES "check_system" ("check_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "area"           VARCHAR(36) REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "rate"           FLOAT                    DEFAULT 0,
        "totalWorkPoint" FLOAT                    DEFAULT 0,
        "workPoint"      FLOAT                    DEFAULT 0,
        "score"          FLOAT                    DEFAULT 0,
        "budget"         DECIMAL(15, 4)           DEFAULT 0,
        "created_at"     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at"     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("date", "area", "check")
      );
      COMMENT ON COLUMN "report_area_history"."date" IS '日期';
      COMMENT ON COLUMN "report_area_history"."check" IS '考核id';
      COMMENT ON COLUMN "report_area_history"."area" IS '地区id';
      COMMENT ON COLUMN "report_area_history"."rate" IS '质量系数';
      COMMENT ON COLUMN "report_area_history"."totalWorkPoint" IS '校正前工分';
      COMMENT ON COLUMN "report_area_history"."workPoint" IS '参与校正工分';
      COMMENT ON COLUMN "report_area_history"."score" IS '得分';
      COMMENT ON COLUMN "report_area_history"."budget" IS '分配金额';

      --手动打分备注和历史表
      CREATE TABLE IF NOT EXISTS "manual_score_history"
      (
        "id"         UUID,
        "rule"       UUID                     NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "code"       varchar(36)              NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "score"      FLOAT        DEFAULT 0,
        "remark"     VARCHAR(255) DEFAULT '',
        "creator"    UUID REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "manual_score_history"."rule" IS '考核小项id';
      COMMENT ON COLUMN "manual_score_history"."code" IS '地区code或者机构id';
      COMMENT ON COLUMN "manual_score_history"."score" IS '手动打分分数';
      COMMENT ON COLUMN "manual_score_history"."remark" IS '备注信息';
      COMMENT ON COLUMN "manual_score_history"."creator" IS '打分者';
      COMMENT ON COLUMN "manual_score_history"."created_at" IS '创建时间';
      COMMENT ON COLUMN "manual_score_history"."updated_at" IS '更新时间';

    `);
    // 处理数据

    //1. 删除临时考核及相关数据
    // check_system(考核体系表)
    // check_rule(考核规则表)
    // rule_tag(考核细则关联关系表)
    // rule_project(考核小项绑定工分表)
    // check_hospital(考核体系绑定机构表)
    // rule_hospital(考核细则绑定机构表)
    // rule_hospital_attach(考核细则机构附件表)
    // rule_hospital_score(考核细则机构得分表)
    // rule_hospital_budget(考核小项机构金额表)
    // report_hospital(考核机构报告表)
    // report_hospital_history(考核机构报告表)
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
