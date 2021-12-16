import {originalDB} from '../../app';
import * as dayjs from 'dayjs';

/**
 * 带时间的日志输出
 *
 * @param args 输出内容
 */
export function info(...args): void {
  console.info(dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'), ...args);
}

// 获取地区下的所有机构, 如果本身是机构返回自己
export async function getHospitals(code: string) {
  return await originalDB.execute(
    // language=PostgreSQL
    `
      select code,
             name,
             parent,
             path,
             label,
             created_at,
             updated_at
      from area
      where label in ('hospital.center', 'hospital.station', 'hospital.school')
        and (code = ? or path like ?)
    `,
    code,
    `%${code}%`
  );
}

// 获取地区的下属地区,没有下属返回空数组
export async function getChildrenArea(code: string) {
  return await originalDB.execute(
    // language=PostgreSQL
    `select code,
              name,
              parent,
              path,
              label
       from area
       where parent = ?`,
    code
  );
}

export type AreaTreeNode = {
  name: string;
  code: string;
  parent: string;
  level: number;
  root: string;
  path: string[];
  cycle: boolean;
  leaf: boolean;
};

/**
 * 获取地区树, 包括自己
 *
 * @param code 地区code
 */
export async function getAreaTree(code): Promise<AreaTreeNode[]> {
  const condition = code ? `code = '${code}'` : 'parent is null';
  return (
    await originalDB.execute(
      // language=PostgreSQL
      `
      with recursive tree(
                          name,
                          code,
                          parent,
                          level,
                          self_path,
                          root,
                          cycle
        ) as (
        select name,
               code                          as code,
               parent                        as code,
               1                             as level,
               (array [code])::varchar(36)[] as self_path,
               code                          as root,
               false                         as cycle
        from area
        where ${condition}
        union all
        select c.name,
               c.code                                    as code,
               c.parent                                  as parent,
               level + 1                                 as level,
               (tree.self_path || c.code)::varchar(36)[] as self_path,
               tree.root                                 as root,
               c.code = any (self_path)                  as cycle
        from tree,
             area c
        where tree.code = c.parent
          and not cycle
      )
      select name,                                                       -- 名称
             code,                                                       -- code
             tree.parent,                                                -- 父级code
             level,                                                      -- 层级
             root,                                                       -- 路径
             self_path,                                                  -- 根节点
             cycle,                                                      -- 是否循环
             case when t.parent is null then true else false end as leaf -- 是否是叶子节点
      from tree
             left join (select parent from area group by parent) t on tree.code = t.parent
    `
    )
  ).map<AreaTreeNode>(it => ({
    name: it.name,
    code: it.code,
    parent: it.parent,
    level: it.level,
    path: it.self_path,
    root: it.root,
    cycle: it.cycle,
    leaf: it.leaf
  }));
}
