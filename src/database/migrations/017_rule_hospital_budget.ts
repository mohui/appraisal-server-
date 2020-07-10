import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
export class RuleHospitalBudgetMigration implements IMigration {
  name = '机构小项的金额分配表';
  version = 17;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      ` CREATE TABLE IF NOT EXISTS "rule_hospital_budget"
        (
            "rule" UUID NOT NULL  REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE ,
            "hospital" UUID NOT NULL  REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE ,
            "budget"  DECIMAL(15, 4) DEFAULT 0,
            "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
            "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
            PRIMARY KEY ("rule","hospital"));
            COMMENT ON COLUMN "rule_hospital_budget"."rule" IS '考核小项id';
            COMMENT ON COLUMN "rule_hospital_budget"."hospital" IS '机构id';
            COMMENT ON COLUMN "rule_hospital_budget"."budget" IS '分配金额';
      `
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`DROP TABLE IF EXISTS "rule_hospital_budget";`);
  }
}
