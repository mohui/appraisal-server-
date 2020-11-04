import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class DeleteRuleHospitalScoreRepeatDataMigration implements IMigration {
  name = '删除机构细则得分的重复数据';
  version = 25;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      -- 分值数据进行分组排序，序号大于1判定未重复数据，以id进行删除
      with data as (
        select *, row_number() over (partition by rule,hospital order by updated_at desc) number
        from rule_hospital_score
      )
      delete
      from rule_hospital_score
      where id in (select id from data where number > 1);
      -- 删除表的id主键
      alter table rule_hospital_score
        drop constraint rule_hospital_score_pkey;
      -- 删除表的id字段
      alter table rule_hospital_score
        drop column id;
      -- 建立rule与hospital的主键
      alter table rule_hospital_score
        add constraint rule_hospital_score_pkey primary key (rule, hospital);
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
