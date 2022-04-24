import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UpdateNewsUrl implements IMigration {
  name = '修改URL字段为cover';
  version = 60;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table news
        rename column url to cover;
      COMMENT ON COLUMN news."cover" IS '第一张图片,封面';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
