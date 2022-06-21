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
import {AreaVoucherMigration} from './034_area_voucher';
import {CheckYearMigration} from './035_check_year';
import {CleanTableMigration} from './036_table_clean';
import {AreaBudgetMigration} from './037_area_budget';
import {AuditMigration} from './038_audit';
import {HisMigration} from './039_his';
import {DropStaffVirtualMigration} from './040_drop_staff_virtual';
import {AddWorkRemarkMigration} from './041_add_work_remark';
import {IncreaseSourceSizeMigration} from './042_change_source_size';
import {AddWorkItemTypeMigration} from './043_add_work_item_type';
import {AddStaffPhStaffMigration} from './044_add_staff_ph_staff';
import {UpdateStaffMigration} from './045_update_staff';
import {AddStaffOccupationMigration} from './046_add_staff_occupation';
import {AddHisCheckRuleFieldLengthMigration} from './047_add_his_check_rule_field_length';
import {AddBasicDataUniqueMigration} from './048_add_basic_data_unique';
import {AddHisWorkItemStepsMigration} from './049_his_work_item_steps';
import {AddStaffMappingMigration} from './050_add_staff_mapping';
import {RemoveScoreRemarkHistoryMigration} from './051_remove_score_remark_history';
import {AddStaffRequest} from './052_add_staff_request';
import {AddSMS} from './053_add_user_sms';
import {AddWechat} from './054_wechat';
import {AddHisSetting} from './055_add_his_setting';
import {UpdateStaffRequest} from './056_update_staff_request';
import {AddStaffResult} from './057_add_staff_result';
import {AddNews} from './058_add_news';
import {AddNewsField} from './059_add_new_field';
import {UpdateNewsUrl} from './060_update_news_url';
import {UpdateNewsUuid} from './061_update_news_uuid';
import {AddNewsVirtual} from './062_add_news_virtual';
import {UpdateNewsCrawledDefault} from './063_update_news_crawled_default';
import {AddManualOrder} from './064_add_manual_order';
import {AddHospitalSettleRemark} from './065_add_hospital_settle_remark';
import {AddStaffRequestHide} from './066_add_staff_request_hide';
import {AddStaffStatus} from './067_add_staff_status';

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
  new AreaVoucherMigration(),
  new CheckYearMigration(),
  new CleanTableMigration(),
  new AreaBudgetMigration(),
  new AuditMigration(),
  new HisMigration(),
  new DropStaffVirtualMigration(),
  new AddWorkRemarkMigration(),
  new IncreaseSourceSizeMigration(),
  new AddWorkItemTypeMigration(),
  new AddStaffPhStaffMigration(),
  new UpdateStaffMigration(),
  new AddStaffOccupationMigration(),
  new AddHisCheckRuleFieldLengthMigration(),
  new AddBasicDataUniqueMigration(),
  new AddHisWorkItemStepsMigration(),
  new AddStaffMappingMigration(),
  new RemoveScoreRemarkHistoryMigration(),
  new AddStaffRequest(),
  new AddSMS(),
  new AddWechat(),
  new AddHisSetting(),
  new UpdateStaffRequest(),
  new AddStaffResult(),
  new AddNews(),
  new AddNewsField(),
  new UpdateNewsUrl(),
  new UpdateNewsUuid(),
  new AddNewsVirtual(),
  new UpdateNewsCrawledDefault(),
  new AddManualOrder(),
  new AddHospitalSettleRemark(),
  new AddStaffRequestHide(),
  new AddStaffStatus()
];
