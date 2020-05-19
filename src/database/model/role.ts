import {
  BelongsToMany,
  Column,
  Comment,
  Default,
  Model,
  PrimaryKey,
  Table,
  Unique,
  DataType
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {User} from './user';
import {UserRole} from './user_role';

@Table({tableName: 'role'})
export class Role extends Model<Role> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  id: string;

  @Unique
  @Comment('角色名')
  @Column(DataType.STRING)
  name: string;

  @BelongsToMany(
    () => User,
    () => UserRole
  )
  users: User[];
}
