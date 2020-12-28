import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class ScoreRemarkHistoryMigration implements IMigration {
  name = '手动打分备注和历史';
  version = 27;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      ` CREATE TABLE IF NOT EXISTS "score_remark_history"
        (
          "id" UUID,
          "rule"       UUID                     NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE,
          "code"       varchar(36)              NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
          "score"      FLOAT        DEFAULT 0,
          "remark"     VARCHAR(255) DEFAULT '',
          "creator"    UUID REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          PRIMARY KEY ("id")
        );
      COMMENT ON COLUMN "score_remark_history"."rule" IS '考核小项id';
      COMMENT ON COLUMN "score_remark_history"."code" IS '被打分的地区或机构';
      COMMENT ON COLUMN "score_remark_history"."score" IS '手动打分分数';
      COMMENT ON COLUMN "score_remark_history"."remark" IS '备注信息';
      COMMENT ON COLUMN "score_remark_history"."creator" IS '打分者';
      COMMENT ON COLUMN "score_remark_history"."created_at" IS '创建时间';
      COMMENT ON COLUMN "score_remark_history"."updated_at" IS '更新时间';
      `
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`DROP TABLE IF EXISTS "score_remark_history";`);
  }
}
