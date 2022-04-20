import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';

export class AddNews implements IMigration {
  name = '添加新闻资讯表';
  version = 58;

  async up(client: ExtendedSequelize): Promise<void> {
    // language=PostgreSQL
    await client.execute(`
      -- 新闻主表
      CREATE TABLE IF NOT EXISTS "news"
      (
        id         VARCHAR(36) PRIMARY KEY,
        title      VARCHAR(255),
        source     VARCHAR(255),
        status     varchar(255)                                       not null default '未发布',
        content    text,
        url        varchar(255),
        author     varchar(36),
        toped_at   TIMESTAMP WITH TIME ZONE,
        created_by VARCHAR(50),
        updated_by VARCHAR(50),
        crawled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
      COMMENT ON COLUMN "news"."id" IS '主键id';
      COMMENT ON COLUMN "news"."title" IS '标题';
      COMMENT ON COLUMN "news"."source" IS '来源';
      COMMENT ON COLUMN "news"."status" IS '状态:未发布,已发布,已下架';
      COMMENT ON COLUMN "news"."content" IS '内容';
      COMMENT ON COLUMN "news"."url" IS '第一张图片';
      COMMENT ON COLUMN "news"."author" IS '作者';
      COMMENT ON COLUMN "news"."toped_at" IS '置顶时间';
      COMMENT ON COLUMN "news"."created_by" IS '创建人';
      COMMENT ON COLUMN "news"."updated_by" IS '修改人';
      COMMENT ON COLUMN "news"."crawled_at" IS '爬取时间';
      COMMENT ON COLUMN "news"."created_at" IS '创建时间';
      COMMENT ON COLUMN "news"."updated_at" IS '修改时间';

      -- 新闻地区表
      CREATE TABLE IF NOT EXISTS "news_area_mapping"
      (
        news       VARCHAR(36),
        area       VARCHAR(36),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        primary key (news, area)
      );
      COMMENT ON COLUMN "news_area_mapping"."news" IS '新闻id';
      COMMENT ON COLUMN "news_area_mapping"."area" IS '地区';
      COMMENT ON COLUMN "news_area_mapping"."created_at" IS '创建时间';
      COMMENT ON COLUMN "news_area_mapping"."updated_at" IS '修改时间';


      -- 新闻浏览表
      CREATE TABLE IF NOT EXISTS "news_pv_mapping"
      (
        news       VARCHAR(36),
        "user"     VARCHAR(36),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        primary key (news, "user")
      );
      COMMENT ON COLUMN "news_pv_mapping"."news" IS '新闻id';
      COMMENT ON COLUMN "news_pv_mapping"."user" IS '浏览的人';
      COMMENT ON COLUMN "news_area_mapping"."created_at" IS '创建时间';
      COMMENT ON COLUMN "news_area_mapping"."updated_at" IS '修改时间';

      -- 新闻点赞表
      CREATE TABLE IF NOT EXISTS "news_thumb_mapping"
      (
        news       VARCHAR(36),
        "user"     VARCHAR(36),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        primary key (news, "user")
      );
      COMMENT ON COLUMN "news_pv_mapping"."news" IS '新闻id';
      COMMENT ON COLUMN "news_pv_mapping"."user" IS '点赞的人';
      COMMENT ON COLUMN "news_area_mapping"."created_at" IS '创建时间';
      COMMENT ON COLUMN "news_area_mapping"."updated_at" IS '修改时间';
    `);
  }

  async down(client: ExtendedSequelize): Promise<void> {
    return;
  }
}
