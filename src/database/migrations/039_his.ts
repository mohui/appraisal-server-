import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class HisMigration implements IMigration {
  name = '医疗绩效表';
  version = 39;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      --科室表
      create table if not exists his_department
      (
        id           varchar(36) primary key,
        hospital     varchar(36),
        name         varchar(255),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table his_department is '科室表';
      comment on column his_department.hospital is '所属医院';
      comment on column his_department.name is '名称';

      --员工表
      create table if not exists staff
      (
        id           varchar(36) primary key,
        hospital     varchar(36),
        department   varchar(36),
        staff        varchar(64) unique,
        account      varchar(255) unique,
        virtual      boolean                           default false not null,
        password     varchar(255),
        name         varchar(255),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table staff is '员工表';
      comment on column staff.hospital is '所属医院';
      comment on column staff.department is '所属科室';
      comment on column staff.staff is '绑定his员工id';
      comment on column staff.account is '登录名';
      comment on column staff.virtual is '虚拟用户标识';
      comment on column staff.password is '密码';
      comment on column staff.name is '名称';

      --医疗手工数据表
      create table if not exists his_manual_data
      (
        id           varchar(36) primary key,
        hospital     varchar(36),
        name         varchar(255),
        input        varchar(255)             not null,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        unique (hospital, name)
      );
      comment on table his_manual_data is '医疗手工数据表';
      comment on column his_manual_data.hospital is '所属医院id';
      comment on column his_manual_data.name is '名称';
      comment on column his_manual_data.input is '输入方式; 属性/日志';

      --医疗手工数据流水表
      create table if not exists his_staff_manual_data_detail
      (
        id           varchar(36) primary key,
        staff        varchar(36),
        item         varchar(36),
        date         timestamp with time zone,
        value        double precision,
        files        varchar(255)[],
        remark       varchar(500),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table his_staff_manual_data_detail is '医疗手工数据流水表';
      comment on column his_staff_manual_data_detail.staff is '员工id';
      comment on column his_staff_manual_data_detail.item is '手工数据id';
      comment on column his_staff_manual_data_detail.date is '赋值时间';
      comment on column his_staff_manual_data_detail.value is '单位量';
      comment on column his_staff_manual_data_detail.files is '附件; unifs地址数组';
      comment on column his_staff_manual_data_detail.remark is '备注';

      --工分项目表
      create table if not exists "his_work_item"
      (
        id           varchar(36) primary key,
        hospital     varchar(36),
        name         varchar(255),
        score        double precision,
        method       varchar(255)             not null,
        type         varchar(255)             not null,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_work_item" is '工分项目表';
      comment on column his_work_item.hospital is '所属医院id';
      comment on column "his_work_item".name is '名称';
      comment on column his_work_item.score is '分值';
      comment on column "his_work_item".method is '得分方式; 计数/总和';
      comment on column "his_work_item".type is '关联员工; 动态/固定';

      --工分项目来源关联表
      create table if not exists "his_work_item_mapping"
      (
        item         varchar(36),
        source       varchar(64),
        code         varchar(64),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (item, source)
      );
      comment on table "his_work_item_mapping" is '工分项目来源关联表';
      comment on column "his_work_item_mapping".item is '工分项目id';
      comment on column "his_work_item_mapping".source is '来源id';
      comment on column "his_work_item_mapping".code is '检查项目/药品id';

      -- 工分项目和员工关联表
      create table if not exists his_work_item_staff_mapping
      (
        id           varchar(36) primary key,
        item         varchar(36),
        source       varchar(36),
        type         varchar(36)              not null,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table his_work_item_staff_mapping is '工分项目员工关联表';
      comment on column his_work_item_staff_mapping.item is '工分项目id';
      comment on column his_work_item_staff_mapping."source" is '关联员工id/科室id';
      comment on column his_work_item_staff_mapping."type" is '关联员工类型';

      --员工和工分项绑定表
      create table if not exists his_staff_work_item_mapping
      (
        id           varchar(36) primary key,
        staff        varchar(36),
        item         varchar(36),
        rate         double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        unique (staff, item)
      );
      comment on table his_staff_work_item_mapping is '员工和工分项绑定表';
      comment on column his_staff_work_item_mapping.staff is '员工id';
      comment on column his_staff_work_item_mapping.item is '工分项目id';
      comment on column his_staff_work_item_mapping.rate is '占比';

      --医疗考核方案表
      create table if not exists "his_check_system"
      (
        id           varchar(36) primary key,
        hospital     varchar(36),
        name         varchar(255),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_check_system" is '医疗考核方案表';
      comment on column "his_check_system".hospital is '所属医院id';
      comment on column "his_check_system".name is '名称';

      --员工考核方案绑定表
      create table if not exists his_staff_check_mapping
      (
        staff        varchar(36) primary key,
        "check"      varchar(36),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table his_staff_check_mapping is '员工考核方案绑定表';
      comment on column his_staff_check_mapping.staff is '员工id';
      comment on column his_staff_check_mapping."check" is '考核方案id';

      --医疗考核规则表
      create table if not exists "his_check_rule"
      (
        id           varchar(36) primary key,
        "check"      varchar(36),
        auto         boolean,
        name         varchar(255),
        detail       varchar(255),
        metric       varchar(255),
        operator     varchar(255),
        value        double precision,
        score        double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_check_rule" is '医疗考核规则表';
      comment on column his_check_rule."check" is '所属考核方案';
      comment on column his_check_rule.auto is '是否自动考核';
      comment on column "his_check_rule".name is '名称';
      comment on column his_check_rule.detail is '考核要求';
      comment on column "his_check_rule".metric is '指标';
      comment on column "his_check_rule".operator is '计算方式';
      comment on column "his_check_rule".value is '参考值';
      comment on column "his_check_rule".score is '分值';

      --员工得分表
      create table if not exists his_staff_result
      (
        id           varchar(36) primary key,
        day          date,
        work         jsonb,
        assess       jsonb,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table his_staff_result is '员工得分表';
      comment on column his_staff_result.day is '日期';
      comment on column his_staff_result.work is '工分结果';
      comment on column his_staff_result.assess is '考核结果';

      --员工附加分表
      create table if not exists his_staff_extra_score
      (
        staff        varchar(36),
        month        date,
        score        double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (staff, month)
      );
      comment on table his_staff_extra_score is '附加分表';
      comment on column his_staff_extra_score.staff is '员工id';
      comment on column his_staff_extra_score.month is '打分时间; 默认每月1号';
      comment on column his_staff_extra_score.score is '得分';

      --机构结算表
      create table if not exists his_hospital_settle
      (
        hospital     varchar(36),
        month        date,
        settle       boolean,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (hospital, month)
      );
      comment on table his_hospital_settle is '考核结算表';
      comment on column his_hospital_settle.hospital is '所属医院id';
      comment on column his_hospital_settle.month is '结算时间; 默认每月1号';
      comment on column his_hospital_settle.settle is '是否结算';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
