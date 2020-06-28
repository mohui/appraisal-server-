import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class BudgetMigration implements IMigration {
  name = '添加金额分配';
  version = 13;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER TABLE "region" ADD COLUMN IF NOT EXISTS "budget" DECIMAL(15, 4) DEFAULT 0;
      COMMENT ON COLUMN "region"."budget" IS '金额';

      ALTER TABLE "report_hospital" ADD COLUMN IF NOT EXISTS "budget" DECIMAL(15, 4) DEFAULT 0;
      COMMENT ON COLUMN "report_hospital"."budget" IS '金额';
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER TABLE "region"
        DROP COLUMN IF EXISTS "budget";
      ALTER TABLE "report_hospital"
        DROP COLUMN IF EXISTS "budget";
    `);
  }
}
