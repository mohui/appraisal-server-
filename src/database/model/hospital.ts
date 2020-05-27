import {
  BelongsTo,
  BelongsToMany,
  Column,
  Comment,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {Region} from './region';
import {User} from './user';
import {UserHospital} from './user_hospital';

@Table({tableName: 'hospital'})
export class Hospital extends Model<Hospital> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  id: string;

  @Comment('机构名称')
  @Column
  name: string;

  @Comment('上级机构id')
  @Column
  parent: string;

  @ForeignKey(() => Region)
  @Column({field: 'region'})
  regionId: string;

  //多对一个行政地区
  @BelongsTo(() => Region)
  region: Region;

  //多对多用户
  @BelongsToMany(
    () => User,
    () => UserHospital
  )
  users: User[];
}
