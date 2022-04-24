/**
 * 新闻状态
 */
export enum newsStatus {
  UNPUBLISHED = '未发布',
  PUBLISHED = '已发布',
  REMOVED = '已下架'
}

/**
 * 数据来源
 */
export enum newsSource {
  SELF = '自行创建'
}

/**
 * 来源列表
 */
export const sourceList = [
  {
    value: newsSource.SELF,
    name: newsSource.SELF
  }
];
