import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class WorkDifficultyMigration implements IMigration {
  name = '工分项难度系数表';
  version = 20;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      create table if not exists "work_difficulty"
      (
        "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
        year         int,          -- 年份
        districtcode varchar(255), -- 地区code
        districtname varchar(255), -- 地区name
        scope        varchar(255), -- 数据范围
        code         varchar(255), -- 工分code
        name         varchar(255), ---- 工分name
        difficulty   float         --- 难度系数
      );
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      DROP TABLE IF EXISTS "work_difficulty";
    `);
  }
}
