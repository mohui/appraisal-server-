import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RuleAttachDateRangeMigration implements IMigration {
  name = '添加规则附件上传的时间区间';
  version = 12;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      `
        ALTER TABLE rule_tag
            ADD COLUMN IF NOT EXISTS attach_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS attach_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;
    `
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
