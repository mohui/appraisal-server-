import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddSMS implements IMigration {
  name = '添加短信验证码表并添加员工手机号码唯一约束';
  version = 53;

  async up(client: ExtendedSequelize): Promise<void> {
    //language=PostgreSQL
    await client.execute(`
      --新建验证码表
      create table if not exists sms_code
      (
        phone      char(11),
        usage      varchar(255),
        counts     int                      not null default 1,
        code       char(6),
        account    char(36),
        created_at timestamp with time zone not null default current_timestamp,
        updated_at timestamp with time zone not null default current_timestamp,
        primary key (phone, usage)
      );
      comment on table sms_code is '验证码表';
      comment on column sms_code.phone is '手机号码';
      comment on column sms_code.counts is '每日发送次数';
      comment on column sms_code.usage is '用途';
      comment on column sms_code.code is '验证码';
      comment on column sms_code.account is '用户id';

      --员工表添加手机号码唯一约束
      alter table staff
        add unique (phone);
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
