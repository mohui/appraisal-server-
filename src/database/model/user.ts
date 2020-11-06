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
  Table,
  Unique
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {Role} from './role';
import {UserRole} from './user_role';
import {Hospital} from './hospital';
import {UserHospital} from './user_hospital';
import {Region} from './region';

@Table({tableName: 'user'})
export class User extends Model<User> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  id: string;

  @Unique
  @Comment('登录名')
  @Column
  account: string;

  @Comment('用户名')
  @Column
  name: string;

  @Comment('密码')
  @Column
  password: string;

  //多对一个地区
  @ForeignKey(() => Region)
  @Comment('地区code')
  @Column({field: 'region'})
  regionId: string;

  @BelongsTo(() => Region)
  region: Region;

  @BelongsToMany(
    () => Role,
    () => UserRole
  )
  roles: Role[];

  //多对多机构
  @BelongsToMany(
    () => Hospital,
    () => UserHospital
  )
  hospitals: Hospital[];

  //多对一个创建者
  @Comment('创建者id')
  @Column({field: 'creator'})
  creatorId: string;

  @BelongsTo(() => User, {
    foreignKey: 'creatorId',
    as: 'creator'
  })
  creator;

  //多对一个修改者
  @Comment('修改者id')
  @Column({field: 'editor'})
  editorId: string;

  @BelongsTo(() => User, {
    foreignKey: 'editorId',
    as: 'editor'
  })
  editor;
}
