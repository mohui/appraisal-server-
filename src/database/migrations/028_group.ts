import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {
  AreaModel,
  CheckAreaModel,
  CheckHospitalModel,
  ManualScoreHistoryModel,
  ReportAreaHistoryModel,
  ReportHospitalHistoryModel,
  RuleAreaAttachModel,
  RuleAreaScoreModel,
  RuleHospitalAttachModel,
  RuleHospitalModel,
  ScoreRemarkHistoryModel,
  UserHospitalModel,
  UserModel
} from '../model';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';

function debug(...args) {
  console.log(dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'), ...args);
}

export class GroupMigration implements IMigration {
  name = '分层考核';
  version = 28;

  async up(client: ExtendedSequelize): Promise<void> {
    // 0. 补充hospital_mapping表的u_id字段
    // language=PostgreSQL
    await client.execute(`
      alter table hospital_mapping
        add column if not exists u_id UUID;
    `);
    const hospitalMappings = await client.execute(
      `select * from hospital_mapping where u_id is null`
    );
    // language=PostgreSQL
    await Promise.all(
      hospitalMappings.map(model =>
        client.execute(
          `
            update hospital_mapping
            set u_id = ?
            where id = ?
          `,
          uuid(),
          model.id
        )
      )
    );
    debug('0. 补充hospital_mapping表的u_id字段');
    // 1. 新建表结构
    // language=PostgreSQL
    await client.execute(`
      -- 地区表
      CREATE TABLE IF NOT EXISTS "area"
      (
        "code"       VARCHAR(36) PRIMARY KEY,
        "name"       VARCHAR(255),
        "parent"     VARCHAR(36),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      COMMENT ON COLUMN "area"."code" IS '主键id';
      COMMENT ON COLUMN "area"."name" IS '节点名';
      COMMENT ON COLUMN "area"."parent" IS '父节点id';

      --考核体系与地区绑定表
      CREATE TABLE IF NOT EXISTS "check_area"
      (
        "check_system" UUID                                               NOT NULL REFERENCES "check_system" ("check_id") ON DELETE CASCADE ON UPDATE CASCADE,
        "area"         VARCHAR(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
        "created_at"   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at"   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("check_system", "area")
      );
      COMMENT ON COLUMN "check_area"."check_system" IS '考核id';
      COMMENT ON COLUMN "check_area"."area" IS '地区id';

      -- 考核细则附件表, 用于存储定性指标上传的附件
      CREATE TABLE IF NOT EXISTS "rule_area_attach"
      (
        "id"         VARCHAR(36) primary key,
        rule         UUID                                               NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE CASCADE ON UPDATE CASCADE, -- 考核细则id
        area         VARCHAR(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
        name         VARCHAR(255)                                       NOT NULL,
        url          VARCHAR(255)                                       NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      COMMENT ON COLUMN "rule_area_attach"."id" IS '主键id';
      COMMENT ON COLUMN "rule_area_attach"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_area_attach"."area" IS '地区编码';
      COMMENT ON COLUMN "rule_area_attach"."name" IS '附件中文名';
      COMMENT ON COLUMN "rule_area_attach"."url" IS '附件URL地址';
      COMMENT ON COLUMN "rule_area_attach"."updated_at" IS '更新时间';

      -- 地区得分表
      CREATE TABLE IF NOT EXISTS "rule_area_score"
      (
        "rule"       UUID                                               NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE CASCADE ON UPDATE CASCADE, -- 考核细则id
        "area"       VARCHAR(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE CASCADE ON UPDATE CASCADE,          -- 地区编码
        "score"      FLOAT                    default 0                 NOT NULL,                                                                         -- 得分
        "auto"       BOOLEAN                  DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("rule", "area")
      );
      COMMENT ON COLUMN "rule_area_score"."rule" IS '考核细则id';
      COMMENT ON COLUMN "rule_area_score"."area" IS '地区编码';
      COMMENT ON COLUMN "rule_area_score"."score" IS '得分';
      COMMENT ON COLUMN "rule_area_score"."auto" IS '是否自动打分, 默认是';

      -- 地区金额分配表
      CREATE TABLE IF NOT EXISTS "rule_area_budget"
      (
        "rule"             UUID                                               NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE CASCADE ON UPDATE CASCADE,
        "area"             VARCHAR(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
        "budget"           DECIMAL(15, 4)           DEFAULT 0,
        "workPoint"        FLOAT                    DEFAULT 0,
        "correctWorkPoint" FLOAT                    DEFAULT 0,
        "score"            FLOAT                    DEFAULT 0,
        "totalScore"       FLOAT                    DEFAULT 0,
        "rate"             FLOAT                    DEFAULT 0,
        "created_at"       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at"       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("rule", "area")
      );
      COMMENT ON COLUMN "rule_area_budget"."rule" IS '考核小项id';
      COMMENT ON COLUMN "rule_area_budget"."area" IS '地区id';
      COMMENT ON COLUMN "rule_area_budget"."budget" IS '分配金额';
      COMMENT ON COLUMN "rule_area_budget"."workPoint" IS '校正前工分';
      COMMENT ON COLUMN "rule_area_budget"."correctWorkPoint" IS '校正后工分';
      COMMENT ON COLUMN "rule_area_budget"."score" IS '得分';
      COMMENT ON COLUMN "rule_area_budget"."totalScore" IS '总分';
      COMMENT ON COLUMN "rule_area_budget"."rate" IS '质量系数';

      -- 地区考核表
      CREATE TABLE IF NOT EXISTS "report_area"
      (
        "check"            UUID REFERENCES "check_system" ("check_id") ON DELETE CASCADE ON UPDATE CASCADE,
        "area"             VARCHAR(36) REFERENCES "area" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
        "totalWorkPoint"   FLOAT                    DEFAULT 0,
        "workPoint"        FLOAT                    DEFAULT 0,
        "correctWorkPoint" FLOAT                    DEFAULT 0,
        "score"            FLOAT                    DEFAULT 0,
        "rate"             FLOAT                    DEFAULT 0,
        "budget"           DECIMAL(15, 4)           DEFAULT 0,
        "created_at"       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at"       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("area", "check")
      );
      COMMENT ON COLUMN "report_area"."check" IS '考核id';
      COMMENT ON COLUMN "report_area"."area" IS '地区id';
      COMMENT ON COLUMN "report_area"."totalWorkPoint" IS '校正前工分';
      COMMENT ON COLUMN "report_area"."workPoint" IS '参与校正工分';
      COMMENT ON COLUMN "report_area"."correctWorkPoint" IS '校正后工分';
      COMMENT ON COLUMN "report_area"."score" IS '得分';
      COMMENT ON COLUMN "report_area"."rate" IS '质量系数';
      COMMENT ON COLUMN "report_area"."budget" IS '分配金额';

      -- 地区考核历史表
      CREATE TABLE IF NOT EXISTS "report_area_history"
      (
        "date"             DATE,
        "check"            UUID REFERENCES "check_system" ("check_id") ON DELETE CASCADE ON UPDATE CASCADE,
        "area"             VARCHAR(36) REFERENCES "area" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
        "rate"             FLOAT                    DEFAULT 0,
        "totalWorkPoint"   FLOAT                    DEFAULT 0,
        "workPoint"        FLOAT                    DEFAULT 0,
        "correctWorkPoint" FLOAT                    DEFAULT 0,
        "score"            FLOAT                    DEFAULT 0,
        "budget"           DECIMAL(15, 4)           DEFAULT 0,
        "created_at"       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at"       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("date", "area", "check")
      );
      COMMENT ON COLUMN "report_area_history"."date" IS '日期';
      COMMENT ON COLUMN "report_area_history"."check" IS '考核id';
      COMMENT ON COLUMN "report_area_history"."area" IS '地区id';
      COMMENT ON COLUMN "report_area_history"."rate" IS '质量系数';
      COMMENT ON COLUMN "report_area_history"."totalWorkPoint" IS '校正前工分';
      COMMENT ON COLUMN "report_area_history"."workPoint" IS '参与校正工分';
      COMMENT ON COLUMN "report_area_history"."correctWorkPoint" IS '校正后工分';
      COMMENT ON COLUMN "report_area_history"."score" IS '得分';
      COMMENT ON COLUMN "report_area_history"."budget" IS '分配金额';

      -- 手动打分备注和历史表
      CREATE TABLE IF NOT EXISTS "manual_score_history"
      (
        "id"         UUID,
        "rule"       UUID                                               NOT NULL REFERENCES "check_rule" ("rule_id") ON DELETE CASCADE ON UPDATE CASCADE,
        "code"       varchar(36)                                        NOT NULL REFERENCES "area" ("code") ON DELETE CASCADE ON UPDATE CASCADE,
        "score"      FLOAT                    DEFAULT 0,
        "remark"     VARCHAR(255)             DEFAULT '',
        "creator"    UUID REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY ("id")
      );
      COMMENT ON COLUMN "manual_score_history"."rule" IS '考核小项id';
      COMMENT ON COLUMN "manual_score_history"."code" IS '地区code或者机构id';
      COMMENT ON COLUMN "manual_score_history"."score" IS '手动打分分数';
      COMMENT ON COLUMN "manual_score_history"."remark" IS '备注信息';
      COMMENT ON COLUMN "manual_score_history"."creator" IS '打分者';
      COMMENT ON COLUMN "manual_score_history"."created_at" IS '创建时间';
      COMMENT ON COLUMN "manual_score_history"."updated_at" IS '更新时间';
    `);
    debug('1. 新建表结构');

    // 2. 删除数据
    // language=PostgreSQL
    await client.execute(`
      -- 1.清理考核细则附件
      delete
      from rule_hospital_attach
      where rule in (
        select cr.rule_id
        from check_rule cr
               inner join check_system cs on cr.check_id = cs.check_id
        where cs.check_type = 0
      );
      -- 2.清理考核细则得分
      delete
      from rule_hospital_score
      where rule in (
        select cr.rule_id
        from check_rule cr
               inner join check_system cs on cr.check_id = cs.check_id
        where cs.check_type = 0
      );
      -- 3.清理考核细则关联关系表
      delete
      from rule_tag ch
      where rule in (
        select cr.rule_id
        from check_rule cr
               inner join check_system cs on cr.check_id = cs.check_id
        where cs.check_type = 0
      );
      -- 4.清理考核细则绑定机构表
      delete
      from rule_hospital
      where rule in (
        select cr.rule_id
        from check_rule cr
               inner join check_system cs on cr.check_id = cs.check_id
        where cs.check_type = 0
      );
      -- 5.清理考核小项机构金额表
      delete
      from rule_hospital_budget
      where rule in (
        select cr.rule_id
        from check_rule cr
               inner join check_system cs on cr.check_id = cs.check_id
        where cs.check_type = 0
      );
      -- 6.清理考核小项绑定工分表
      delete
      from rule_project ch
      where rule in (
        select cr.rule_id
        from check_rule cr
               inner join check_system cs on cr.check_id = cs.check_id
        where cs.check_type = 0
      );
      -- 7.清理考核机构报告表
      delete
      from report_hospital rh
      where rh.check_id in (select check_id from check_system cs where cs.check_type = 0);
      -- 8.清理考核机构报告历史表
      delete
      from report_hospital_history rh
      where rh.check_id in (select check_id from check_system cs where cs.check_type = 0);
      -- 9.清理考核机构绑定关系
      delete
      from check_hospital ch
      where ch.check_system in (select check_id from check_system cs where cs.check_type = 0);
      -- 10.清理考核体系表
      delete
      from check_system cs
      where cs.check_type = 0;
    `);
    debug('2. 删除数据');

    // 3. 迁移数据

    // 3.1 构造area表
    // 3.1.1 同步区级及以上的地区数据
    // language=PostgreSQL
    const regions = await client.execute(
      `
        select code, name, parent
        from region
        where level < 4
        order by level
      `
    );
    await Promise.all(regions.map(region => AreaModel.upsert(region)));
    debug('3.1.1 同步区级及以上的地区数据');

    // 同步中心层
    // language=PostgreSQL
    const centers: {
      u_id: string;
      id: string;
      name: string;
      region: string;
    }[] = await client.execute(
      `
        select h.id, h.name as name, hm.u_id, foo.region
        from hospital h
               inner join (
          select h1.id, r.code as region
          from hospital h1
                 inner join region r on h1.region = r.code and r.level = 3
        ) foo on h.parent = foo.id
               inner join hospital_mapping hm on hm.h_id = h.id
      `
    );
    for (const center of centers) {
      // 同步中心层
      await AreaModel.upsert({
        code: center.u_id,
        name: center.name,
        parent: center.region
      });
      // 同步一级机构
      await AreaModel.upsert({
        code: center.id,
        name: center.name,
        parent: center.u_id
      });
      // 同步二级机构
      const hospitals: {code: string; name: string}[] = await client.execute(
        `select id as code, name from hospital where parent = ?`,
        center.id
      );
      await Promise.all(
        hospitals.map(it =>
          AreaModel.upsert({
            ...it,
            parent: center.u_id
          })
        )
      );
    }
    debug('3.1.2 中心层及机构');

    // 3.2 迁移考核相关数据

    // 3.2.1 考核体系数据
    const checkHospitalModels: CheckHospitalModel[] = await CheckHospitalModel.findAll();
    await Promise.all(
      checkHospitalModels.map(model =>
        CheckAreaModel.upsert({
          checkId: model.checkId,
          areaCode: model.hospitalId
        })
      )
    );
    debug('3.2.1 考核体系数据');

    // 3.2.2 考核细则数据
    const ruleAttachModels: RuleHospitalAttachModel[] = await RuleHospitalAttachModel.findAll();
    await Promise.all(
      ruleAttachModels.map(model => RuleAreaAttachModel.upsert(model.toJSON()))
    );
    debug('3.2.2.1 考核细则附件数据');
    const ruleHospitalModels: RuleHospitalModel[] = await RuleHospitalModel.findAll(
      {where: {auto: false}}
    );
    debug('3.2.2.2 考核细则auto: ', ruleHospitalModels.length);
    await Promise.all(
      ruleHospitalModels.map(model =>
        RuleAreaScoreModel.upsert({
          ruleId: model.ruleId,
          areaCode: model.hospitalId,
          auto: model.auto
        })
      )
    );
    debug('3.2.2 考核细则数据');

    // 3.2.3 手动打分备注
    const scoreRemarkModels: ScoreRemarkHistoryModel[] = await ScoreRemarkHistoryModel.findAll();
    await Promise.all(
      scoreRemarkModels.map(model =>
        ManualScoreHistoryModel.upsert({
          ...model.toJSON(),
          code: model.hospitalId
        })
      )
    );
    debug('3.2.3 手动打分备注');

    // 3.2.4 考核历史
    const reportHospitalModels: ReportHospitalHistoryModel[] = await ReportHospitalHistoryModel.findAll();
    await ReportAreaHistoryModel.bulkCreate(
      reportHospitalModels.map(
        model => ({
          date: model.date,
          checkId: model.checkId,
          areaCode: model.hospitalId,
          rate: model.rate,
          score: model.score
        }),
        {updateOnDuplicate: ['data', 'check', 'area']}
      )
    );
    console.log('3.2.4 考核历史');

    // 用户表添加area字段
    await client.execute(
      `
      alter table "user" add column if not exists area varchar(36);
      -- 清理用户表region字段不合理的数
        delete
        from "user"
        where id in (
          select u.id
          from "user" u
                 left join user_hospital_mapping uhm on u.id = uhm.user_id
                 inner join region r on u.region = r.code
          where uhm.hospital_id is null
            and r.level > 3
        );
      `
    );

    // 补充用户area值
    const userHospitals = await UserHospitalModel.findAll();
    await Promise.all(
      userHospitals.map(async it =>
        client.execute(
          `update "user" set "area" = ? where id = ?`,
          it.hospitalId,
          it.userId
        )
      )
    );

    const userModels = await UserModel.findAll({where: {areaCode: null}});
    for (const user of userModels) {
      user.areaCode = user.regionId;
      await user.save();
    }
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
