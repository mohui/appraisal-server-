import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {appDB} from '../../app';

export class UpdateStaffMigration implements IMigration {
  name = '修改公卫员工id为varchar64';
  version = 45;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table staff
        alter COLUMN ph_staff type varchar(64);
    `);

    // 查询系统员工
    // language=PostgreSQL
    await appDB.execute(
      `
        update staff
        set ph_staff = encode(sha256(concat(ph_staff, '国卫公卫芜湖')::bytea), 'hex')
        where ph_staff is not null
      `
    );
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
