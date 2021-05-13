import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AuditMigration implements IMigration {
  name = '操作日志功能';
  version = 38;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      create table if not exists "audit_log"
      (
        "time"       timestamp with time zone not null default current_timestamp,
        "user_id"    varchar(36),
        "user_name"  varchar(255),
        "module"     varchar(255),
        "method"     varchar(255),
        "extra"      json,

        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "audit_log" is '审计表';
      comment on column "audit_log"."time" is '操作时间';
      comment on column "audit_log"."user_id" is '操作人id';
      comment on column "audit_log"."user_name" is '操作人名称';
      comment on column "audit_log"."module" is '操作模块';
      comment on column "audit_log"."method" is '操作功能';
      comment on column "audit_log"."extra" is '操作附加属性';
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
