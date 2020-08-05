import {Column, Comment, DataType, Model, Table} from 'sequelize-typescript';

@Table({tableName: 'work_difficulty'})
export class WorkDifficulty extends Model<WorkDifficulty> {
  @Comment('年份')
  @Column({field: 'year', type: DataType.INTEGER})
  year: number;

  @Comment('基础数据code')
  @Column({field: 'districtcode'})
  districtCode: string;

  @Comment('基础数据值')
  @Column({field: 'districtname'})
  districtName: string;

  @Comment('数据范围')
  @Column({field: 'scope'})
  scope: string;

  @Comment('工分项名')
  @Column({field: 'name'})
  name: string;

  @Comment('工分code')
  @Column({field: 'code'})
  code: string;

  @Comment('难度系数')
  @Column({field: 'difficulty', type: DataType.FLOAT})
  difficulty: number;

  @Comment('创建时间')
  @Column({field: 'created_at'})
  created_at: Date;

  @Comment('更新时间')
  @Column({field: 'updated_at'})
  updated_at: Date;
}
