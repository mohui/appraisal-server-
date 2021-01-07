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
import {ReportHospitalHistory} from './report-hospital-history';

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

  @Comment('创建人')
  @Column
  create_by: string;

  @Comment('修改人')
  @Column
  update_by: string;

  @Comment('考核年度')
  @Column
  checkYear: number;

  @Comment('状态:默认为true')
  @Default(true)
  @Column
  status: boolean;

  @Comment('备注')
  @Column
  remarks: string;

  @Comment('考核类型: 默认为0; 1: 主考核; 0: 临时考核')
  @Column({field: 'check_type'})
  checkType: number;

  @Comment('跑分时间')
  @Column({field: 'run_time'})
  runTime: Date;

  @HasMany(() => ReportHospitalHistory)
  reportHospitalHistories: ReportHospitalHistory[];
}
