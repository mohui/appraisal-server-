import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddBasicDataUniqueMigration implements IMigration {
  name = '增加基础数据的唯一约束';
  version = 48;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(
      `create unique index if not exists basic_tag_data_year_hospital_code_uindex on basic_tag_data (year, hospital, code)`
    );
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
