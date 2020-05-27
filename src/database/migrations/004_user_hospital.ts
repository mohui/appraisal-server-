import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UserHospitalIMigration implements IMigration {
  name = '用户与机构关联';
  version = 4;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS "user_hospital_mapping" -- 用户机构关联表
        (
            "user_id"           UUID, -- 用户id
            "hospital_id"       UUID, -- 机构id
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
