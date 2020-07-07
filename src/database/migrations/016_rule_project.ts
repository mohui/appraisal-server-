import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
export class RuleProjectMigration implements IMigration {
  name = '考核规则关联工分项';
  version = 16;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      `  CREATE TABLE IF NOT EXISTS "rule_project"
      (
        "rule" UUID NOT NULL  REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE ,
        "projectType" VARCHAR(255) NOT NULL  ,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("rule","projectType")
      );
      COMMENT ON COLUMN "rule_project"."rule" IS '考核小则id';
      COMMENT ON COLUMN "rule_project"."projectType" IS '工分项';`
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`DROP TABLE IF EXISTS "rule_project";`);
  }
}
