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
import {CheckSystem} from './check_system';

@Table({tableName: 'check_hospital'})
export class CheckHospital extends Model<CheckHospital> {
  @Comment('考核id')
  @PrimaryKey
  @AllowNull(false)
  @ForeignKey(() => CheckSystem)
  @Column({field: 'check_system', type: DataType.UUID})
  checkId: string;

  @BelongsTo(() => CheckSystem)
  checkSystem: CheckSystem;

  @Comment('机构')
  @PrimaryKey
  @AllowNull(false)
  @ForeignKey(() => Hospital)
  @Column({field: 'hospital', type: DataType.UUID})
  hospitalId: string;

  @BelongsTo(() => Hospital)
  hospital: Hospital;
}
