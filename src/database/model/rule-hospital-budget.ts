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
  @Column(DataType.DECIMAL(15, 4))
  budget: number;

  @Comment('原始工分')
  @Column({field: 'workpoint', type: DataType.FLOAT})
  workPoint;

  @Comment('矫正工分')
  @Column({field: 'correctworkpoint', type: DataType.FLOAT})
  correctWorkPoint;

  @Comment('质量系数')
  @Column({field: 'rate', type: DataType.FLOAT})
  rate;

  @Comment('规则得分')
  @Column({field: 'rulescore', type: DataType.FLOAT})
  ruleScore;

  @Comment('规则满分')
  @Column({field: 'ruletotalscore', type: DataType.FLOAT})
  ruleTotalScore;
}
