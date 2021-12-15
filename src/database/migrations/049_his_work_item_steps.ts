import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddHisWorkItemStepsMigration implements IMigration {
  name = '工分项目表添加梯度';
  version = 49;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(
      // language=PostgreSQL
      `
        -- 添加梯度字段
        ALTER table his_work_item
          ADD COLUMN steps jsonb;
        COMMENT ON COLUMN his_work_item."steps" IS '梯度规则';

        -- 兼容老数据
        update his_work_item
        set steps = concat('[{"start" : null, "end" : null, "unit": ', score, '}]')::jsonb;

        -- 设置为 not null
        alter table his_work_item
          alter column steps set not null;

        -- 删除 score 字段
        alter table his_work_item
          drop column if exists score;

      `
    );
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
