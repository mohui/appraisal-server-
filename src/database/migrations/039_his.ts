import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class HisMigration implements IMigration {
  name = '医疗绩效表';
  version = 39;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      --员工表
      create table if not exists staff
      (
        id           varchar(36) primary key,
        hospital     varchar(36),
        staff        varchar(64),
        account      varchar(255) unique,
        password     varchar(255),
        name         varchar(255),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table staff is '员工表';
      comment on column staff.hospital is '所属医院';
      comment on column staff.staff is '绑定his员工id';
      comment on column staff.account is '登录名';
      comment on column staff.account is '密码';
      comment on column staff.name is '名称';

      --员工医疗工分来源表
      create table if not exists his_staff_work_source
      (
        id           varchar(36) primary key,
        staff        varchar(36),
        sources      varchar(36)[],
        rate         double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table his_staff_work_source is '员工医疗工分来源表';
      comment on column his_staff_work_source.staff is '员工id';
      comment on column his_staff_work_source."sources" is '关联员工id数组';
      comment on column his_staff_work_source.rate is '权重系数';

      --工分项目表
      create table if not exists "his_work_item"
      (
        id           varchar(36),
        name         varchar(255),
        type         varchar(255),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_work_item" is '工分项目表';
      comment on column "his_work_item".name is '名称';
      comment on column "his_work_item".type is '得分方式; counts: 数量; money: 金额; null: 手动打分';

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

      --员工和工分项绑定表
      create table his_staff_work_item_mapping
      (
        staff        varchar(36),
        item         varchar(36),
        score        int,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (staff, item)
      );
      comment on table his_staff_work_item_mapping is '员工和工分项绑定表';
      comment on column his_staff_work_item_mapping.staff is '员工id';
      comment on column his_staff_work_item_mapping.item is '工分项目id';
      comment on column his_staff_work_item_mapping.score is '分值';

      --员工工分项目得分表
      create table "his_user_work_score"
      (
        staff        varchar(36),
        item         varchar(36),
        date         date,
        score        int,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (staff, item, date)
      );
      comment on table "his_user_work_score" is '员工工分项目得分表';
      comment on column "his_user_work_score".staff is '员工id';
      comment on column "his_user_work_score".item is '工分项目id';
      comment on column "his_user_work_score".date is '日期';
      comment on column "his_user_work_score".score is '得分';

      --医疗考核方案表
      create table if not exists "his_check_system"
      (
        id           varchar(36) primary key,
        name         varchar(255),
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_check_system" is '医疗考核方案表';
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
        name         varchar(255),
        tag          varchar(255),
        algorithm    varchar(255),
        baseline     double precision,
        score        int,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_check_rule" is '医疗考核规则表';
      comment on column "his_check_rule".name is '名称';
      comment on column "his_check_rule".tag is '指标';
      comment on column "his_check_rule".algorithm is '计算方式';
      comment on column "his_check_rule".baseline is '参考值';
      comment on column "his_check_rule".score is '分值';

      --考核结算表
      create table if not exists his_check_settle
      (
        "check"      varchar(36),
        month        varchar(6),
        settle       boolean,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key ("check", month)
      );
      comment on table his_check_settle is '考核结算表';
      comment on column his_check_settle."check" is '考核方案id';
      comment on column his_check_settle.month is '考核时间; 格式为: YYYYMM';
      comment on column his_check_settle.settle is '是否结算';

      --考核得分表
      create table if not exists his_rule_staff_score
      (
        rule         varchar(36),
        staff        varchar(36),
        date         date,
        score        double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (rule, staff, date)
      );
      comment on table his_rule_staff_score is '考核得分表';
      comment on column his_rule_staff_score.rule is '考核规则id';
      comment on column his_rule_staff_score.staff is '员工id';
      comment on column his_rule_staff_score.date is '日期';
      comment on column his_rule_staff_score.score is '得分';

      --考核附加分表
      create table if not exists his_user_extra_score
      (
        staff        varchar(36),
        month        varchar(6),
        "check"      varchar(36),
        score        int,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (staff, month)
      );
      comment on table his_user_extra_score is '附加分表';
      comment on column his_user_extra_score.staff is '员工id';
      comment on column his_user_extra_score.month is '考核时间; 格式为: YYYYMM';
      comment on column his_user_extra_score."check" is '考核方案';
      comment on column his_user_extra_score.score is '得分';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
