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
        add column if not exists "check_id" uuid
          references "check_system" ("check_id") on update cascade on delete cascade;
      alter table "report_hospital"
        add column if not exists "check_id" uuid
          references "check_system" ("check_id") on update cascade on delete cascade;

      --补上跑分历史记录的check_id的值
      update report_hospital_history rhh
      set "check_id" = ch.check_system
      from (select check_system, hospital
            from check_hospital ch
                   left join check_system cs on ch.check_system = cs.check_id
            where cs.check_type = 1) as ch
      where rhh.hospital = ch.hospital;

      --补上跑分结果的check_id的值
      update report_hospital rh
      set "check_id" = ch.check_system
      from (select check_system, hospital
            from check_hospital ch
                   left join check_system cs on ch.check_system = cs.check_id
            where cs.check_type = 1) as ch
      where rh.hospital = ch.hospital;

      --删除check_id为空的数据
      delete
      from report_hospital
      where check_id is null;
      delete
      from report_hospital_history
      where check_id is null;

      --删除report_hospital原有的主键约束
      alter table report_hospital
        drop constraint report_hospital_pkey;
      --建立新的联合主键约束
      alter table report_hospital
        add primary key ("hospital", "check_id");

      --删除"report_hospital_hospital"原有的主键约束
      alter table report_hospital_history
        drop constraint report_hospital_history_pkey;
      --建立新的联合主键约束
      alter table report_hospital_history
        add primary key ("date", "hospital", "check_id");
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
