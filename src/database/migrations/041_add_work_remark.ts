import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddWorkRemarkMigration implements IMigration {
  name = '工分项目表,员工和工分项绑定表添加备注字段';
  version = 41;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER  table his_work_item ADD COLUMN remark varchar(500) DEFAULT null;
      COMMENT ON COLUMN his_work_item."remark" IS '备注';

      ALTER  table his_staff_work_item_mapping ADD COLUMN remark varchar(500) DEFAULT null;
      COMMENT ON COLUMN his_staff_work_item_mapping."remark" IS '备注';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
