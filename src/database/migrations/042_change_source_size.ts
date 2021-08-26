import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class IncreaseSourceSizeMigration implements IMigration {
  name = '工分项关联项目source字段扩容';
  version = 42;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      alter table his_work_item_mapping alter column source type varchar(255) using source::varchar(255);
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
