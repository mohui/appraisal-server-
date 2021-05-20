# 医疗数据对接文档

#### 用户与员工关联表(his_user_mapping)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| user | varchar(36) | 分类代码 |
| employee | varchar(64) | 分类名称 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |


#### 用户医疗工分来源表(his_user_work_source)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| user | varchar(36) | 用户id |
| sources | varchar(36)[] | 关联用户id数组 |
| rate | double precision | 比例 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 工分项目表(his_work_item)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| name | varchar(255) | 名称 |
| auto | boolean | 是否自动打分 |
| type | varchar(255) | 得分方式; counts: 数量; money: 金额 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 工分项目与his收费项目关联表(his_work_item_mapping)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| item | varchar(36) | 工分项目id |
| charge | varchar(255) | 收费项目id |
| type | varchar(255) | 收费项目类型; 检查项目/药品 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |



