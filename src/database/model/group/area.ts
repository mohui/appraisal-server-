import {Column, Comment, Model, PrimaryKey, Table} from 'sequelize-typescript';

@Table({tableName: 'area'})
export class Area extends Model<Area> {
  @PrimaryKey
  @Comment('主键')
  @Column
  code: string;

  @Comment('行政名称')
  @Column
  name: string;

  @Comment('上级行政code')
  @Column
  parent: string;
}
