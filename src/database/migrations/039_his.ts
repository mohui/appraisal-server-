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

      --用户和工分项绑定表
      create table "his_user_work_item_mapping"
      (
        "user"       varchar(36),
        item         varchar(36),
        score        int,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key ("user", item)
      );
      comment on table "his_user_work_item_mapping" is '用户和工分项绑定表';
      comment on column "his_user_work_item_mapping"."user" is '用户id';
      comment on column "his_user_work_item_mapping".item is '工分项目id';
      comment on column "his_user_work_item_mapping".score is '分值';

      --用户工分项目得分表
      create table "his_user_work_score"
      (
        "user"       varchar(36),
        item         varchar(36),
        date         date,
        score        int,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key ("user", item, date)
      );
      comment on table "his_user_work_score" is '用户工分项目得分表';
      comment on column "his_user_work_score"."user" is '用户id';
      comment on column "his_user_work_score".item is '工分项目id';
      comment on column "his_user_work_score".date is '日期';
      comment on column "his_user_work_score".score is '得分';
    `);
    // language=PostgreSQL
    await client.execute(`
      --医疗考核方案表
      create table if not exists "his_check_system"
      (
        id           varchar(36) primary key,
        name         varchar(255),
        users        varchar(36)[],
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp
      );
      comment on table "his_check_system" is '医疗考核方案表';
      comment on column "his_check_system".name is '名称';
      comment on column "his_check_system".users is '考核员工';

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
      create table if not exists his_rule_user_score
      (
        rule         varchar(36),
        "user"       varchar(36),
        date         date,
        score        double precision,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key (rule, "user", date)
      );
      comment on table his_rule_user_score is '考核得分表';
      comment on column his_rule_user_score.rule is '考核规则id';
      comment on column his_rule_user_score."user" is '用户id';
      comment on column his_rule_user_score.date is '日期';
      comment on column his_rule_user_score.score is '得分';

      --考核附加分表
      create table if not exists his_user_extra_score
      (
        "user"       varchar(36),
        month        varchar(6),
        "check"      varchar(36),
        score        int,
        "created_at" timestamp with time zone not null default current_timestamp,
        "updated_at" timestamp with time zone not null default current_timestamp,
        primary key ("user", month)
      );
      comment on table his_user_extra_score is '附加分表';
      comment on column his_user_extra_score."check" is '考核方案';
      comment on column his_user_extra_score."user" is '员工id';
      comment on column his_user_extra_score.month is '考核时间; 格式为: YYYYMM';
      comment on column his_user_extra_score.score is '得分';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
