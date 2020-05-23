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
import {UUIDV4} from 'sequelize';
import {CheckSystem} from './check_system';

@Table({tableName: 'check_rule'})
export class CheckRule extends Model<CheckRule> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  rule_id: string;

  @Comment('规则名称')
  @AllowNull(false)
  @Column
  rule_name: string;

  @Comment('父规则id')
  @Column
  parent_rule_id: string;

  @ForeignKey(() => CheckSystem)
  @Column
  check_id: string;

  //多对一个考核系统
  @BelongsTo(() => CheckSystem)
  check_system: CheckSystem;

  @Comment('得分')
  @Column
  rule_score: string;

  @Comment('考核标准')
  @Column
  check_standard: string;

  @Comment('考核方法')
  @Column
  check_method: string;

  @Comment('评分标准')
  @Column
  evaluate_standard: string;

  @Comment('创建人')
  @Column
  create_by: string;

  @Comment('修改人')
  @Column
  update_by: string;

  @Comment('状态')
  @Column
  status: string;

  @Comment('关联指标id')
  @Default([])
  @Column({type: DataType.ARRAY(DataType.STRING)})
  standard_ids: string[];

  @Comment('关联的指标名称')
  @Default([])
  @Column({type: DataType.ARRAY(DataType.STRING)})
  standard_names: string[];
}
