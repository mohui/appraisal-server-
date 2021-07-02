# 医疗数据对接文档

#### 员工表(staff)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| hospital | varchar(36) | 所属医院 |
| staff | varchar(64) | 绑定his员工id |
| account | varchar(255) | 登录名 |
| virtual | boolean | 虚拟用户标识 |
| password | varchar(255) | 密码 |
| name | varchar(255) | 名称 |
| department | varchar(36) | 所属科室id |
| remark | varchar(500) | 备注 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 员工医疗工分来源表(his_staff_work_source)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| staff | varchar(36) | 员工id |
| sources | varchar(36)[] | 关联员工id数组 |
| rate | double precision | 权重系数 |
| avg | boolean | 是否平均分配 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 医疗手工数据表(his_manual_data)
| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| hospital | varchar(36) | 所属医院id |
| name | varchar(255) | 名称 |
| input | varchar(255) | 输入方式; 属性/日志 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 医疗手工数据流水表(his_staff_manual_data_detail)


| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| staff | varchar(36) | 员工id |
| item | varchar(36) | 手工数据id |
| date | timestamp | 赋值时间 |
| value | double | 单位量 |
| files | varchar(255)[] | 附件; unifs地址数组 |
| remark | varchar(500) | 备注 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 工分项目表(his_work_item)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| hospital | varchar(36) | 所属医院id |
| name | varchar(255) | 名称 |
| method | varchar(255) | 得分方式; 计数/总和 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 工分项目来源关联表(his_work_item_mapping)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| item | varchar(36) | 工分项目id |
| source | varchar(255) | 来源id |
| code | varchar(255) | 检查项目/药品id |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |


#### 员工和工分项绑定表(his_staff_work_item_mapping)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| staff | varchar(36) | 员工id |
| item | varchar(36) | 工分项目id |
| score | int | 分值 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 员工工分项目得分流水表(his_staff_work_score_detail)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| staff | varchar(36) | 员工id |
| item | varchar(36) | 工分项目id |
| date | date | 得分时间 |
| score | double | 得分 |
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
| detail | varchar(255) | 考核要求 |
| metric | varchar(255) | 指标 |
| operator | varchar(255) | 计算方式 |
| value | double precision | 参考值 |
| score | int | 分值 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |

#### 员工得分表(his_staff_result)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) | 主键 |
| day | date | 日期 |
| work | jsonb | 工分结果 |
| assess | jsonb | 考核结果 |
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


#### 科室(his_department)

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| id | varchar(36) primary key | 科室id |
| hospital | varchar(36) | 所属医院id |
| name | varchar(255) | 科室名称 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 修改时间 |
