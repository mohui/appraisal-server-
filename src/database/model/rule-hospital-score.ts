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
import {Hospital} from './hospital';

@Table({tableName: 'rule_hospital_score'})
export class RuleHospitalScore extends Model<RuleHospitalScore> {
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

  @Comment('机构id')
  @AllowNull(false)
  @ForeignKey(() => Hospital)
  @Column({field: 'hospital', type: DataType.UUID})
  hospitalId: string;

  @BelongsTo(() => Hospital)
  hospital: Hospital;

  @Comment('得分')
  @AllowNull(false)
  @Column(DataType.FLOAT)
  score: number;
}
