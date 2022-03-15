import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddHisSetting implements IMigration {
  name = '添加智慧医疗公分项管理表';
  version = 55;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      create table if not exists his_setting
      (
        hospital     varchar(36),
        code         varchar(255),
        settle       boolean                  not null DEFAULT true,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (hospital, code)
      );
      comment on table his_setting is '智慧医疗公分项管理表';
      comment on column his_setting.hospital is '所属机构id';
      comment on column his_setting.code is '功能编码';
      comment on column his_setting.settle is '是否开启';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
