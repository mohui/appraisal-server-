import {
  AllowNull,
  Column,
  Comment,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {CheckRule} from './check_rule';

@Table({tableName: 'check_system'})
export class CheckSystem extends Model<CheckSystem> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  check_id: string;

  //一对多个考核规则
  @HasMany(() => CheckRule)
  check_rule: CheckRule;

  @Comment('考核名称')
  @AllowNull(false)
  @Column
  check_name: string;

  @Comment('得分')
  @AllowNull(false)
  @Column
  total: number;

  @Comment('省编码')
  @Column
  province_code: string;

  @Comment('省名称')
  @Column
  province_name: string;

  @Comment('市编码')
  @Column
  city_code: string;

  @Comment('市名称')
  @Column
  city_name: string;

  @Comment('区编码')
  @Column
  district_code: string;

  @Comment('区名称')
  @Column
  district_name: string;

  @Comment('创建人')
  @Column
  create_by: string;

  @Comment('修改人')
  @Column
  update_by: string;

  @Comment('考核年度')
  @Column
  check_year: string;

  @Comment('状态:')
  @Column
  status: string;

  @Comment('备注')
  @Column
  remarks: string;
}
