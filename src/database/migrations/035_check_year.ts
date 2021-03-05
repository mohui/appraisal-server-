import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class CheckYearMigration implements IMigration {
  name = '考核年份改为int型';
  version = 35;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(
      `ALTER TABLE check_system ALTER COLUMN check_year TYPE integer USING (check_year::integer);`
    );
    await client.execute(
      `ALTER TABLE area_voucher ALTER COLUMN year TYPE integer USING (year::integer);`
    );
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
