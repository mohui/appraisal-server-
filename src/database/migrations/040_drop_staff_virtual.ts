import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class DropStaffVirtualMigration implements IMigration {
  name = '删除员工表的虚拟账号字段';
  version = 40;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      alter table staff drop column if exists virtual;
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
