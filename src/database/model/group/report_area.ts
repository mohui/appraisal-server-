import {
  AllowNull,
  Column,
  Comment,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';

@Table({tableName: 'report_area'})
export class ReportArea extends Model<ReportArea> {
  @Comment('考核id')
  @PrimaryKey
  @Column({field: 'check'})
  checkId: string;

  @Comment('地区code')
  @PrimaryKey
  @Column({field: 'area'})
  areaCode: string;

  @Comment('参与校正的工分值')
  @Default(0)
  @Column(DataType.FLOAT)
  workPoint: number;

  @Comment('校正前的工分值')
  @Default(0)
  @Column(DataType.FLOAT)
  totalWorkPoint: number;

  @Comment('得分')
  @Default(0)
  @Column(DataType.FLOAT)
  score: number;

  @Comment('质量系数')
  @AllowNull(false)
  @Default(0)
  @Column(DataType.FLOAT)
  rate;
}
