import {UUIDV4} from 'sequelize';
import {
  AllowNull,
  BelongsTo,
  Column,
  Comment,
  DataType,
  Default,
  ForeignKey,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import {Hospital} from './hospital';

@Table({tableName: 'basic_tag_data'})
export class BasicTagData extends Model<BasicTagData> {
  @PrimaryKey
  @Default(UUIDV4)
  @Comment('主键id')
  @Column(DataType.UUID)
  id: string;

  @AllowNull(false)
  @ForeignKey(() => Hospital)
  @Column({field: 'hospital', type: DataType.UUID})
  hospitalId: string;

  @BelongsTo(() => Hospital)
  hospital: Hospital;

  @Comment('基础数据code')
  @AllowNull(false)
  @Column
  code: string;

  @Comment('基础数据值')
  @Default(0)
  @AllowNull(false)
  @Column(DataType.FLOAT)
  value: number;

  @Comment('编辑人姓名')
  @Column
  editor: string;
}
