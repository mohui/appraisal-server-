import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddStaffOccupationMigration implements IMigration {
  name = '员工表添加职业信息';
  version = 46;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      ALTER table staff ADD COLUMN phone varchar(30) DEFAULT null;
      COMMENT ON COLUMN staff."phone" IS '联系电话';

      ALTER table staff ADD COLUMN gender varchar(255) not null DEFAULT '未知的性别';
      COMMENT ON COLUMN staff.gender IS '性别; 男,女,未说明的性别,未知的性别';

      ALTER table staff ADD COLUMN major varchar(255) DEFAULT null;
      COMMENT ON COLUMN staff.major IS '专业类别';

      ALTER table staff ADD COLUMN title varchar(255) DEFAULT null;
      COMMENT ON COLUMN staff.title IS '职称名称';

      ALTER table staff ADD COLUMN education varchar(255) DEFAULT null;
      COMMENT ON COLUMN staff.education IS '学历; 专科及以下, 本科, 硕士, 博士';

      ALTER table staff ADD COLUMN "isGP" boolean not null DEFAULT false;
      COMMENT ON COLUMN staff."isGP" IS '是否为全科医师';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
