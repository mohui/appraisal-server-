import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddWechat implements IMigration {
  name = '添加微信AccessToken表';
  version = 54;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      create table if not exists wx_access_token
      (
        id         varchar(255) primary key,
        token      varchar(255),
        expired_at timestamp,
        created_at TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE default CURRENT_TIMESTAMP NOT NULL
      );
      comment on table wx_access_token is '微信AccessToken表';
      comment on column wx_access_token.id is '主键';
      comment on column wx_access_token.token is '微信access token';
      comment on column wx_access_token.expired_at is '过期时间';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
