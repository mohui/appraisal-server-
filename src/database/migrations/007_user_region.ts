import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UserRegionMigration implements IMigration {
  name = "用户添加'行政区域'字段";
  version = 7;

  async up(client: ExtendedSequelize): Promise<void> {
    await client.execute(`
        ALTER TABLE "user" ADD column IF NOT EXISTS region VARCHAR(255);
    `);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async down(client: ExtendedSequelize, err?: Error): Promise<void> {}
}
