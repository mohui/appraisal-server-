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
  @Column({field: 'check', type: DataType.UUID})
  checkId: string;

  @Comment('地区code')
  @PrimaryKey
  @Column({field: 'area'})
  areaCode: string;

  @Comment('校正后的工分值')
  @AllowNull(false)
  @Default(0)
  @Column({field: 'correctWorkPoint', type: DataType.FLOAT})
  correctWorkPoint;

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

  // 暂存考核体系总分, 用于质量系数计算
  totalScore: number;

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
