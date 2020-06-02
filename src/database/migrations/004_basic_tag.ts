import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class BasicTagMigration implements IMigration {
  name = '基础数据表结构初始化';
  version = 4;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
CREATE TABLE IF NOT EXISTS "basic_tag_data"
(
    "id"         UUID,
    "hospital"   UUID                     NOT NULL REFERENCES "hospital" ("id") ON DELETE NO ACTION ON UPDATE CASCADE,
    "code"       VARCHAR(255)             NOT NULL,
    "value"      INTEGER                  NOT NULL DEFAULT 0,
    "year"       VARCHAR(255)             NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY ("id")
);
COMMENT ON COLUMN "basic_tag_data"."id" IS '主键id';
COMMENT ON COLUMN "basic_tag_data"."code" IS '基础数';
COMMENT ON COLUMN "basic_tag_data"."value" IS '基础数据值';
COMMENT ON COLUMN "basic_tag_data"."year" IS '基础数据年度';`);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    await client.execute(`DROP TABLE IF EXISTS "basic_tag_data"`);
  }
}
