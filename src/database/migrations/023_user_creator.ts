import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class UserCreatorMigration implements IMigration {
  name = '用户添加创建者字段';
  version = 23;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      alter table "user"
        add column if not exists creator uuid default null
          references "user" ("id") on delete set null on update cascade;

      alter table "user"
        add column if not exists editor uuid default null
          references "user" ("id") on delete set null on update cascade;
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
