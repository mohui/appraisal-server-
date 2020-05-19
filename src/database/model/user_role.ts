import {Column, ForeignKey, Model, Table} from 'sequelize-typescript';
import {User} from './user';
import {Role} from './role';

@Table({tableName: 'user_role'})
export class UserRole extends Model<UserRole> {
  @ForeignKey(() => User)
  @Column({field: 'user_id', allowNull: false})
  userId: string;

  @ForeignKey(() => Role)
  @Column({field: 'role_id', allowNull: false})
  roleId: string;
}
