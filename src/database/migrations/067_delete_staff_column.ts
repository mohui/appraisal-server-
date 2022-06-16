import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class DeleteStaffColumn implements IMigration {
  name = '员工表删除员工关联字段';
  version = 67;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table staff
        DROP staff,
        DROP ph_staff;
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
