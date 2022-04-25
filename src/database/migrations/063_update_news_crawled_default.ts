import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {newsSource} from '../../../common/news';

export class UpdateNewsCrawledDefault implements IMigration {
  name = '删除crawled默认值和not null';
  version = 63;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      alter table news
        alter column crawled_at drop not null,
        alter column crawled_at drop default;

      -- 自行创建的爬取时间改为null
      update news
      set crawled_at = null
      where source = '${newsSource.SELF}'
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
