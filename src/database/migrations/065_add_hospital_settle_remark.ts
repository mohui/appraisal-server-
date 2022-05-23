import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddHospitalSettleRemark implements IMigration {
  name = '考核结算表添加备注字段';
  version = 65;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table his_hospital_settle
        ADD COLUMN remark text not null DEFAULT '';
      COMMENT ON COLUMN his_hospital_settle."remark" IS '备注';

      comment on table his_hospital_settle is '考核结算和手工数据备注表';

    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
