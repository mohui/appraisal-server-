import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddStaffResult implements IMigration {
  name = '结果表添加员工姓名和员工所在机构字段';
  version = 57;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table his_staff_work_result
        ADD COLUMN hospital varchar(36) DEFAULT null;
      COMMENT ON COLUMN his_staff_work_result."hospital" IS '机构';

      ALTER table his_staff_work_result
        ADD COLUMN staff_name varchar(255) DEFAULT null;
      COMMENT ON COLUMN his_staff_work_result."hospital" IS '员工名称';

      ALTER table his_staff_assess_result
        ADD COLUMN hospital varchar(36) DEFAULT null;
      COMMENT ON COLUMN his_staff_assess_result."hospital" IS '机构';

      ALTER table his_staff_assess_result
        ADD COLUMN staff_name varchar(255) DEFAULT null;
      COMMENT ON COLUMN his_staff_assess_result."hospital" IS '员工名称';

      update his_staff_work_result
      set hospital = staff.hospital, staff_name = staff.name
      from  staff  where his_staff_work_result.staff_id = staff.id;

      update his_staff_assess_result
      set hospital = staff.hospital, staff_name = staff.name
      from  staff  where his_staff_assess_result.staff_id = staff.id
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
