import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddNewsField implements IMigration {
  name = '新闻表添加发布人,发布时间字段';
  version = 59;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table news
        ADD COLUMN published_by varchar(50) DEFAULT null;
      COMMENT ON COLUMN news."published_by" IS '发布人';

      ALTER table news
        ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;
      COMMENT ON COLUMN news."published_at" IS '发布时间';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
