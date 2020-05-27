import {IMigration} from '../migrater';
import {InitMigration} from './000_init';
import {UserMigration} from './001_user';
import {RegionIMigration} from './003_region';
import {CheckSystemMigration} from './002_check_system';

//定义好的数据迁移任务放入到数组中,顺序任意
export const migrations: IMigration[] = [
  new InitMigration(),
  new UserMigration(),
  new RegionIMigration(),
  new CheckSystemMigration()
];
