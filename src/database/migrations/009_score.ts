import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class ScoreMigration implements IMigration {
  name = '考核打分相关表结构';
  version = 9;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      CREATE TABLE IF NOT EXISTS mark_hospital
      (
        "hospital"   UUID REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "S00"        INTEGER                  DEFAULT 0,
        "S23"        INTEGER                  DEFAULT 0,
        "S03"        INTEGER                  DEFAULT 0,
        PRIMARY KEY ("hospital")
      );
      COMMENT ON COLUMN mark_hospital."hospital" IS '机构';
      COMMENT ON COLUMN mark_hospital."S00" IS '健康档案总数';
      COMMENT ON COLUMN mark_hospital."S23" IS '健康档案规范数';
      COMMENT ON COLUMN mark_hospital."S03" IS '健康档案使用数';

      CREATE TABLE IF NOT EXISTS "report_hospital"
      (
        "hospital"   UUID REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "workpoints" INTEGER                  DEFAULT 0,
        "scores"     FLOAT                    DEFAULT 0,
        PRIMARY KEY ("hospital")
      );
      COMMENT ON COLUMN "report_hospital"."hospital" IS '机构';
      COMMENT ON COLUMN "report_hospital"."workpoints" IS '工分';
      COMMENT ON COLUMN "report_hospital"."score" IS '得分';
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      DROP TABLE IF EXISTS "mark_hospital";
      DROP TABLE IF EXISTS "report_hospital";
    `);
  }
}
