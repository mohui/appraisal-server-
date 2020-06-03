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
import {Hospital} from './hospital';

@Table({tableName: 'report_hospital'})
export class ReportHospital extends Model<ReportHospital> {
  @Comment('机构')
  @PrimaryKey
  @ForeignKey(() => Hospital)
  @Column({field: 'hospital', type: DataType.UUID})
  hospitalId: string;

  @BelongsTo(() => Hospital)
  hospital: Hospital;

  @Comment('工分')
  @AllowNull(false)
  @Column
  workpoints: number;

  @Comment('得分')
  @AllowNull(false)
  @Column(DataType.FLOAT)
  scores: number;
}
