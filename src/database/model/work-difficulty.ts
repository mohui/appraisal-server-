import {Column, Comment, DataType, Model, Table} from 'sequelize-typescript';

@Table({tableName: 'work_difficulty'})
export class WorkDifficulty extends Model<WorkDifficulty> {
  @Comment('年份')
  @Column({field: 'year', type: DataType.INTEGER})
  year;

  @Comment('基础数据code')
  @Column({field: 'districtcode', type: DataType.STRING})
  districtCode;

  @Comment('基础数据值')
  @Column({field: 'districtname', type: DataType.STRING})
  districtName;

  @Comment('数据范围')
  @Column({field: 'scope', type: DataType.STRING})
  scope;

  @Comment('工分code')
  @Column({field: 'code', type: DataType.STRING})
  code;

  @Comment('难度系数')
  @Column({field: 'difficulty', type: DataType.FLOAT})
  difficulty;

  @Comment('创建时间')
  @Column({field: 'created_at', type: DataType.DATE})
  createdAt;

  @Comment('更新时间')
  @Column({field: 'update_at', type: DataType.DATE})
  updatedAt;
}
