/**
 * 医学指南接口模块
 */
export default class Guidelines {
  /**
   * 医学指南列表
   *
   * @param params {
   *   keyword: 关键字
   *   pageSize: 分页大小
   *   pageNo: 页码
   * }
   * @return [{
   *   id: id
   *   name: 名称
   *   url: 超链接
   * }]
   */
  async list(params) {
    return [];
  }
}
