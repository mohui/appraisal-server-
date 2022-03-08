/**
 * 用户类型枚举
 */
export enum UserType {
  //员工
  STAFF = 'STAFF',
  //管理者
  ADMIN = 'ADMIN'
}

/**
 * 员工申请状态枚举
 */
export enum RequestStatus {
  PENDING = '待审核',
  SUCCESS = '已通过',
  REJECTED = '未通过'
}
