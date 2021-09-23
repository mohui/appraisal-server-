import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {appDB, originalDB} from '../../app';

export class UpdateStaffMigration implements IMigration {
  name = '修改公卫员工id为varchar64';
  version = 45;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table staff alter COLUMN ph_staff type varchar(64);
    `);

    // 查询系统员工
    // language=PostgreSQL
    const staffs = await appDB.execute(
      `select ph_staff from staff where ph_staff is not null`
    );

    // 查询公卫员工
    // language=PostgreSQL
    const sysUserList = await originalDB.execute(
      `select id, original_id, name from ph_user`
    );
    for (const it of staffs) {
      // 查找公卫员工是否存在
      const index = sysUserList.find(item => item.original_id === it.ph_staff);
      if (index)
        // language=PostgreSQL
        await appDB.execute(
          `update staff set ph_staff = ? where ph_staff = ?`,
          index.id,
          index.original_id
        );
    }
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
