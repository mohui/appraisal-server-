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

@Table({tableName: 'report_area_history'})
export class ReportAreaHistory extends Model<ReportAreaHistory> {
  @Comment('日期')
  @PrimaryKey
  @Column({field: 'date', type: DataType.DATE})
  date: Date;

  @Comment('考核id')
  @PrimaryKey
  @Column({field: 'check', type: DataType.UUID})
  checkId: string;

  @Comment('地区code')
  @PrimaryKey
  @Column({field: 'area'})
  areaCode: string;

  @Comment('参与校正的工分值')
  @Default(0)
  @Column({field: 'workPoint', type: DataType.FLOAT})
  workPoint: number;

  @Comment('校正前的工分值')
  @Default(0)
  @Column({field: 'totalWorkPoint', type: DataType.FLOAT})
  totalWorkPoint: number;

  @Comment('得分')
  @Default(0)
  @Column(DataType.FLOAT)
  score: number;

  @Comment('质量系数')
  @AllowNull(false)
  @Default(0)
  @Column(DataType.FLOAT)
  rate: number;

  @Comment('分配金额')
  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(15, 4))
  budget: number;
}
