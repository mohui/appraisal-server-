import {
  AllowNull,
  Column,
  Comment,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {Area} from './group/area';

@Table({tableName: 'area_voucher'})
export class AreaVoucher extends Model<AreaVoucher> {
  @PrimaryKey
  @AllowNull(false)
  @Column({field: 'year'})
  year: string;

  @PrimaryKey
  @AllowNull(false)
  @ForeignKey(() => Area)
  @Column({field: 'area'})
  area: string;

  @Column({field: 'money', type: DataType.FLOAT})
  money;

  @Column({field: 'vouchers', type: DataType.ARRAY(DataType.STRING)})
  vouchers;

  @Comment('打分时间')
  @Column({field: 'created_at', type: DataType.DATE})
  created_at;

  @Comment('更新时间')
  @Column({field: 'updated_at', type: DataType.DATE})
  updated_at;
}
