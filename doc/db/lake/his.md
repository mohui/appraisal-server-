# 医疗数据对接文档

#### 员工表(staff)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| hospital | varchar(36) | 所属医院 |
| staff | varchar(64) | 绑定his员工id |
| account | varchar(255) | 登录名 |
| password | varchar(255) | 密码 |
| name | varchar(255) | 密码 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 员工医疗工分来源表(his_staff_work_source)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| staff | varchar(36) | 员工id |
| sources | varchar(36)[] | 关联员工id数组 |
| rate | double precision | 权重系数 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 工分项目表(his_work_item)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| hospital | varchar(36) | 所属医院id |
| name | varchar(255) | 名称 |
| type | varchar(255) | 得分方式; counts: 数量; money: 金额 / null / 手动打分 |
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


#### 员工和工分项绑定表(his_staff_work_item_mapping)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| staff | varchar(36) | 员工id |
| item | varchar(36) | 工分项目id |
| score | int | 分值 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 员工工分项目得分表(his_staff_work_score)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| staff | varchar(36) | 员工id |
| item | varchar(36) | 工分项目id |
| date | date | 日期; 手动打分默认每月1号 |
| score | int | 得分 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 医疗考核方案表(his_check_system)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| hospital | varchar(36) | 所属医院id |
| name | varchar(255) | 名称 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 员工考核方案绑定表(his_staff_check_mapping)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| staff | varchar(36) | 员工id |
| check | varchar(36) | 考核方案id |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 医疗考核规则表(his_check_rule)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| "check" | varchar(36) | 所属考核方案 |
| auto | boolean | 是否自动考核 |
| name | varchar(255) | 名称 |
| metric | varchar(255) | 指标 |
| operator | varchar(255) | 计算方式 |
| value | double precision | 参考值 |
| score | int | 分值 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 考核得分表(his_rule_staff_score)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| rule | varchar(36) | 考核规则id |
| staff | varchar(36) | 员工id |
| date | date | 日期 |
| score | double | 得分 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 员工附加分表(his_staff_extra_score)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| staff | varchar(36) | 员工id |
| month | date | 打分时间; 默认每月1号 |
| score | int | 得分 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 机构(考核)结算表(his_hospital_settle)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| hospital | varchar(36) | 所属医院id |
| month | date | 结算时间; 默认每月1号 |
| settle | boolean | 是否结算 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |
