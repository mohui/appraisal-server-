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
   * @param 关键字
   * @return [{
   *   id: id
   *   name: 名称
   *   url?: 公式内容
   * }]
   */
  @validate(should.string().allow(null))
  async list(keyword) {
    //模糊查询参数
    if (keyword) keyword = `%${keyword}%`;
    //sql渲染
    const sqlResult = sqlRender(
      `with category as (
        SELECT [MI_INFORMATION_CATEGORY_ID]
             , [CATEGORY_NAME]
             , [DESCRIPTION]
             , [PARENT_CATEGORY_ID]
             , [ACCESS_CONTROL_CODE]
             , IS_ARTICLE_CATEGORY
             , [KEY_WORDS]
             , [PUBLISHED]
             , [AUTHOR]
             , [SEQUENCE_NUMBER]
             , [ENTERED]
             , [ENTERED_BY]
             , [VERSION_NUM]
        FROM [medimpact_data].[MI_INFORMATION_CATEGORY]
        where MI_INFORMATION_CATEGORY_ID = 3413
        union all
        SELECT a.[MI_INFORMATION_CATEGORY_ID]
          , a.[CATEGORY_NAME]
          , a.[DESCRIPTION]
          , a.[PARENT_CATEGORY_ID]
          , a.[ACCESS_CONTROL_CODE]
          , a.IS_ARTICLE_CATEGORY
          , a.[KEY_WORDS]
          , a.[PUBLISHED]
          , a.[AUTHOR]
          , a.[SEQUENCE_NUMBER]
          , a.[ENTERED]
          , a.[ENTERED_BY]
          , a.[VERSION_NUM]
        from [medimpact_data].[MI_INFORMATION_CATEGORY] a, category as b
        where a.PARENT_CATEGORY_ID=b.MI_INFORMATION_CATEGORY_ID
      )
       select c.[MI_INFORMATION_CATEGORY_ID] as id,c.[CATEGORY_NAME] as name,a.[ARTICLE_CONTENT] as url
       from category c
       left join [medimpact_data].[MI_INFORMATION_ARTICLE] a on a.[MI_INFORMATION_CATEGORY_ID] = c.[MI_INFORMATION_CATEGORY_ID]
       where c.IS_ARTICLE_CATEGORY = 'N'
       {{#if keyword}}
         and KEY_WORDS like {{? keyword}}
       {{/ if}}
      `,
      {
        keyword: keyword
      }
    );
    return await knowledgeDB.execute(sqlResult[0], ...sqlResult[1]);
  }
}
