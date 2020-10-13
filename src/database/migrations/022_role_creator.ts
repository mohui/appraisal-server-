import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class RoleCreatorMigration implements IMigration {
  name = '角色添加创建者字段';
  version = 22;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      alter table "role"
        add column if not exists creator uuid default null
          references "user" ("id") on delete set null on update cascade;
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
