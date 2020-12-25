import {
  AllowNull,
  Column,
  Comment,
  DataType,
  Default,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';

@Table({tableName: 'rule_hospital_attach'})
export class RuleHospitalAttach extends Model<RuleHospitalAttach> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column
  id: string;

  @Comment('考核细则id')
  @AllowNull(false)
  @Column({field: 'rule', type: DataType.UUID})
  ruleId: string;

  @Comment('机构id')
  @AllowNull(false)
  @Column({field: 'area'})
  areaCode: string;

  @Comment('附件中文名')
  @AllowNull(false)
  @Column
  name: string;

  @Comment('附件URL')
  @AllowNull(false)
  @Column
  url: string;

  @Comment('更新时间')
  @Column({field: 'updated_at', type: DataType.DATE})
  updatedAt;
}
