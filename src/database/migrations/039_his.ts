import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class HisMigration implements IMigration {
  name = '医疗绩效表';
  version: number;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      --用户与员工关联表
      create table if not exists his_user_mapping
      (
        "user"       varchar(36),
        "employee"   varchar(64),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key ("user", "employee")
      );
      comment on table his_user_mapping is '用户员工关联表';
      comment on column his_user_mapping."user" is '用户id';
      comment on column his_user_mapping."employee" is '员工id';

      --用户医疗工分来源表
      create table if not exists "his_user_work_source"
      (
        id           varchar(36) primary key,
        "user"       varchar(36),
        sources      varchar(36)[],
        rate         double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_user_work_source" is '用户医疗工分来源表';
      comment on column "his_user_work_source"."user" is '用户id';
      comment on column "his_user_work_source"."sources" is '关联用户id数组';
      comment on column "his_user_work_source".rate is '比例';

      --工分项目表
      create table if not exists "his_work_item"
      (
        id           varchar(36),
        name         varchar(255),
        auto         boolean                           default false,
        type         varchar(255),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_work_item" is '工分项目表';
      comment on column "his_work_item".name is '名称';
      comment on column "his_work_item".auto is '是否自动打分';
      comment on column "his_work_item".type is '得分方式; counts: 数量; money: 金额';

      --工分项目与his收费项目关联表
      create table if not exists "his_work_item_mapping"
      (
        item         varchar(36),
        charge       varchar(64),
        type         varchar(255),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (item, charge)
      );
      comment on table "his_work_item_mapping" is '工分项目与his收费项目关联表';
      comment on column "his_work_item_mapping".item is '工分项目id';
      comment on column "his_work_item_mapping".charge is '收费项目id';
      comment on column "his_work_item_mapping".type is '收费项目类型; 检查项目/药品';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
