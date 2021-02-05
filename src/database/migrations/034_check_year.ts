import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {BasicTagUsages} from '../../../common/rule-score';
import {v4 as uuid} from 'uuid';

export class CheckYearMigration implements IMigration {
  name = '考核年份改为int型';
  version = 34;

  async up(client: ExtendedSequelize): Promise<void> {
    return;
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
