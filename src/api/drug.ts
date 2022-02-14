import {should, validate} from 'kato-server';
import {knowledgeDB} from '../app';
import {sql as sqlRender} from '../database';

/**
 * 药品说明书模块
 */
export default class Drug {
  /**
   * 药品层级列表
   *
   * id为null时, 查询第一层级
   * @param id? 分类id
   * @returns [{
   *   id: id,
   *   name: 名称
   *   isDetail: true/false: 是否具体说明书
   *   subTitle?: 说明书厂家
   *   url?: 详情链接
   * }]
   */
  @validate(should.string().allow(null))
  async list(id) {
    return [];
  }

  /**
   * 搜索药品说明书
   *
   * @param params {
   *   keyword: 关键词
   *   pageSize: 分页大小
   *   pageNo: 页码
   * }
   * @return [{
   *   id: id
   *   name: 名称
   *   subTitle: 说明书厂家
   *   url: 详情链接
   * }]
   */
  @validate(
    should.object({
      keyword: should.string().required(),
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
  async search(params) {
    if (params.keyword) params.keyword = `%${params.keyword}%`;
    const sql = sqlRender(
      `
          SELECT *
          FROM [medimpact_data].MI_DRUG_SEARCH
          WHERE 1 = 1
          {{#if keyword}} AND (PINYIN_PRODUCT_NAME LIKE {{? keyword}} OR SEARCH_PRODUCT_NAME LIKE {{? keyword}}){{/if}}
          ORDER BY PINYIN_PRODUCT_NAME,MONOGRAPH_NAME,MI_MONOGRAPH_ID DESC
        `,
      {
        keyword: params.keyword
      }
    );
    const result = await knowledgeDB.execute(sql[0], ...sql[1]);
    return {
      data: result
        .slice(
          (params.pageNo - 1) * params.pageSize,
          params.pageNo * params.pageSize
        )
        .map(it => ({
          id: it.MI_MONOGRAPH_ID,
          name: `${it.PRODUCT_NAME} ${it.DRUG_STRENGTH}`,
          subTitle: it.MONOGRAPH_NAME,
          url: `https://ead.bjknrt.com/test/drug.html?id=${it.MI_MONOGRAPH_ID}`
        })),
      rows: result.length,
      pages: Math.ceil(result.length / params.pageSize)
    };
  }
}
