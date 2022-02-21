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
   * @param id 查询编号
   * @param type 查询类型
   * @returns [{
   *   id: id,
   *   name: 名称
   *   hasChildren?: 是否有下级 0/1
   *   type: 类型 category-分类,generic-通用名,detail-药品
   *   subTitle?: 药品厂家
   *   url?: 药品详情链接
   *   initial?: 药品拼音首字母
   * }]
   */
  @validate(should.string().required(), should.string().required())
  async list(id, type) {
    const categorySql =
      //language=TSQL
      `
        select a.MI_CATEGORY_ID          as id,
               a.CATEGORY_NAME           as name,
               'category'                as type,
               case
                 when exists(select 1
                             from [medimpact_data].MI_CATEGORY b
                             WHERE b.MI_CATEGORY_TYPE_ID = 1
                               and b.PARENT_CATEGORY_ID = a.MI_CATEGORY_ID) then 1
                 else (case
                         when exists(select 1
                                     from [medimpact_data].MI_GEN_CATEGORY b
                                     WHERE b.MI_CATEGORY_ID = a.MI_CATEGORY_ID) then 1
                         else 0 end) end as hasChildren
        FROM [medimpact_data].MI_CATEGORY a
        WHERE a.MI_CATEGORY_TYPE_ID = 1
          and a.PARENT_CATEGORY_ID = ?
      `;
    const genericSql =
      //language=TSQL
      `
        select a.MI_GENERIC_NAME_ID as id,
               a.GENERIC_NAME       as name,
               'generic'            as type,
               case
                 when exists(select 1
                             from [medimpact_data].MI_DRUG b
                             WHERE b.MI_MONOGRAPH_ID is not null
                               and b.MI_MONOGRAPH_ID != -1
                               and b.MI_GENERIC_NAME_ID = a.MI_GENERIC_NAME_ID) then 1
                 else 0 end         as hasChildren
        from [medimpact_data].[MI_GENERIC_NAME] a,
             [medimpact_data].[MI_GEN_CATEGORY] b
        where a.MI_GENERIC_NAME_ID = b.MI_GENERIC_NAME_ID
          and b.MI_CATEGORY_ID = ?
        order by a.GENERIC_NAME
      `;
    const drugSql =
      //language=TSQL
      `
        select d.MI_MONOGRAPH_ID, d.PRODUCT_NAME, d.DRUG_STRENGTH, m.MANUFACTURER_NAME, d.PINYIN_CODE
        FROM [medimpact_data].MI_DRUG d
               left join [medimpact_data].MI_MANUFACTURER m on m.MI_MANUFACTURER_ID = d.MI_MANUFACTURER_ID
        WHERE MI_MONOGRAPH_ID is not null
          and MI_MONOGRAPH_ID != -1
          and d.MI_GENERIC_NAME_ID = ?
        ORDER BY d.PINYIN_CODE, m.MANUFACTURER_NAME, d.MI_MONOGRAPH_ID DESC
      `;
    let result = [];
    switch (type) {
      case 'category':
        result = await knowledgeDB.execute(categorySql, id);
        if (result.length === 0)
          result = await knowledgeDB.execute(genericSql, id);
        break;
      case 'generic':
        result = await knowledgeDB.execute(genericSql, id);
        if (result.length === 0)
          result = (await knowledgeDB.execute(drugSql, id)).map(it => ({
            id: it.MI_MONOGRAPH_ID,
            name: `${it.PRODUCT_NAME} ${it.DRUG_STRENGTH}`,
            subTitle: it.MANUFACTURER_NAME,
            url: `https://ead.bjknrt.com/test/drug.html?id=${it.MI_MONOGRAPH_ID}`,
            initial: it.PINYIN_CODE,
            type: 'detail'
          }));
        break;
      case 'detail':
        result = (await knowledgeDB.execute(drugSql, id)).map(it => ({
          id: it.MI_MONOGRAPH_ID,
          name: `${it.PRODUCT_NAME} ${it.DRUG_STRENGTH}`,
          subTitle: it.MANUFACTURER_NAME,
          url: `https://ead.bjknrt.com/test/drug.html?id=${it.MI_MONOGRAPH_ID}`,
          initial: it.PINYIN_CODE,
          type: 'detail'
        }));
        break;
    }
    return result;
  }

  /**
   * 搜索药品说明书
   *
   * @param params {
   *   keyword: 关键词
   *   pageSize: 分页大小
   *   pageNo: 页码
   * }
   * @return {
   * data: [{
   *   id: id
   *   name: 名称
   *   subTitle?: 说明书厂家
   *   url: 详情链接
   *   initial?: 首字母
   *  }]
   *  rows: 数据行数
   *  pages: 页数
   * }
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
          url: `https://ead.bjknrt.com/test/drug.html?id=${it.MI_MONOGRAPH_ID}`,
          initial: it.PINYIN_PRODUCT_NAME
        })),
      rows: result.length,
      pages: Math.ceil(result.length / params.pageSize)
    };
  }
}
