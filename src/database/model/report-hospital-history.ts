import {
  Column,
  Comment,
  DataType,
  ForeignKey,
  BelongsTo,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {Hospital} from './hospital';
import {CheckSystem} from './check_system';

@Table({tableName: 'report_hospital_history'})
export class ReportHospitalHistory extends Model<ReportHospitalHistory> {
  @PrimaryKey
  @Comment('日期')
  @Column({field: 'date', type: DataType.DATE})
  date;

  @PrimaryKey
  @Comment('机构id')
  @ForeignKey(() => Hospital)
  @Column({field: 'hospital'})
  hospitalId: string;

  @Comment('得分')
  @Column({field: 'score', type: DataType.FLOAT})
  score: number;

  @Comment('满分')
  @Column({field: 'totalScore', type: DataType.FLOAT})
  totalScore: number;

  @Comment('质量系数')
  @Column({field: 'rate', type: DataType.FLOAT})
  rate: number;

  @BelongsTo(() => Hospital)
  hospital: Hospital;

  @Comment('考核体系id')
  @ForeignKey(() => CheckSystem)
  @Column({field: 'check_id', type: DataType.UUID})
  checkId;
  @BelongsTo(() => CheckSystem)
  checkSystem: CheckSystem;
}
