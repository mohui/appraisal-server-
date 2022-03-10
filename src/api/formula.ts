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
   * keyword为''时, 返回所有
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
               inner join [medimpact_data].[MI_INFORMATION_ARTICLE] a
        on a.[MI_INFORMATION_CATEGORY_ID] = c.[MI_INFORMATION_CATEGORY_ID]
          and a.[ARTICLE_CONTENT] is not null
          and a.[ARTICLE_CONTENT] != ''
        where c.IS_ARTICLE_CATEGORY = 'N'
            {{#if keyword}}
          and (KEY_WORDS like {{? keyword}}
           or CATEGORY_NAME like {{? keyword}}){{/if}}
        order by c.CATEGORY_NAME, c.MI_INFORMATION_CATEGORY_ID, a.PAGE_NUMBER
      `,
      {
        keyword: params.keyword
      }
    );
    const result = await knowledgeDB.execute(sqlResult[0], ...sqlResult[1]);
    return {
      data: result
        .slice(
          (params.pageNo - 1) * params.pageSize,
          params.pageNo * params.pageSize
        )
        .map(f => ({
          ...f,
          url: `
<!doctype html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='initial-scale=1, width=device-width, maximum-scale=1, user-scalable=no'>
    <meta name='format-detection' content='telephone=no'>
    <title>${f.name}</title>

    <link rel='stylesheet' href='//cdn.bootcss.com/bootstrap/3.3.7/css/bootstrap.min.css' integrity='sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u' crossorigin='anonymous'>
    <script src='https://cdn.bootcdn.net/ajax/libs/jquery/3.6.0/jquery.min.js'></script>
    <script>function getfixed(n) {      if (document.getElementById('_precision') == null) {          return n;      }      var fixed = document.getElementById('_precision').value;      return (Number(n)).toFixed(fixed);  }  function getvar(obj) {      if (obj == '')          return '';      else if (document.getElementById(obj) == null)          return '';        if (document.getElementById(obj).type == 'hidden')          return eval('_get' + obj + '()');      else          return document.getElementById(obj).value;  }  function getfloat(obj) {      return parseFloat(getvar(obj));  }  function setvar(obj, val) {        if (document.getElementById(obj) != null)          document.getElementById(obj).value = val;  }</script>
    <style>
        .nocopy {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }

        body {
            font: 15px/2em "微软雅黑";
        }

        h2 {
            font-size: 20px;
        }

        p {
            line-height: 20px;
        }
    </style>
</head>
<body>
<div class='container'>
    ${f.url}
</div>
</body>
</html>
`
        })),
      rows: result.length,
      pages: Math.ceil(result.length / params.pageSize)
    };
  }
}
