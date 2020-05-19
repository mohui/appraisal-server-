import {Column, ForeignKey, Model, Table} from 'sequelize-typescript';
import {Permission} from './permission';
import {Role} from './role';

@Table({tableName: 'role_permission'})
export class RolePermission extends Model<RolePermission> {
  @ForeignKey(() => Role)
  @Column({field: 'role_id', allowNull: false})
  roleId: string;

  @ForeignKey(() => Permission)
  @Column({field: 'permission_id', allowNull: false})
  permissionId: string;
}
