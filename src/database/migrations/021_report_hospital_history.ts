import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class ReportHospitalHistoryMigration implements IMigration {
  name = '机构数据的历史记录表';
  version = 21;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "report_hospital_history" (
            "date" VARCHAR(255),
            "hospital" UUID NOT NULL REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE ,
            "score" FLOAT,
            "totalScore" FLOAT,
            "rate" FLOAT,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
             PRIMARY KEY ("date","hospital"));
          COMMENT ON COLUMN "report_hospital_history"."date" IS '日期';
          COMMENT ON COLUMN "report_hospital_history"."hospital" IS '机构id';
          COMMENT ON COLUMN "report_hospital_history"."score" IS '得分';
          COMMENT ON COLUMN "report_hospital_history"."totalScore" IS '满分';
          COMMENT ON COLUMN "report_hospital_history"."rate" IS '质量系数'
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      DROP TABLE IF EXISTS "report_hospital_history";
    `);
  }
}
