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
  @Default(0)
  @Column
  workpoints: number;

  @Comment('得分')
  @Default(0)
  @Column(DataType.FLOAT)
  scores: number;

  @Comment('满分')
  @Default(0)
  @Column(DataType.FLOAT)
  total: number;

  @Comment('金额')
  @Default(0)
  @Column(DataType.DECIMAL(20, 4))
  budget: number;
}
