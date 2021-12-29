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

  //region 智慧公卫相关
  /**
   * 公卫概览
   *
   * @param area 机构编码
   * @return {
   *   name: 名称
   *   workpoints?: 参与校正工分
   *   rate?: 质量系数
   *   date: 更新时间
   *   people: [{
   *     id: 人群分类编码
   *     name: 人群名称
   *     amount: 不规范人数
   *   }]
   * }
   */
  async phOverview(area) {
    return {};
  }

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
