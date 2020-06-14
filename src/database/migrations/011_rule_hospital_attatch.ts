import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RuleHospitalAttachMigration implements IMigration {
  name = '添加附件考核表结构';
  version = 11;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "rule_hospital_attach"
      (
        "id"         UUID,
        "rule"       UUID                     NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "hospital"   UUID                     NOT NULL REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,
        "name"       VARCHAR(255)             NOT NULL,
        "url"        VARCHAR(255)             NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "rule_hospital_attach"."id" IS '主键id';
      COMMENT ON COLUMN "rule_hospital_attach"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_hospital_attach"."hospital" IS '机构id';
      COMMENT ON COLUMN "rule_hospital_attach"."url" IS '附件URL';
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`DROP TABLE IF EXISTS "rule_hospital_attach";`);
  }
}
