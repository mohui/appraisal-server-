import {IMigration} from '../migrater';
import {InitMigration} from './000_init';

//定义好的数据迁移任务放入到数组中,顺序任意
export const migrations: IMigration[] = [new InitMigration()];
