import {
  AllowNull,
  BelongsTo,
  Column,
  Comment,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {CheckRule} from './check_rule';
import {UUIDV4} from 'sequelize';

@Table({tableName: 'rule_tag'})
export class RuleTag extends Model<RuleTag> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  id: string;

  @Comment('考核细则id')
  @AllowNull(false)
  @ForeignKey(() => CheckRule)
  @Column({field: 'rule', type: DataType.UUID})
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

  @Comment('分值')
  @AllowNull(false)
  @Column(DataType.FLOAT)
  score: number;
}
