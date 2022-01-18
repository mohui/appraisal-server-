import {sql as sqlRender} from '../database';
import {knowledgeDB} from '../app';
import {should, validate} from 'kato-server';

/**
 * 医学公式模块
 */
export default class Formula {
  /**
   * 医学公式列表
   *
   * @param params {
   *   keyword: 关键字
   *   pageSize: 分页大小
   *   pageNo: 页码
   * }
   * @return [{
   *   id: id
   *   name: 名称
   *   url?: 公式内容
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
    //模糊查询参数
    if (params.keyword) params.keyword = `%${params.keyword}%`;
    //sql渲染
    const sqlResult = sqlRender(
      `
        with category as (
          SELECT [MI_INFORMATION_CATEGORY_ID],
                 [CATEGORY_NAME],
                 [DESCRIPTION],
                 [PARENT_CATEGORY_ID],
                 [ACCESS_CONTROL_CODE],
                 IS_ARTICLE_CATEGORY,
                 [KEY_WORDS],
                 [PUBLISHED],
                 [AUTHOR],
                 [SEQUENCE_NUMBER],
                 [ENTERED],
                 [ENTERED_BY],
                 [VERSION_NUM]
          FROM [medimpact_data].[MI_INFORMATION_CATEGORY]
          where MI_INFORMATION_CATEGORY_ID = 3413
          union all
          SELECT a.[MI_INFORMATION_CATEGORY_ID],
                 a.[CATEGORY_NAME],
                 a.[DESCRIPTION],
                 a.[PARENT_CATEGORY_ID],
                 a.[ACCESS_CONTROL_CODE],
                 a.IS_ARTICLE_CATEGORY,
                 a.[KEY_WORDS],
                 a.[PUBLISHED],
                 a.[AUTHOR],
                 a.[SEQUENCE_NUMBER],
                 a.[ENTERED],
                 a.[ENTERED_BY],
                 a.[VERSION_NUM]
          from [medimpact_data].[MI_INFORMATION_CATEGORY] a,
               category as b
          where a.PARENT_CATEGORY_ID = b.MI_INFORMATION_CATEGORY_ID
        )
        select c.[MI_INFORMATION_CATEGORY_ID] as id, c.[CATEGORY_NAME] as name, a.[ARTICLE_CONTENT] as url
        from category c
               left join [medimpact_data].[MI_INFORMATION_ARTICLE] a
                         on a.[MI_INFORMATION_CATEGORY_ID] = c.[MI_INFORMATION_CATEGORY_ID]
        where c.IS_ARTICLE_CATEGORY = 'N'
        {{#if keyword}}and (KEY_WORDS like {{? keyword}} or CATEGORY_NAME like {{? keyword}}){{/if}}
        order by c.CATEGORY_NAME, c.MI_INFORMATION_CATEGORY_ID, a.PAGE_NUMBER
      `,
      {
        keyword: params.keyword
      }
    );
    const result = await knowledgeDB.execute(sqlResult[0], ...sqlResult[1]);
    return {
      data: result.filter(
        (_, index) =>
          index >= (params.pageNo - 1) * params.pageSize &&
          index < params.pageNo * params.pageSize
      ),
      rows: result.length,
      pages: Math.ceil(result.length / params.pageSize)
    };
  }
}
