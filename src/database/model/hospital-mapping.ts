import {
  Column,
  Comment,
  DataType,
  Default,
  HasOne,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {UUIDV4} from 'sequelize';
import {Hospital} from './hospital';

@Table({tableName: 'hospital_mapping'})
export class HospitalMapping extends Model<HospitalMapping> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  id: string;

  @Comment('hospital主键id')
  @Column
  h_id: string;

  @Comment('机构名称')
  @Column
  hisHospital: string;

  @HasOne(() => Hospital)
  hospital: Hospital;
}
