import {
  AllowNull,
  BelongsTo,
  Column,
  Comment,
  DataType,
  ForeignKey,
  Model,
  Table
} from 'sequelize-typescript';
import {CheckRule} from './check_rule';

@Table({tableName: 'rule_tag'})
export class RuleTag extends Model<RuleTag> {
  @Comment('考核细则id')
  @AllowNull(false)
  @ForeignKey(() => CheckRule)
  @Column({field: 'rule_id', type: DataType.UUID})
  ruleId: string;

  @BelongsTo(() => CheckRule)
  rule: CheckRule;

  @Comment('考核指标')
  @AllowNull(false)
  @Column
  tag: string;

  @Comment('计算方式')
  @AllowNull(false)
  @Column
  algorithm: string;

  @Comment('参考值; 个别计算方式, 需要参考值')
  @Column
  baseline: number;
}
