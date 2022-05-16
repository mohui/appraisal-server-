import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddManualOrder implements IMigration {
  name = '手工数据表添加排序字段';
  version = 64;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table his_manual_data
        ADD COLUMN "order" integer default 0;
      COMMENT ON COLUMN his_manual_data."order" IS '排序,从小到大排序';

    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
