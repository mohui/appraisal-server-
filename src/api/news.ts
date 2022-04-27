import {KatoRuntimeError, should, validate} from 'kato-server';
import {appDB, originalDB, unifs} from '../app';
import {v4 as uuid} from 'uuid';
import {newsSource, newsStatus} from '../../common/news';
import {Context} from './context';
import * as path from 'path';
import {sql as sqlRender} from '../database';

/**
 * 过滤地区的下级地区
 */
async function verifyArea(areas) {
  // 根据地区id查询地区列表
  const list: {
    code: string;
    name: string;
    path: string;
    level: number;
  }[] = await originalDB.execute(
    // language=PostgreSQL
    `
      select code,
             name,
             path,
             case label
               when 'province' then 1
               when 'city' then 2
               when 'district' then 3
               when 'centre' then 4
               else 5
               end as level
      from area
      where code in (${areas.map(() => '?')})
      order by level
    `,
    ...areas
  );

  const del = [];

  // 找第一个循环里地区的子集,把所有的子集都找到,剩下的就是没有子集的地区
  for (const area of areas) {
    for (const areaIt of list) {
      // 不是当前地区
      if (area !== areaIt.code) {
        // 把父级地区拆成数组,查找此地区是否在父级数组中
        const findIndex = areaIt.path
          .split('.')
          .find(findIt => findIt === area);
        // 如果在父级数组中,说明此地区是它的子集,把他放到子集数组中
        if (findIndex) del.push(areaIt.code);
      }
    }
  }
  // 他可能是两个地区的下级地区,去重
  const delList = Array.from(new Set(del));

  // 所有不是子集的地区
  return areas.filter(it => {
    return !delList.find(findIt => findIt === it);
  });
}

export default class News {
  /**
   * 新闻资讯的添加编辑
   * @param params{
   *   id?: 新闻id,
   *   title: 标题,
   *   author?: 作者,
   *   source: 来源
   *   top?: 文章置顶,
   *   content: 内容,
   *   areas: 发布地区,
   *   status: 状态,
   *   virtual_pv?: 虚拟浏览量,
   * }
   * @returns ;
   */
  @validate(
    should
      .object({
        id: should.string().allow(null),
        title: should.string().required(),
        author: should.string().allow(''),
        source: should.string().required(),
        top: should.boolean().required(),
        content: should.string().required(),
        areas: should
          .array()
          .min(1)
          .required(),
        status: should
          .string()
          .only(
            newsStatus.UNPUBLISHED,
            newsStatus.PUBLISHED,
            newsStatus.REMOVED
          )
          .required(),
        virtual_pv: should.number().allow(null)
      })
      .required()
  )
  async upsert(params) {
    const {
      id,
      title,
      author,
      source,
      top,
      content,
      areas,
      status,
      virtual_pv
    } = params;
    // 过滤地区的下级地区
    const newAreas = await verifyArea(areas);
    // 图片首次出现的位置
    const coverStart = content.indexOf('src=');
    // 图片结尾首次出现的位置,+40长度
    const coverEnd = content.indexOf('key=');
    // 默认为null
    let cover = null;
    // 如果查找到,把图片地址从内容里面截取出来
    if (coverStart > -1 && coverEnd > coverStart)
      // src=":长度为5, key=:长度为4 + 40
      cover = content.substring(coverStart + 5, coverEnd + 44);

    // 默认是当前时间
    let topedAt = new Date();
    // 如果新闻id并且是置顶的, 查询新闻当前是否置顶
    if (id && top) {
      const newsTop = (
        await appDB.execute(
          // language=PostgreSQL
          `
            select toped_at
            from news
            where id = ?
          `,
          id
        )
      )[0]?.toped_at;
      // 如果有值,本身就是置顶文章,时间不变
      if (newsTop) topedAt = newsTop;
    }
    const newsId = id ? id : uuid();

    return appDB.transaction(async () => {
      await appDB.execute(
        // language=PostgreSQL
        `
          insert into news(id,
                           title,
                           source,
                           status,
                           content,
                           cover,
                           author,
                           toped_at,
                           virtual_pv,
                           published_by,
                           published_at,
                           created_by,
                           updated_by,
                           crawled_at,
                           created_at,
                           updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          on conflict (id) do update
            set title        = ?,
                status       = ?,
                content      = ?,
                "source"     = ?,
                cover        = ?,
                author       = ?,
                toped_at     = ?,
                virtual_pv   = ?,
                published_by = ?,
                published_at = ?,
                updated_at   = ?
        `,
        newsId,
        title,
        source,
        status,
        content,
        cover,
        author,
        top ? new Date() : null,
        virtual_pv,
        status === newsStatus.PUBLISHED ? Context.current.user.id : null,
        status === newsStatus.PUBLISHED ? new Date() : null,
        Context.current.user.id,
        Context.current.user.id,
        null,
        new Date(),
        new Date(),
        title,
        status,
        content,
        source,
        cover,
        author,
        top ? topedAt : null,
        virtual_pv,
        status === newsStatus.PUBLISHED ? Context.current.user.id : null,
        status === newsStatus.PUBLISHED ? new Date() : null,
        new Date()
      );
      // 如果不为0
      if (newAreas.length > 0) {
        await appDB.execute(
          // language=PostgreSQL
          `
            delete
            from news_area_mapping
            where news = ?
          `,
          newsId
        );
        await appDB.execute(
          `
            insert into news_area_mapping(news, area)
            values ${newAreas.map(() => '(?, ?)').join()}
          `,
          ...newAreas
            .map(it => [newsId, it])
            .reduce((prev, current) => {
              return [...prev, ...current];
            }, [])
        );
      }
    });
  }

