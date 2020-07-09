import {
  AllowNull,
  BelongsTo,
  Column,
  Comment,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {CheckRule} from './check_rule';
import {Hospital} from './hospital';

@Table({tableName: 'rule_hospital_budget'})
export class RuleHospitalBudget extends Model<RuleHospitalBudget> {
  @Comment('考核小项id')
  @AllowNull(false)
  @PrimaryKey
  @ForeignKey(() => CheckRule)
  @Column({field: 'rule', type: DataType.UUID})
  ruleId: string;

  @BelongsTo(() => CheckRule)
  rule: CheckRule;

  @Comment('机构id')
  @AllowNull(false)
  @PrimaryKey
  @ForeignKey(() => Hospital)
  @Column({field: 'hospital', type: DataType.UUID})
  hospitalId: string;

  @BelongsTo(() => Hospital)
  hospital: Hospital;

  @Comment('分配金额')
  @AllowNull(false)
  @Column(DataType.FLOAT)
  budget: number;
}
