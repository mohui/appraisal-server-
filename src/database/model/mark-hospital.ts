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

@Table({tableName: 'mark_hospital'})
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

  @Default(0)
  @Column({field: 'O00'})
  O00: number;

  @Default(0)
  @Column({field: 'O02'})
  O02: number;

  @Default(0)
  @Column({field: 'H00'})
  H00: number;

  @Default(0)
  @Column({field: 'H01'})
  H01: number;

  @Default(0)
  @Column({field: 'H02'})
  H02: number;

  @Default(0)
  @Column({field: 'D00'})
  D00: number;

  @Default(0)
  @Column({field: 'D01'})
  D01: number;

  @Default(0)
  @Column({field: 'D02'})
  D02: number;
}
