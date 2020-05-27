import {
  AllowNull,
  BelongsTo,
  Column,
  Comment,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table
} from 'sequelize-typescript';
import {CheckRule} from './check_rule';
import {Hospital} from './hospital';

@Table({tableName: 'rule_hospital'})
export class RuleHospital extends Model<RuleHospital> {
  @Comment('考核细则id')
  @AllowNull(false)
  @ForeignKey(() => CheckRule)
  @Column({field: 'rule_id', type: DataType.UUID})
  ruleId: string;

  @BelongsTo(() => CheckRule)
  rule: CheckRule;

  @Comment('机构')
  @AllowNull(false)
  @ForeignKey(() => Hospital)
  @Column({field: 'hospital', type: DataType.UUID})
  hospitalId: string;

  @BelongsTo(() => Hospital)
  hospital: Hospital;

  @Comment('是否自动打分, 默认是')
  @Default(true)
  @Column
  auto: boolean;
}
