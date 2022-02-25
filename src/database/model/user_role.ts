import {Column, ForeignKey, Model, Table} from 'sequelize-typescript';

@Table({tableName: 'user_role_mapping'})
export class UserRole extends Model<UserRole> {
  @Column({field: 'user_id', allowNull: false})
  userId: string;

  @Column({field: 'role_id', allowNull: false})
  roleId: string;
}
