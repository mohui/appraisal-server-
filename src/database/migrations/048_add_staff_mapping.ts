import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddStaffMappingMigration implements IMigration {
  name = '增加员工和地区绑定表,员工和his员工绑定表,员工和公卫员工绑定表';
  version = 48;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      `
        CREATE TABLE IF NOT EXISTS "staff_area_mapping" -- 用户地区关联表
        (
          "id"         VARCHAR(36)                                        NOT NULL primary key,
          "staff"      VARCHAR(36)                                        NOT NULL,
          "area"       VARCHAR(36)                                        NOT NULL,
          "department" VARCHAR(36)                                        NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          UNIQUE ("staff", "area")
        );
        COMMENT ON COLUMN "staff_area_mapping"."id" IS '主键';
        COMMENT ON COLUMN "staff_area_mapping"."staff" IS '员工id';
        COMMENT ON COLUMN "staff_area_mapping"."area" IS '地区id';
        COMMENT ON COLUMN "staff_area_mapping"."area" IS '科室id';

        CREATE TABLE IF NOT EXISTS "staff_ph_mapping"
        (
          "id"         VARCHAR(36)                                        NOT NULL primary key,
          "staff"      VARCHAR(36)                                        NOT NULL,
          "ph_staff"   VARCHAR(36)                                        NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          UNIQUE ("staff", "ph_staff")
        );
        COMMENT ON COLUMN "staff_ph_mapping"."id" IS '主键';
        COMMENT ON COLUMN "staff_ph_mapping"."staff" IS '员工id';
        COMMENT ON COLUMN "staff_ph_mapping"."ph_staff" IS '公卫员工id';

        CREATE TABLE IF NOT EXISTS "staff_his_mapping"
        (
          "id"         VARCHAR(36)                                        NOT NULL primary key,
          "staff"      VARCHAR(36)                                        NOT NULL,
          "his_staff"  VARCHAR(36)                                        NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          UNIQUE ("staff", "his_staff")
        );
        COMMENT ON COLUMN "staff_his_mapping"."id" IS '主键';
        COMMENT ON COLUMN "staff_his_mapping"."staff" IS '员工id';
        COMMENT ON COLUMN "staff_his_mapping"."his_staff" IS 'HIS员工id';;
      `
    );
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
