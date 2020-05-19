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

@Table({tableName: 'permission'})
export class Permission extends Model<Permission> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键')
  @Column(DataType.UUID)
  id: string;

  @Column(DataType.STRING)
  @Comment('权限名')
  name: string;

  @Column(DataType.STRING)
  @Comment('权限类型')
  type: string;

  @BelongsToMany(
    () => Role,
    () => Permission
  )
  roles: Role[];
}
