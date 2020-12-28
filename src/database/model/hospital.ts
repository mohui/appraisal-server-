import {
  BelongsTo,
  BelongsToMany,
  Column,
  Comment,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  HasOne,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {Region} from './region';
import {User} from './user';
import {UserHospital} from './user_hospital';
import {BasicTagData} from './basic-tag-data';
import {ReportHospital} from './report-hospital';
import {RuleHospitalBudget} from './rule-hospital-budget';
import {ReportHospitalHistory} from './report-hospital-history';

@Table({tableName: 'hospital'})
export class Hospital extends Model<Hospital> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  id: string;

  @Comment('机构名称')
  @Column
  name: string;

  @Comment('上级机构id')
  @Column
  parent: string;

  @ForeignKey(() => Region)
  @Column({field: 'region'})
  regionId: string;

  @Column(DataType.VIRTUAL(DataType.STRING))
  get his() {
    return this.regionId.startsWith('340222') ? '340222' : '340203';
  }

  //多对一个行政地区
  @BelongsTo(() => Region)
  region: Region;

  //多对多用户
  @BelongsToMany(
    () => User,
    () => UserHospital
  )
  users: User[];

  //多个基础数据
  @HasMany(() => BasicTagData)
  basicTagData: BasicTagData[];

  //多个小项金额
  @HasMany(() => RuleHospitalBudget)
  ruleHospitalBudget: RuleHospitalBudget[];

  @HasOne(() => ReportHospital)
  report: ReportHospital;

  //多个历史记录
  @HasMany(() => ReportHospitalHistory)
  reportHospitalHistory: ReportHospitalHistory[];
}
