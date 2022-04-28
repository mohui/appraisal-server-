import {KatoCommonError, should, validate} from 'kato-server';
import {appDB, originalDB} from '../../app';
import {Context} from '../context';
import {sql as sqlRender} from '../../database';
import {UserType} from '../../../common/user';
import {getHospital} from '../his/service';
import {newsStatus} from '../../../common/news';
import * as dayjs from 'dayjs';

/**
 * 浏览量
 *
 * @param news 新闻id
 */
async function pv(news) {
  await appDB.execute(
    // language=PostgreSQL
    `
      insert into news_pv_mapping(news, "user")
      values (?, ?)
      on conflict (news, "user") do update
        set updated_at = ?
    `,
    news,
    Context.current.user.id,
    new Date()
  );
}

export default class AppNews {
  /**
   * 新闻列表
   *
   * @param params{
   *   title?: 新闻标题,
   *   pageNo: 页数,
   *   pageSize: 条数
   * }
   * @return {
   *       data: [
   *         {
   *           id: '新闻id',
   *           title: '新闻标题',
   *           source: '数据来源',
   *           cover?: '第一张图片',
   *           toped_at?: '置顶时间',
   *           published_at: '发布时间',
   *           pv: 浏览量
   *         }
   *       ],
   *       rows: '数据行数',
   *       pages: '页数'
   *     };
   *   }
   */
  @validate(
    should
      .object({
        title: should.string().allow(''),
        pageNo: should.number().required(),
        pageSize: should.number().required()
      })
      .required()
  )
  async list(params) {
    if (Context.current.user.type !== UserType.STAFF)
      throw new KatoCommonError('非员工账号,不能查看');
    const hospital = await getHospital();

    // 获取所有的上级
    const hospitalObj = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select path
          from area
          where code = ? `,
        hospital
      )
    )[0];
    const paths = hospitalObj.path.split('.');
    // 根据标题查询
    if (params.title) params.title = `%${params.title}%`;
    const [sql, param] = sqlRender(
      `
        select distinct news.id,
                        news.title,
                        news.source,
                        news.cover,
                        news.toped_at,
                        news.published_at,
                        COALESCE(news.virtual_pv, 0) virtual_pv,
                        (select cast(count(1) as int) from news_pv_mapping pv where pv.news = news.id) pv
        from news
               inner join news_area_mapping areaMapping on news.id = areaMapping.news
        where news.status = {{? status}}
              and areaMapping.area in  ({{#each paths}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
              {{#if title}} and news.title like {{? title}} {{/if}}
        order by news.toped_at desc nulLs last, news.published_at desc
      `,
      {
        status: newsStatus.PUBLISHED,
        paths,
        title: params.title
      }
    );
    const {data, rows, pages} = await appDB.page(
      sql,
      params.pageNo,
      params.pageSize,
      ...param
    );
    const list: {
      id: string;
      title: string;
      source: string;
      cover: string;
      toped_at?: Date;
      published_at: Date;
      pv: number;
    }[] = data.map(it => ({
      id: it.id,
      title: it.title,
      source: it.source,
      cover: it.cover,
      toped_at: it.toped_at,
      published_at: it.published_at,
      pv: it.pv + it.virtual_pv
    }));

    return {
      rows,
      pages,
      data: list
    };
  }

  /**
   * 文章详情
   *
   * @param id 新闻id
   * @return {
   *           id: '新闻id',
   *           title: '新闻标题',
   *           source: '数据来源',
   *           status: '状态:未发布,已发布,已下架',
   *           content: '内容',
   *           cover?: '第一张图片',
   *           author?: '作者',
   *           toped_at?: 置顶时间,
   *           crawled_at?: '爬取时间',
   *           published_by?: '发布人',
   *           published_at?: '发布时间',
   *           pv: 浏览量(20),
   *           thumb: 点赞数量 0,
   *           isThumb: 是否已经点赞, true/false
   *           html: 展示页面的html字符串
   *         }
   */
  @validate(should.string().required())
  async detail(id) {
    const newsList = await appDB.execute(
      // language=PostgreSQL
      `
        select news.id,
               news.title,
               news.source,
               news.status,
               news.content,
               news.cover,
               news.author,
               news.virtual_pv,
               news.toped_at,
               news.created_by,
               news.updated_by,
               news.crawled_at,
               news.created_at,
               news.updated_at,
               news.published_by,
               news.published_at,
               (select array_agg(area) area
                from news_area_mapping areaMapping
                where areaMapping.news = news.id
                group by news)                                                                   areas,
               (select cast(count(1) as int) from news_pv_mapping pv where pv.news = news.id)    pv,
               (select cast(count(1) as int) from news_thumb_mapping pv where pv.news = news.id) thumb
        from news
        where id = ?
      `,
      id
    );
    if (newsList.length === 0) throw new KatoCommonError('文章不存在');
    await pv(id);
    const thumb = await appDB.execute(
      // language=PostgreSQL
      `
        select news, "user"
        from news_thumb_mapping
        where news = ?
          and "user" = ?
      `,
      id,
      Context.current.user.id
    );
    const data = newsList.map(it => ({
      ...it,
      pv: it.pv + it.virtual_pv,
      isThumb: thumb.length > 0
    }))[0];
    const publishedAt = dayjs(data.published_at).format('YYYY-MM-DD');
    let html = `<!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta name='viewport' content='width=device-width, initial-scale=1'>
            <meta charset='UTF-8'>
                <title>${data.title}</title>
        </head>
        <body>
            <div style="font-size: 24px;font-weight: bold">
                ${data.title}
            </div>
            <div style="display: flex;margin: 10px 0">
            <div style="font-size: 14px;color:#333;">
                来源: ${data.source}
             </div>
            <div style="padding:0 10px;font-size: 14px;color:#333;">作者: ${data?.author ||
              '无'}</div>
            <div style="display:flex;flex-direction: row-reverse ;font-size: 14px;color:#888;flex: 1">
                ${publishedAt}   浏览: ${data.pv}
            </div>
        </div>
            ${data.content}
        </body>
          <footer style="width: 100%;font-size: 12px;color: #888">
            声明: 该文观点仅代表作者本人、医效通系信息发布平台,医效通仅提供信息存储空间服务
          </footer>
        </html>`;
    html = html
      .replace(/\n/g, '')
      .replace(/<img/g, '<img style="width:100%"')
      .replace(/"/g, "'");
    return {...data, html};
  }

  /**
   * 点赞和取消点赞
   *
   * @param id 新闻id
   * @param thumb 点赞还是取消
   */
  @validate(should.string().required(), should.boolean().required())
  async thumb(id, thumb) {
    const newsList = await appDB.execute(
      // language=PostgreSQL
      `
        select id, title
        from news
        where id = ?
      `,
      id
    );
    if (newsList.length === 0) throw new KatoCommonError('文章不存在');

    if (thumb) {
      await appDB.execute(
        // language=PostgreSQL
        `
          insert into news_thumb_mapping(news, "user")
          values (?, ?)
          on conflict (news, "user") do update
            set updated_at = ?
        `,
        id,
        Context.current.user.id,
        new Date()
      );
    } else {
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from news_thumb_mapping
          where news = ?
            and "user" = ?
        `,
        id,
        Context.current.user.id
      );
    }

    return (
      await appDB.execute(
        // language=PostgreSQL
        `
          select cast(count(1) as int) count
          from news_thumb_mapping
          where news = ?
        `,
        id
      )
    )[0].count;
  }
}
