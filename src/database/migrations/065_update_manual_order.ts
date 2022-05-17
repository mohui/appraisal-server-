import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UpdateManualOrder implements IMigration {
  name = '修改手工数据表排序字段默认值';
  version = 65;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER TABLE his_manual_data
        ALTER COLUMN "order" SET DEFAULT 999;

      update his_manual_data
      set "order" = 999
      where "order" = 0
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
