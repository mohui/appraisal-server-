import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
export class CheckConstraintMigration implements IMigration {
  name = '修改考核和规则一些关联约束';
  version = 18;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      `
            --规则,机构关系表
            alter table rule_hospital drop constraint rule_hospital_rule_fkey;
            alter table rule_hospital add constraint rule_hospital_rule_fkey
                foreign key ("rule")
                references "check_rule"("rule_id")
                on delete cascade on update cascade;
            --规则,机构,得分关系表
            alter table rule_hospital_score drop constraint rule_hospital_score_rule_fkey;
            alter table rule_hospital_score add constraint rule_hospital_score_rule_fkey
                foreign key ("rule")
                references "check_rule"("rule_id")
                on delete cascade on update cascade;
            --规则,机构,定性文件表
            alter table rule_hospital_attach drop constraint rule_hospital_attach_rule_fkey;
            alter table rule_hospital_attach add constraint rule_hospital_attach_rule_fkey
              foreign key ("rule")
                references "check_rule"("rule_id")
                on delete cascade on update cascade;
            --规则,机构,金额关系表
            alter table rule_hospital_budget drop constraint rule_hospital_budget_rule_fkey;
            alter table rule_hospital_budget add constraint rule_hospital_budget_rule_fkey
              foreign key ("rule")
                references "check_rule"("rule_id")
                on delete cascade on update cascade;
            --规则,工分项关系表
            alter table rule_project drop constraint rule_project_rule_fkey;
            alter table rule_project add constraint rule_project_rule_fkey
              foreign key ("rule")
                references "check_rule"("rule_id")
                on delete cascade on update cascade;
            --规则,基础数据关系表
            alter table rule_tag drop constraint rule_tag_rule_fkey;
            alter table rule_tag add constraint rule_tag_rule_fkey
              foreign key ("rule")
                references "check_rule"("rule_id")
                on delete cascade on update cascade;
          `
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
