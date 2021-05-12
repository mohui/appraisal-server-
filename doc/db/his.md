# 医疗数据对接文档

#### 编码字典表 V_KN_Dic

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| CategoryCode | varchar(18) | 分类代码 |
| CategoryName | varchar(50) | 分类名称 |
| Code | varchar(50) | 字典编码 |
| CodeName | varchar(50) | 字典名称 |

#### 医院表 V_KN_Hospital

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| HospitalID | bigint | 医院id |
| HospName | varchar(200) | 医院名称 |
| Hos_HospitalID | bigint | 上级医院 |

#### 科室表 V_KN_Dept

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| DeptID | bigint | 科室id |
| DeptName | varchar(40) | 科室名称 |
| HospitalID | bigint | 所属医院 |

#### 人员表 V_KN_People

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| PeopleID | bigint primary key | 人员id |
| HospitalID | bigint | 所属医院 |
| DeptID | bigint | 所属科室 |
| PeoName | varchar(20) | 姓名 |
| Sex | varchar(8) | 性别 |
| Age | int | 年龄 |
| Tel | varchar(13) | 联系方式 |
| BirthDate | datetime | 出生日期 |

#### 检查项目分类表 V_KN_ItemClass

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| Code | varchar(50) | 分类id |
| CodeName | varchar(50) | 名称 |
| CategoryCode | varchar(18) | 上级分类id |

#### 检查项目表 V_KN_CheckItemBasic

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| CheckItemBasicID | bigint | 项目id |
| ItemClass | varchar(20) | 所属类别 |
| ItemName | varchar(300) | 名称 |
| ItemCode | varchar(50) | 编码 |
| ItemSpec | varchar(50) | 规格 |
| ItemUnit | varchar(20) | 单位 |
| ItemUnitName | varchar(50) | 单位名称 |
| OnePrice | decimal(10, 2) | 单价 |
| YBCode | varchar(50) | 医保编码 |
| IsUse | boolean | 是否可用 |
| UPDATE_FLAG | varchar(10) | 上传标志 |
| YBJMApprovalFlagName | varchar(50) | 审核标志 |

#### 药品分类表 V_KN_LeecClass

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| Code | varchar(50) | 分类id |
| CodeName | varchar(50) | 名称 |
| CategoryCode | varchar(18) | 上级分类id |

#### 药品表 V_KN_LeecBasicInfor

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| LeecBasicInforID | bigint | 药品id |
| LeecSort | varchar(50) | 所属分类 |
| LeecName | varchar(100) | 名称 |
| LeecSpec | varchar(100) | 规格 |
| LeecForm | varchar(20) | 剂型 |

#### 收费汇总表 V_KN_ChargeMaster

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| SFID | bigint | 汇总id |
| HospitalID | bigint| 所属医院id |
| TreatmentID | bigint | 就诊id|
| RcptNo | varchar(20) | 收费记录号|
| ChargeType | varchar(100) | 类别(住院/门诊) |
| Name | varchar(100) | 姓名 |
| Sex | varchar(10) | 性别 |
| Age | int | 年龄 |
| AgeUnit | varchar(10) | 年龄单位 |
| IDCardNo | varchar(50) | 身份证 |
| Tel | varchar(20) | 联系电话 |
| Address | varchar(200) | 联系地址 |
| DeptName | varchar(50) | 科室 |
| DoctorName | varchar(20) | 医生 |
| TotalCosts | decimal(12, 2) | 金额 |
| ChargesType | varchar(8) | 收费类型. 0: 正常; 1: 退费 |
| OperatorNo | varchar(20) | 收费员 |
| OperateTime | datetime | 收费时间 |
| PayType | varchar(10) | 缴费方式. 1: 自费; 4: 医保 |

#### 收费明细表 V_KN_ChargeDetail

| 字段名 | 字段类型 | 注释 |
| --- | --- | --- |
| SFXMMXID | bigint | 明细id |
| SFID | bigint | 汇总id |
| ItemID | bigint | 明细类别的id(检查项目id/药品id)|
| ItemType | varchar(4) | 明细类别(药品/检查项目/耗材) |
| ChargeType | | 类别(住院/门诊) |
| ItemName | varchar(100) | 项目名称 |
| ItemSpec | varchar(100) | 规格 |
| DeptName | varchar(50) | 开单科室 |
| DoctorName | varchar(20) | 开单医生 |
| Num | int | 数量 |
| Unit | varchar(100) | 单位 |
| UnitPrice | decimal(12, 4) | 零售单价 |
| Money | decimal(12, 2) | 零售金额 |
| OperateTime | datetime | 日期 |
