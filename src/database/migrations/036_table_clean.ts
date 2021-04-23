import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class CleanTableMigration implements IMigration {
  name = '无用表格的清理工作';
  version = 36;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      drop table if exists report_hospital_history;
      drop table if exists report_hospital;
      drop table if exists rule_hospital_score;
      drop table if exists rule_hospital_budget;
      drop table if exists rule_hospital_attach;
      drop table if exists rule_hospital;
      drop table if exists check_hospital;
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
