import {Table, Model, ForeignKey, Column} from 'sequelize-typescript';
import {User} from './user';
import {Hospital} from './hospital';

@Table({tableName: 'user_hospital_mapping'})
export class UserHospital extends Model<UserHospital> {
  @ForeignKey(() => User)
  @Column({field: 'user_id', allowNull: false})
  userId: string;

  @ForeignKey(() => Hospital)
  @Column({field: 'hospital_id', allowNull: false})
  hospitalId: string;
}
