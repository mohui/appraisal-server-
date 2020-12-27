import {
  AllowNull,
  BelongsTo,
  Column,
  Comment,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {CheckSystem} from './check_system';
import {RuleTag} from './rule-tag';
import {RuleHospitalScore} from './rule-hospital-score';
import {RuleHospital} from './rule-hospital';
import {RuleProject} from './rule-project';
import {RuleHospitalBudget} from './rule-hospital-budget';
import {ScoreRemarkHistory} from './score-remark-history';

@Table({tableName: 'check_rule'})
export class CheckRule extends Model<CheckRule> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  ruleId: string;

  @Comment('规则名称')
  @AllowNull(false)
  @Column
  ruleName: string;

  @Comment('父规则id')
  @Column
  parentRuleId: string;

  @ForeignKey(() => CheckSystem)
  @AllowNull(false)
  @Column
  checkId: string;

  //多对一个考核系统
  @BelongsTo(() => CheckSystem)
  checkSystem: CheckSystem;

  @Comment('得分')
  @Column
  ruleScore: number;

  @Comment('考核标准')
  @Column
  checkStandard: string;

  @Comment('考核方法')
  @Column
  checkMethod: string;

  @Comment('评分标准')
  @Column
  evaluateStandard: string;

  @Comment('创建人')
  @Column
  create_by: string;

  @Comment('修改人')
  @Column
  update_by: string;

  @Comment('状态')
  @Column
  status: boolean;

  @Comment('金额')
  @Default(0)
  @Column({type: DataType.DECIMAL(15, 4)})
  budget: number;

  @HasMany(() => RuleTag)
  ruleTags: RuleTag[];

  @HasMany(() => RuleHospitalScore)
  ruleHospitalScores: RuleHospitalScore[];

  @HasMany(() => RuleHospital)
  ruleHospitals: RuleHospital[];

  @HasMany(() => RuleProject)
  ruleProject: RuleProject[];

  @HasMany(() => RuleHospitalBudget)
  ruleHospitalBudget: RuleHospitalBudget[];

  @HasMany(() => ScoreRemarkHistory)
  scoreRemarkHistory: ScoreRemarkHistory[];
}
