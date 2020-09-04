import {
  Column,
  Comment,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {Hospital} from './hospital';

@Table({tableName: 'report_hospital_history'})
export class ReportHospitalHistory extends Model<ReportHospitalHistory> {
  @PrimaryKey
  @Comment('日期')
  @Column({field: 'date'})
  date: string;

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
}
