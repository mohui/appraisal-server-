import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddStaffRequestHide implements IMigration {
  name = '申请表添加隐藏字段';
  version = 66;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table staff_request
        ADD COLUMN hide boolean not null default false;
      COMMENT ON COLUMN staff_request.hide IS '隐藏未通过的审核申请,默认false';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
