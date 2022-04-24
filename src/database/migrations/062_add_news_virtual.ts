import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddNewsVirtual implements IMigration {
  name = '新闻表添加虚拟浏览量字段';
  version = 62;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table news
        ADD COLUMN virtual_pv integer;
      COMMENT ON COLUMN news."virtual_pv" IS '虚拟浏览量';

    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
