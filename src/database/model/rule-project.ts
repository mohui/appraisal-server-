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

@Table({tableName: 'rule_project'})
export class RuleProject extends Model<RuleProject> {
  @Comment('考核小则id')
  @AllowNull(false)
  @PrimaryKey
  @ForeignKey(() => CheckRule)
  @Column({field: 'rule', type: DataType.UUID})
  ruleId: string;

  @BelongsTo(() => CheckRule)
  rule: CheckRule;

  @Comment('工分项')
  @AllowNull(false)
  @PrimaryKey
  @Column({field: 'projectName', type: DataType.STRING})
  projectName;
}
