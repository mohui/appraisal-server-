import {IMigration} from '../migrater';
import {InitMigration} from './000_init';
import {UserMigration} from './001_user';
import {RegionIMigration} from './003_region';
import {CheckSystemMigration} from './002_check_system';
import {BasicTagMigration} from './004_basic_tag';
import {UserHospitalIMigration} from './005_user_hospital';
import {RuleScoreMigration} from './006_rule_score';
import {UserRegionMigration} from './007_user_region';
import {TagEditorMigration} from './008_tag_editor';
import {ScoreMigration} from './009_score';
import {CheckHospitalMigration} from './010_check_hospital';

//定义好的数据迁移任务放入到数组中,顺序任意
export const migrations: IMigration[] = [
  new InitMigration(),
  new UserMigration(),
  new RegionIMigration(),
  new CheckSystemMigration(),
  new BasicTagMigration(),
  new UserHospitalIMigration(),
  new RuleScoreMigration(),
  new UserRegionMigration(),
  new TagEditorMigration(),
  new ScoreMigration(),
  new CheckHospitalMigration()
];
