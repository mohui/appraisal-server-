import {
  BelongsToMany,
  Column,
  Comment,
  DataType,
  HasMany,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {Hospital} from './hospital';
import {User} from './user';

@Table({tableName: 'region'})
export class Region extends Model<Region> {
  @PrimaryKey
  @Comment('主键')
  @Column
  code: string;

  @Comment('行政名称')
  @Column
  name: string;

  @Comment('行政级别')
  @Column
  level: number;

  @Comment('上级行政code')
  @Column
  parent: string;

  //一对多个机构
  @HasMany(() => Hospital)
  hospitals: Hospital[];

  //一对多个用户
  @HasMany(() => User)
  users: User[];
}
