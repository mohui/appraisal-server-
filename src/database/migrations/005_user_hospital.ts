import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UserHospitalIMigration implements IMigration {
  name = '用户与机构关联';
  version = 5;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS "user_hospital_mapping" -- 用户机构关联表
        (
            "user_id"           UUID  NOT NULL REFERENCES "user" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,    -- 用户id
            "hospital_id"       UUID  NOT NULL REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE, -- 机构id
            "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
            "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
            UNIQUE ("user_id","hospital_id"),
            primary key ("user_id", "hospital_id")
        );
   `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      DROP TABLE IF EXISTS "user_hospital_mapping";
    `);
  }
}
