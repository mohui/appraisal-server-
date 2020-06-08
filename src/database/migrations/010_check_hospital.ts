import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class CheckHospitalMigration implements IMigration {
  name = '考核与机构关联';
  version = 10;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`CREATE TABLE IF NOT EXISTS "check_hospital"
    (
      "check_system" UUID                     NOT NULL REFERENCES "check_system" ("check_id") ON DELETE NO ACTION ON UPDATE CASCADE, --考核系统id
      "hospital"     UUID                     NOT NULL REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,           --机构id
      "created_at"   TIMESTAMP WITH TIME ZONE NOT NULL,
      "updated_at"   TIMESTAMP WITH TIME ZONE NOT NULL,
      PRIMARY KEY ("check_system", "hospital")
    );
    COMMENT ON COLUMN "check_hospital"."check_system" IS '考核id';
    COMMENT ON COLUMN "check_hospital"."hospital" IS '机构'`);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      DROP TABLE IF EXISTS "check_hospital";
    `);
  }
}
