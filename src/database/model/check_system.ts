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
  checkId: string;

  //一对多个考核规则
  @HasMany(() => CheckRule)
  checkRules: CheckRule[];

  @Comment('考核名称')
  @AllowNull(false)
  @Column
  checkName: string;

  @Comment('得分')
  @AllowNull(false)
  @Column
  total: number;

  @Comment('省编码')
  @Column
  provinceCode: string;

  @Comment('省名称')
  @Column
  provinceName: string;

  @Comment('市编码')
  @Column
  cityCode: string;

  @Comment('市名称')
  @Column
  cityName: string;

  @Comment('区编码')
  @Column
  districtCode: string;

  @Comment('区名称')
  @Column
  districtName: string;

  @Comment('创建人')
  @Column
  create_by: string;

  @Comment('修改人')
  @Column
  update_by: string;

  @Comment('考核年度')
  @Column
  checkYear: string;

  @Comment('状态:')
  @Column
  status: string;

  @Comment('备注')
  @Column
  remarks: string;
}
