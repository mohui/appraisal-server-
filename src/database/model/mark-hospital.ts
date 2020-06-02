import {
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

@Table({tableName: 'mark-hospital'})
export class MarkHospital extends Model<MarkHospital> {
  @Comment('机构')
  @PrimaryKey
  @ForeignKey(() => Hospital)
  @Column({field: 'hospital', type: DataType.UUID})
  hospitalId: string;

  @BelongsTo(() => Hospital)
  hospital: Hospital;

  @Comment('健康档案总数')
  @Default(0)
  @Column({field: 'S00'})
  S00: number;

  @Comment('健康档案规范数')
  @Default(0)
  @Column({field: 'S23'})
  S23: number;

  @Comment('健康档案使用数')
  @Default(0)
  @Column({field: 'S03'})
  S03: number;
}
