import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RuleBudgetMigration implements IMigration {
  name = '考核规则添加金额字段';
  version = 15;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER TABLE "check_rule" ADD COLUMN IF NOT EXISTS "budget" DECIMAL(15, 4) DEFAULT 0;
      COMMENT ON COLUMN "check_rule"."budget" IS '金额';
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER TABLE "check_rule"
        DROP COLUMN IF EXISTS "budget";
    `);
  }
}