  /**
   * 新闻列表
   *
   * @param params{
   *   title?: 新闻标题,
   *   source?: 来源,
   *   status?: 状态,
   *   crawledAtStart?: 爬取时间开始时间,
   *   crawledAtEnd?: 爬取时间结束时间,
   *   createdAtStart?: 创建时间开始时间,
   *   createdAtEnd?: 创建时间结束时间,
   *   pageNo: 页数,
   *   pageSize: 条数
   * }
   * @return {
   *       data: [
   *         {
   *           id: '新闻id',
   *           title: '新闻标题',
   *           source: '数据来源',
   *           status: '状态:未发布,已发布,已下架',
   *           author?: '作者',
   *           crawled_at?: '爬取时间',
   *           published_by?: '发布人id',
   *           publishedName?: '发布人姓名',
   *           published_at?: '发布时间',
   *           toped_at?: '置顶时间',有值是置顶,没值是不置顶,
   *           created_at: '创建时间',
   *           areas?: ['地区id']
   *           areaList: [{code: 地区id, name: 地区名称}]
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
        title: should.string().allow(null),
        source: should.string().allow(null),
        status: should.only(Object.values(newsStatus)).allow(null),
        crawledAtStart: should.date().allow(null),
        crawledAtEnd: should.date().allow(null),
        createdAtStart: should.date().allow(null),
        createdAtEnd: should.date().allow(null),
        pageNo: should.number().required(),
        pageSize: should.number().required()
      })
      .required()
  )
  async list(params) {
    // 根据标题查询
    if (params.title) params.title = `%${params.title}%`;
    const [sql, param] = sqlRender(
      `
        select news.id,
               news.title,
               news.source,
               news.status,
               news.author,
               news.crawled_at,
               news.published_by,
               news.published_at,
               news.toped_at,
               news.created_at,
               (select name from "user" where news.published_by = "user".id)                                 "publishedName",
               (select array_agg(area) area from news_area_mapping pv where pv.news = news.id group by news) areas
        from news
        where 1 = 1
              {{#if title}} and news.title like {{? title}} {{/if}}
              {{#if source}} and news.source = {{? source}} {{/if}}
              {{#if status}} and news.status = {{? status}} {{/if}}
              {{#if crawledAtStart}} and news.crawled_at >= {{? crawledAtStart}} and news.crawled_at < {{? crawledAtEnd}}  {{/if}}
              {{#if createdAtStart}} and news.created_at >= {{? createdAtStart}} and news.created_at < {{? createdAtEnd}} {{/if}}
        order by news.toped_at desc nulLs last, news.published_at desc
      `,
      {
        title: params.title,
        source: params.source,
        status: params.status,
        crawledAtStart: params.crawledAtStart,
        crawledAtEnd: params.crawledAtEnd,
        createdAtStart: params.createdAtStart,
        createdAtEnd: params.createdAtEnd
      }
    );
    const list = await appDB.page(
      sql,
      params.pageNo,
      params.pageSize,
      ...param
    );
    // 查询所有地区列表
    const areaList = await originalDB.execute(
      // language=PostgreSQL
      `
        select code, name
        from area
      `
    );
    const data = list.data.map(it => ({
      ...it,
      arealist: !it.areas
        ? []
        : it.areas
            .map(areaIt => {
              return areaList.find(findIt => findIt.code === areaIt);
            })
            .filter(filterIt => filterIt)
    }));

    return {
      ...list,
      data
    };
  }

  /**
   * 文章详情
   *
   * @param id 新闻id
   * @return {
   *   id: '新闻id',
   *   title: '新闻标题',
   *   source: '数据来源',
   *   status: '状态:未发布,已发布,已下架',
   *   content: '内容',
   *   cover?: '第一张图片',
   *   author?: '作者',
   *   virtual_pv: '虚拟浏览量',
   *   toped_at?: 置顶时间,
   *   crawled_at?: '爬取时间',
   *   published_by?: '发布人',
   *   published_at?: '发布时间',
   *   pv: 浏览量(20),
   *   areas: []
   * }
   */
  async detail(id) {
    return (
      await appDB.execute(
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
                  group by news)                                                   areas,
                 (select count(1) from news_pv_mapping pv where pv.news = news.id) pv
          from news
          where id = ?
        `,
        id
      )
    ).map(it => ({
      ...it,
      pv: Number(it.pv)
    }))[0];
  }

  /**
   * 新闻下架
   *
   * @param id 新闻id
   */
  async removed(id) {
    await appDB.transaction(async () => {
      await appDB.execute(
        // language=PostgreSQL
        `
          update news
          set status = ?
          where id = ?
        `,
        newsStatus.REMOVED,
        id
      );
    });
  }

  /**
   * 新闻删除
   *
   * @param id 新闻id
   */
  async delete(id) {
    await appDB.transaction(async () => {
      // 删除新闻点赞
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from news_thumb_mapping
          where news = ?
        `,
        id
      );
      // 删除新闻浏览量
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from news_pv_mapping
          where news = ?
        `,
        id
      );
      // 删除新闻地区关联
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from news_area_mapping
          where news = ?
        `,
        id
      );
      // 删除新闻
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from news
          where id = ?
        `,
        id
      );
    });
  }

  /**
   * 图片上传
   *
   * @param file 图片对象
   */
  async upload(file) {
    const ext = path.extname(file?.originalname ?? '');
    if (!ext) throw new KatoRuntimeError(`文件扩展名不合法`);
    const filename = `/news/${uuid()}${ext}`;
    await unifs.writeFile(filename, file.buffer);
    return filename;
  }
}
