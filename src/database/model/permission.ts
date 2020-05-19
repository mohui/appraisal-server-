import {
  BelongsToMany,
  Column,
  Comment,
  Default,
  Model,
  PrimaryKey,
  Table,
  DataType
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {Role} from './role';
import {RolePermission} from './role_permission';

@Table({tableName: 'permission'})
export class Permission extends Model<Permission> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键')
  @Column(DataType.UUID)
  id: string;

  @Comment('权限名')
  @Column(DataType.STRING)
  name: string;

  @Comment('权限类型')
  @Column(DataType.STRING)
  type: string;

  @BelongsToMany(
    () => Role,
    () => RolePermission
  )
  roles: Role[];
}
