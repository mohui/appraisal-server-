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
import {Area} from './area';
import {CheckSystem} from '../check_system';

@Table({tableName: 'check_area'})
export class CheckArea extends Model<CheckArea> {
  @Comment('考核id')
  @PrimaryKey
  @AllowNull(false)
  @ForeignKey(() => CheckSystem)
  @Column({field: 'check_system', type: DataType.UUID})
  checkId: string;

  @BelongsTo(() => CheckSystem)
  checkSystem: CheckSystem;

  @Comment('地区id')
  @PrimaryKey
  @AllowNull(false)
  @ForeignKey(() => Area)
  @Column({field: 'area', type: DataType.UUID})
  areaCode: string;

  @BelongsTo(() => Area)
  area: Area;
}
