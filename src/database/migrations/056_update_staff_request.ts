import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UpdateStaffRequest implements IMigration {
  name = '修改员工申请表字段类型';
  version = 56;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER TABLE staff_request ALTER COLUMN id TYPE char varying(36) USING (id::varchar(36));
      ALTER TABLE staff_request ALTER COLUMN staff TYPE char varying(36) USING (staff::varchar(36));
      ALTER TABLE staff_request ALTER COLUMN area TYPE char varying(36) USING (area::varchar(36));

      update  staff_request set area = trim(area), staff = trim(staff);
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
