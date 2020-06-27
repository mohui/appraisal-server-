import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {ReportHospital} from '../model/report-hospital';

export class AreaBudgetMigration implements IMigration {
  name = '添加金额分配';
  version = 13;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "area_budget"
      (
        "region_id"  VARCHAR(255) REFERENCES "region" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
        "budget"     DECIMAL(15, 4) DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("region_id")
      );
      COMMENT ON COLUMN "area_budget"."region_id" IS '地区';
      COMMENT ON COLUMN "area_budget"."budget" IS '金额';

      ALTER TABLE "report_hospital" ADD COLUMN IF NOT EXISTS "budget" DECIMAL(15, 4) DEFAULT 0;
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      DROP TABLE IF EXISTS "area_budget";
      ALTER TABLE "report_hospital"
        DROP COLUMN IF EXISTS "budget";
    `);
  }
}
