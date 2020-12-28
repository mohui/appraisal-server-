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
import {Hospital} from './hospital';
import {User} from './user';
import {UUIDV4} from 'sequelize';

@Table({tableName: 'score_remark_history'})
export class ScoreRemarkHistory extends Model<ScoreRemarkHistory> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  id: string;

  @Comment('考核小项id')
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

  @Comment('打分者')
  @ForeignKey(() => User)
  @Column({field: 'creator', type: DataType.UUID})
  creatorId;

  @BelongsTo(() => User)
  creator: User;

  @Comment('手动打分分数')
  @AllowNull(false)
  @Column({field: 'score', type: DataType.FLOAT})
  score;

  @Comment('备注说明')
  @Column({field: 'remark', type: DataType.STRING})
  remark;

  @Comment('打分时间')
  @Column({field: 'created_at', type: DataType.DATE})
  created_at;

  @Comment('更新时间')
  @Column({field: 'updated_at', type: DataType.DATE})
  updated_at;
}
