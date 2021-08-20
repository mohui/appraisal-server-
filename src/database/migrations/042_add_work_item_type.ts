import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddWorkItemTypeMigration implements IMigration {
  name = '工分项类型表,工分项表添加分类字段';
  version = 42;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      -- 公分项分类表
      create table if not exists his_work_item_type
      (
        id           varchar(36) primary key,
        name         varchar(255),
        hospital     varchar(36),
        sort         INTEGER,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table his_work_item_type is '分类';
      comment on column his_work_item_type.hospital is '所属医院';
      comment on column his_work_item_type.name is '名称';
      comment on column his_work_item_type.sort is '排序';


      -- 公分项表添加分类字段
      ALTER table his_work_item ADD COLUMN item_type varchar(36) DEFAULT null;
      COMMENT ON COLUMN his_work_item."item_type" IS '分类id';

      --员工工分得分表
      create table if not exists his_staff_work_result
      (
        id           varchar(36) primary key,
        staff_id     varchar(36),
        time         date,
        item_id      varchar(36),
        item_name    varchar(255),
        type_id      varchar(36),
        type_name    varchar(255),
        score        double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        unique (staff_id, time, item_id)
      );
      comment on table his_staff_work_result is '员工得分表';
      comment on column his_staff_work_result.item_id is '员工id';
      comment on column his_staff_work_result.time is '时间';
      comment on column his_staff_work_result.item_id is '工分项id';
      comment on column his_staff_work_result.item_name is '工分项名称';
      comment on column his_staff_work_result.type_id is '工分项分类id';
      comment on column his_staff_work_result.type_name is '工分项分类名称';
      comment on column his_staff_work_result.score is '得分';

      --员工质量系数得分表
      create table if not exists his_staff_assess_result
      (
        id           varchar(36) primary key,
        staff_id    varchar(36),
        time         date,
        system_id    varchar(36),
        system_name    varchar(255),
        rule_id      varchar(36),
        rule_name    varchar(255),
        score        double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table his_staff_assess_result is '员工得分表';
      comment on column his_staff_assess_result.time is '时间';
      comment on column his_staff_assess_result.staff_id is '员工id';
      comment on column his_staff_assess_result.system_id is '考核方案id';
      comment on column his_staff_assess_result.system_name is '考核方案名称';
      comment on column his_staff_assess_result.rule_id is '规则id';
      comment on column his_staff_assess_result.rule_name is '规则名称';
      comment on column his_staff_assess_result.score is '得分';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
