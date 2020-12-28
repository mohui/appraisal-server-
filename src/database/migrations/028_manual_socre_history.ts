import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class ManualScoreHistoryMigration implements IMigration {
  name = '手动打分备注和历史';
  version = 28;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      ` CREATE TABLE IF NOT EXISTS "manual_score_history"
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
      `
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`DROP TABLE IF EXISTS "score_remark_history";`);
  }
}
