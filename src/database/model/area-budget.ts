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
import {Region} from './region';

@Table({tableName: 'area_budget'})
export class AreaBudget extends Model<AreaBudget> {
  @Comment('地区')
  @PrimaryKey
  @ForeignKey(() => Region)
  @Column({field: 'region_id'})
  regionId: string;

  @BelongsTo(() => Region)
  region: Region;

  @Comment('金额')
  @Default(0)
  @Column({type: DataType.DECIMAL(15, 4)})
  budget: number;
}
