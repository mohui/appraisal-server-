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
import {RuleHospitalAttachMigration} from './011_rule_hospital_attatch';
import {RuleAttachDateRangeMigration} from './012_rule_attach_daterange';
import {BudgetMigration} from './013_area_budget';
import {BasicTagValueMigration} from './014_basic_tag_value';
import {RuleBudgetMigration} from './015_rule_budget';
import {RuleProjectMigration} from './016_rule_project';
import {RuleHospitalBudgetMigration} from './017_rule_hospital_budget';
import {CheckConstraintMigration} from './018_check_constraint';
import {RuleHospitalBudgetColumnMigration} from './019_rule_hospital_budget';
import {WorkDifficultyMigration} from './020_work_difficulty';
import {ReportHospitalHistoryMigration} from './021_report_hospital_history';
import {RoleCreatorMigration} from './022_role_creator';
import {UserCreatorMigration} from './023_user_creator';
import {AlterCheckSystemMigration} from './024_check_system';
import {DeleteRuleHospitalScoreRepeatDataMigration} from './025_rule_hospital_score';
import {ProfileTagsDetailMigration} from './026_profile_tags_permission';
import {ScoreRemarkHistoryMigration} from './027_score_remark_history';
import {GroupMigration} from './028_group';
import {BasicTagDelYearMigration} from './029_basic_tag';
import {RuleDetailsMigration} from './030_rule_details';
import {BasicTagAddYearMigration} from './031_basic_tag';
import {HE07Migration} from './032_HE07';
import {HE09Migration} from './033_HE09';
import {CheckYearMigration} from './034_check_year';
import {AreaVoucherMigration} from './034_area_voucher';

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
  new CheckHospitalMigration(),
  new RuleHospitalAttachMigration(),
  new RuleAttachDateRangeMigration(),
  new BudgetMigration(),
  new BasicTagValueMigration(),
  new RuleBudgetMigration(),
  new RuleProjectMigration(),
  new RuleHospitalBudgetMigration(),
  new CheckConstraintMigration(),
  new RuleHospitalBudgetColumnMigration(),
  new WorkDifficultyMigration(),
  new ReportHospitalHistoryMigration(),
  new RoleCreatorMigration(),
  new UserCreatorMigration(),
  new AlterCheckSystemMigration(),
  new DeleteRuleHospitalScoreRepeatDataMigration(),
  new ProfileTagsDetailMigration(),
  new ScoreRemarkHistoryMigration(),
  new GroupMigration(),
  new BasicTagDelYearMigration(),
  new RuleDetailsMigration(),
  new BasicTagAddYearMigration(),
  new HE07Migration(),
  new HE09Migration(),
  new CheckYearMigration(),
  new HE09Migration(),
  new AreaVoucherMigration()
];
