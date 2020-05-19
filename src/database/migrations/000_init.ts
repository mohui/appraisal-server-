import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class InitMigration implements IMigration {
  name = '数据库初始化';
  version = 0;

  async up(client: ExtendedSequelize): Promise<void> {
    return;
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
