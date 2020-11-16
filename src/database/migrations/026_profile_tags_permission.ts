import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {Permission} from '../../../common/permission';

export class ProfileTagsDetailMigration implements IMigration {
  name = '补全指标详情的权限';
  version = 26;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      --拥有'个人档案权限'角色都补上'指标详情权限'
      update role
      set permissions=permissions || '{${Permission.TAGS_DETAIL}}'
      where '${Permission.PROFILE}' = ANY (role.permissions);
    `);
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    // language=PostgreSQL
    return;
  }
}
