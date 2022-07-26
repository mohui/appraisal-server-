import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RegionIMigration implements IMigration {
  name = '行政机构表结构初始化';
  version = 3;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
        CREATE TABLE IF NOT EXISTS "region" -- 行政编码表
        (
            "code"       varchar(255), -- 行政编码
            "name"       varchar(255), -- 行政名称
            "level"      int,          -- 行政级别 1: 省; 2: 市; 3: 县区; 4: 乡镇; 5: 村; 6. 组
            "parent"     varchar(255), -- 上级行政编码
            "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
            "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
            primary key (code)
        );

        CREATE TABLE IF NOT EXISTS "hospital" -- 机构表
        (
            "id"         uuid,                                                       -- id
            "name"       varchar(255),                                               -- 名称
            "region"     varchar(255)  NOT NULL REFERENCES region (code),            -- 机构所属行政编码
            "parent"     uuid,                                                       -- 上级机构
            "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
            "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
            primary key (id)
        );
   `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
      DROP TABLE IF EXISTS "region";
      DROP TABLE IF EXISTS "hospital";
    `);
  }
}
