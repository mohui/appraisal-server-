import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AreaBudgetMigration implements IMigration {
  name = '年度结算';
  version = 37;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(
      `
      CREATE TABLE IF NOT EXISTS "area_budget"
      (

        "area"                 VARCHAR(50),
        "year"                 int,
        "correct_work_point"   float       default 0,
        "rate"                 float         default 0,
        "budget"               float         default 0,
        "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
        primary key (area, year)
      );
      COMMENT ON COLUMN "area_budget"."area" IS '地区名称';
      COMMENT ON COLUMN "area_budget"."year" IS '考核年度';
      COMMENT ON COLUMN "area_budget"."correct_work_point" IS '校正后总工分值';
      COMMENT ON COLUMN "area_budget"."rate" IS '质量系数';
      COMMENT ON COLUMN "area_budget"."budget" IS '金额';
      COMMENT ON COLUMN "area_budget"."created_at" IS '创建时间';
      COMMENT ON COLUMN "area_budget"."updated_at" IS '修改时间';
      `
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
