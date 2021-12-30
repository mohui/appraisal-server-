import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddStaffRequest implements IMigration {
  name = '添加员工申请表';
  version = 52;

  async up(client: ExtendedSequelize): Promise<void> {
    //language=PostgreSQL
    await client.execute(`
      create table staff_request
      (
        id         char(36) primary key,
        staff      char(36),
        area       char(36),
        status     varchar(255)             not null default '待审核',
        created_at timestamp with time zone not null default current_timestamp,
        updated_at timestamp with time zone not null default current_timestamp
      );
      comment on table staff_request is '员工申请表';
      comment on column staff_request.id is '主键';
      comment on column staff_request.staff is '员工id';
      comment on column staff_request.area is '机构id';
      comment on column staff_request.status is '状态. 待审核;已通过;未通过';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
