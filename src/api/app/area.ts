/**
 * App机构模块
 */
export default class AppArea {
  /**
   * 扫码申请加入
   *
   * @param ticket {
   *   area: 机构编码
   * }
   * @return 申请id
   */
  async joinUs(ticket) {
    return '';
  }

  //region 公卫相关
  /**
   * 考核指标得分列表
   *
   * 目前只考虑机构
   * @param area 地区编码
   * @return 考核体系下的指标得分列表[]
   */
  async indicators(area) {
    return [];
  }

  /**
   * 档案问题标签列表
   */
  async tags() {
    return [];
  }

  /**
   * 公卫医生列表
   *
   * @param area 机构编码
   * @return [{
   *   id: id
   *   name: 姓名
   * }]
   */
  async phDoctors(area) {
    return [];
  }

  /**
   * 问题档案列表
   *
   * 目前只考虑机构
   * @param params {
   *   area: 地区编码
   *   keyword: 姓名/身份证
   *   doctor: 录入医生
   *   tags: []档案问题
   *   pageSize: 分页大小
   *   pageNo: 分页页码
   * }
   * @return 居民档案列表[]
   */
  async archives(params) {
    return [];
  }

  //endregion
}
