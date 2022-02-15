import {should, validate} from 'kato-server';
import {knowledgeDB} from '../app';
import {sql as sqlRender} from '../database';

/**
 * 药品说明书模块
 */
export default class Drug {
  /**
   * 药品分类层级列表
   *
   * @returns [{
   *   id: id,
   *   name: 药理分类
   *   children: [
   *   id: id
   *   name: 药理分类
   *   children:[{...}]
   *   ]
   * }]
   */
  async categories() {
    //获取全部分类信息
    const data = await knowledgeDB.execute(
      //language=TSQL
      `
        with category as (
          SELECT MI_CATEGORY_ID as id, CATEGORY_NAME as name, PARENT_CATEGORY_ID as parent
          FROM [medimpact_data].MI_CATEGORY
          WHERE MI_CATEGORY_TYPE_ID = 1
          union all
          SELECT MI_CATEGORY_ID as id, CATEGORY_NAME as name, PARENT_CATEGORY_ID as parent
          from [medimpact_data].[MI_CATEGORY] a,
               category as b
          where a.PARENT_CATEGORY_ID = b.id
        )
        select distinct *
        from category
      `
    );

    //获取分类与通用名的关联列表
    const genericNameList = await knowledgeDB.execute(
      //language=TSQL
      `
        select a.MI_GENERIC_NAME_ID as id, a.GENERIC_NAME as name, b.MI_CATEGORY_ID as category
        from [medimpact_data].[MI_GENERIC_NAME] a,
             [medimpact_data].[MI_GEN_CATEGORY] b
        where a.MI_GENERIC_NAME_ID = b.MI_GENERIC_NAME_ID
        order by a.GENERIC_NAME
      `
    );

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    function recursiveArray(id) {
      if (data.filter(it => it.parent === id).length > 0)
        return data
          .filter(it => it.parent === id)
          .map(level => ({
            id: level.id,
            name: level.name,
            children: recursiveArray(level.id)
          }));
      //没有子级分类尝试叠加所属通用名
      else
        return genericNameList
          .filter(g => g.category === id)
          .map(g => ({
            id: g.id,
            name: g.name
          }));
    }

    return data
      .filter(it => it.parent == 0)
      .map(level0 => ({
        id: level0.id,
        name: level0.name,
        children: recursiveArray(level0.id)
      }));
  }

  /**
   * 搜索药品说明书
   *
   * keyword全局生效, 即keyword非空, 则category失效
   * @param params {
   *   category: 药理分类末级的通用名id
   *   keyword: 关键词
   *   pageSize: 分页大小
   *   pageNo: 页码
   * }
   * @return [{
   *   id: id
   *   name: 名称
   *   subTitle?: 说明书厂家
   *   url?: 详情链接
   *   initial?: 首字母
   * }]
   */
  @validate(
    should.object({
      category: should.string().allow(null),
      keyword: should
        .string()
        .allow('')
        .required(),
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
    if (params.keyword) {
      params.keyword = `%${params.keyword}%`;
      params.category = null;
    }
    const sql = sqlRender(
      `
        SELECT d.MI_MONOGRAPH_ID, d.PRODUCT_NAME, d.DRUG_STRENGTH, m.MANUFACTURER_NAME, d.PINYIN_CODE
        FROM [medimpact_data].MI_DRUG d
               left join [medimpact_data].MI_MANUFACTURER m on m.MI_MANUFACTURER_ID = d.MI_MANUFACTURER_ID
        WHERE MI_MONOGRAPH_ID is not null
          and MI_MONOGRAPH_ID != -1
          {{#if keyword}} AND (d.PINYIN_CODE LIKE {{? keyword}} OR d.PRODUCT_NAME LIKE {{? keyword}}){{/if}}
          {{#if category}} AND d.MI_GENERIC_NAME_ID = {{? category}}{{/if}}
        ORDER BY d.PINYIN_CODE, m.MANUFACTURER_NAME, d.MI_MONOGRAPH_ID DESC
      `,
      {
        keyword: params.keyword,
        category: params.category
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
          subTitle: it.MANUFACTURER_NAME,
          url: `https://ead.bjknrt.com/test/drug.html?id=${it.MI_MONOGRAPH_ID}`,
          initial: it.PINYIN_CODE
        })),
      rows: result.length,
      pages: Math.ceil(result.length / params.pageSize)
    };
  }
}
