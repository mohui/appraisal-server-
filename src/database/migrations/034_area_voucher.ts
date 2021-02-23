import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AreaVoucherMigration implements IMigration {
  name = '机构付款凭证上传';
  version = 34;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      `
        CREATE TABLE IF NOT EXISTS "area_voucher"
        (
          "year"       varchar(10)              NOT NULL,
          "area"       varchar(255)             NOT NULL REFERENCES "area" ("code") ON DELETE NO ACTION ON UPDATE CASCADE,
          "money"      FLOAT DEFAULT 0,
          "vouchers"   varchar(255)[],
          "created_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL,
          PRIMARY KEY ("year", "area")
        );

        COMMENT ON COLUMN "area_voucher"."year" IS '年份';
        COMMENT ON COLUMN "area_voucher"."money" IS '金额';
        COMMENT ON COLUMN "area_voucher"."area" IS '机构id';
        COMMENT ON COLUMN "area_voucher"."vouchers" IS '凭证图地址';
      `
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
