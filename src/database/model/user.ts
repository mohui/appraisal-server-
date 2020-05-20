import {
  BelongsToMany,
  Column,
  Comment,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {Role} from './role';
import {UserRole} from './user_role';

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

  @BelongsToMany(
    () => Role,
    () => UserRole
  )
  roles: Role[];
}
