import {
  AllowNull,
  Column,
  Comment,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {CheckRule} from '../check_rule';

@Table({tableName: 'rule_area_budget'})
export class RuleAreaBudget extends Model<RuleAreaBudget> {
  @Comment('考核小项id')
  @PrimaryKey
  @ForeignKey(() => CheckRule)
  @Column({field: 'rule', type: DataType.UUID})
  ruleId: string;

  @Comment('地区code')
  @PrimaryKey
  @Column({field: 'area', type: DataType.UUID})
  areaCode: string;

  @Comment('分配金额')
  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(15, 4))
  budget: number;

  @Comment('参与校正的工分值')
  @AllowNull(false)
  @Default(0)
  @Column({field: 'workPoint', type: DataType.FLOAT})
  workPoint;

  @Comment('校正后的工分值')
  @AllowNull(false)
  @Default(0)
  @Column({field: 'correctWorkPoint', type: DataType.FLOAT})
  correctWorkPoint;

  @Comment('质量系数')
  @AllowNull(false)
  @Default(0)
  @Column({field: 'rate', type: DataType.FLOAT})
  rate;

  @Comment('规则得分')
  @AllowNull(false)
  @Default(0)
  @Column({field: 'score', type: DataType.FLOAT})
  score;

  @Comment('规则满分')
  @AllowNull(false)
  @Default(0)
  @Column({field: 'totalScore', type: DataType.FLOAT})
  totalScore;
}
