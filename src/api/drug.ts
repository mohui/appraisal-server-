import {should, validate} from 'kato-server';
import {knowledgeDB} from '../app';
import {sql as sqlRender} from '../database';

export default class Drug {
  /**
   * 药品说明书列表
   *
   * @param params {
   *   keyword: 搜索条件
   *   pageSize: 分页大小
   *   pageNo: 页码
   * }
   * @return [{
   *   id: id
   *   name: 名称
   *   url: 超链接
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
  async list(params) {
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
          name: it.PRODUCT_NAME,
          strength: it.DRUG_STRENGTH,
          subTitle: it.MONOGRAPH_NAME,
          url: `https://ead.bjknrt.com/test/drug.html?id=${it.MI_MONOGRAPH_ID}`
        })),
      rows: result.length,
      pages: Math.ceil(result.length / params.pageSize)
    };
  }
}
