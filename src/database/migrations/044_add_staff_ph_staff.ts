import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddStaffPhStaffMigration implements IMigration {
  name = '员工表添加公卫员工字段';
  version = 44;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table staff ADD COLUMN ph_staff varchar(200) DEFAULT null;
      COMMENT ON COLUMN staff.ph_staff IS '公卫员工';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
