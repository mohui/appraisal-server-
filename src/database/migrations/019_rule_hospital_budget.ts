import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RuleHospitalBudgetColumnMigration implements IMigration {
  name = 'rule_hospital_budget表添加字段';
  version = 19;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER TABLE rule_hospital_budget ADD COLUMN IF NOT EXISTS "ruleScore" FLOAT default 0;
      ALTER TABLE rule_hospital_budget ADD COLUMN IF NOT EXISTS "ruleTotalScore" FLOAT default 0;
      ALTER TABLE rule_hospital_budget ADD COLUMN IF NOT EXISTS "rate" FLOAT default 0;
      ALTER TABLE rule_hospital_budget ADD COLUMN IF NOT EXISTS "workPoint" FLOAT default 0;
      ALTER TABLE rule_hospital_budget ADD COLUMN IF NOT EXISTS "correctWorkPoint" FLOAT default 0;
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
