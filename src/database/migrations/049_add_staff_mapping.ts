import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {v4 as uuid} from 'uuid';

export class AddStaffMappingMigration implements IMigration {
  name = '增加员工和地区绑定表,员工和his员工绑定表,员工和公卫员工绑定表';
  version = 49;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(
      `
        comment on column staff.hospital is '主机构';
        comment on column staff.staff is '(绑定的HIS员工)弃用';
        comment on column staff.account is '登录名';
        comment on column staff.password is '密码';
        comment on column staff.name is '名称';
        comment on column staff.remark is '备注';
        comment on column staff.department is '主机构科室';
        comment on column staff.ph_staff is '(绑定的公卫员工)弃用';
        comment on column staff.phone is '联系电话';
        comment on column staff.gender is '性别; 男,女,未说明的性别,未知的性别';
        comment on column staff.major is '专业类别';
        comment on column staff.title is '职称名称';
        comment on column staff.education is '学历';
        comment on column staff."isGP" is '是否为全科医师';

        CREATE TABLE IF NOT EXISTS "staff_area_mapping" -- 用户地区关联表
        (
          "id"         VARCHAR(36)                                        NOT NULL primary key,
          "staff"      VARCHAR(36)                                        NOT NULL,
          "area"       VARCHAR(36)                                        NOT NULL,
          "department" VARCHAR(36),
          remark       VARCHAR(500),
          "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          UNIQUE ("staff", "area")
        );
        COMMENT ON COLUMN "staff_area_mapping"."id" IS '主键';
        COMMENT ON COLUMN "staff_area_mapping"."staff" IS '员工id';
        COMMENT ON COLUMN "staff_area_mapping"."area" IS '地区id';
        COMMENT ON COLUMN "staff_area_mapping"."department" IS '科室id';
        COMMENT ON COLUMN "staff_area_mapping"."remark" IS '备注';

        CREATE TABLE IF NOT EXISTS "staff_ph_mapping"
        (
          "id"         VARCHAR(36)                                        NOT NULL primary key,
          "staff"      VARCHAR(36)                                        NOT NULL,
          "ph_staff"   VARCHAR(64)                                        NOT NULL,
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
          "his_staff"  VARCHAR(64)                                        NOT NULL,
          "created_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          "updated_at" TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
          UNIQUE ("staff", "his_staff")
        );
        COMMENT ON COLUMN "staff_his_mapping"."id" IS '主键';
        COMMENT ON COLUMN "staff_his_mapping"."staff" IS '员工id';
        COMMENT ON COLUMN "staff_his_mapping"."his_staff" IS 'HIS员工id';

        -- 添加地区字段
        ALTER table his_staff_extra_score
          ADD COLUMN area varchar(36);
        COMMENT ON COLUMN his_staff_extra_score."area" IS '地区id';

        update his_staff_extra_score
        set area=s.hospital
        from staff s
        where his_staff_extra_score.staff = s.id;

        -- 删除语句
        delete from his_staff_extra_score where area is null;

        --area字段设置非空
        alter table his_staff_extra_score alter area drop not null;

        --修改联合主键
        alter table his_staff_extra_score
          drop constraint his_staff_extra_score_pkey;

        alter table his_staff_extra_score
          add constraint his_staff_extra_score_pkey
            primary key (staff, month, area);
      `
    );

    const staffModels = await client.execute(
      // language=PostgreSQL
      `
        select *
        from staff
      `
    );
    for (const staffIt of staffModels) {
      if (staffIt.hospital) {
        await client.execute(
          // language=PostgreSQL
          `
            insert into staff_area_mapping(id, staff, area, department, remark)
            values (?, ?, ?, ?, ?)
            on conflict (staff,area)
              do update set updated_at = now(),
                            department = ?,
                            remark     = ?
          `,
          uuid(),
          staffIt.id,
          staffIt.hospital,
          staffIt.department,
          staffIt.remark,
          staffIt.department,
          staffIt.remark
        );
      }
      if (staffIt.staff) {
        await client.execute(
          // language=PostgreSQL
          `
            insert into staff_his_mapping(id, staff, his_staff)
            values (?, ?, ?)
            on conflict (staff,his_staff)
              do update set updated_at = now()
          `,
          uuid(),
          staffIt.id,
          staffIt.staff
        );
      }
      if (staffIt.ph_staff) {
        await client.execute(
          // language=PostgreSQL
          `
            insert into staff_ph_mapping(id, staff, ph_staff)
            values (?, ?, ?)
            on conflict (staff,ph_staff)
              do update set updated_at = now()
          `,
          uuid(),
          staffIt.id,
          staffIt.ph_staff
        );
      }
    }
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
