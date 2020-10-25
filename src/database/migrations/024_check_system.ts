import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AlterCheckSystemMigration implements IMigration {
  name = '考核表添加考核类型字段';
  version = 24;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      alter table "check_system"
        add column if not exists check_type integer default (0);
      alter table "check_system"
        add column if not exists run_time timestamp with time zone;
      alter table "report_hospital_history"
        add column if not exists "checkId" uuid default null
          references "check_system" ("check_id") on delete set null on update cascade;
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
