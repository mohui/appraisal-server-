import {sql as sqlRender} from '../database';
import {originalDB, unifs} from '../app';
import {should, validate} from 'kato-server';

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
   *   url?: 超链接
   * }]
   */
  @validate(
    should.object({
      keyword: should.string().allow(null),
      pageSize: should
        .number()
        .integer()
        .positive()
        .required(),
      pageNo: should
        .number()
        .integer()
        .positive()
        .required()
    })
  )
  async list(params) {
    //模糊查询参数
    if (params.keyword) params.keyword = `%${params.keyword}%`;
    //sql渲染
    const sqlResult = sqlRender(
      `select * from guideline {{#if keyword}} where name like {{? keyword}} {{/if}} order by updated_at desc`,
      {
        keyword: params.keyword
      }
    );
    //分页查询
    const result = await originalDB.page(
      sqlResult[0],
      params.pageNo,
      params.pageSize,
      ...sqlResult[1]
    );
    //组织返回值
    for (const it of result.data) {
      //文件是否存在
      it.url = await unifs.getExternalUrl(it.path);
    }
    return result;
  }
}
