import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddHisCheckRuleFieldLengthMigration implements IMigration {
  name = '增加医疗考核规则表的考核要求字段长度到1024';
  version = 47;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      alter table his_check_rule alter detail type varchar(1024);

    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
