import {appDB} from '../app';
import {sql as sqlRender} from '../database';
import {Context} from './context';
import dayjs = require('dayjs');

/**
 * 获取地区树, 包括自己
 *
 * @param code 地区code
 */
export async function getAreaTree(
  code
): Promise<
  {
    name: string;
    code: string;
    parent: string;
    level: number;
    root: string;
    path: string;
    cycle: boolean;
    leaf: boolean;
  }[]
> {
  const condition = code ? `code = '${code}'` : 'parent is null';
  // language=PostgreSQL
  return await appDB.execute(`
    with recursive tree(
                        name,
                        code,
                        parent,
                        level,
                        path,
                        root,
                        cycle
      ) as (
      select name,
             code                          as code,
             parent                        as code,
             1                             as level,
             (array [code])::varchar(36)[] as path,
             code                          as root,
             false                         as cycle
      from area
      where ${condition}
      union all
      select c.name,
             c.code                               as code,
             c.parent                             as parent,
             level + 1                            as level,
             (tree.path || c.code)::varchar(36)[] as path,
             tree.root                            as root,
             c.code = any (path)                  as cycle
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
           path,                                                       -- 根节点
           cycle,                                                      -- 是否循环
           case when t.parent is null then true else false end as leaf -- 是否是叶子节点
    from tree
           left join (select parent from area group by parent) t on tree.code = t.parent
  `);
}

/**
 * 获取当前节点下的所有叶子节点
 *
 * @param code 地区code
 */
export async function getLeaves(
  code: string
): Promise<
  {
    name: string;
    code: string;
    parent: string;
    level: number;
    root: string;
    path: string;
    cycle: boolean;
    leaf: boolean;
  }[]
> {
  return (await getAreaTree(code)).filter(it => it.leaf);
}

/**
 * 获取地区对应的原始数据的机构
 *
 * @param codes 地区code数据
 */
export async function getOriginalArray(
  codes: string[]
): Promise<{id: string; code: string}[]> {
  const result = [];
  for (const code of codes) {
    try {
      // language=PostgreSQL
      const idArray: {id: string; code: string}[] = await appDB.execute(
        `select hishospid as id, h_id as code
         from hospital_mapping
         where h_id = ?`,
        code
      );
      if (idArray[0]) {
        result.push(idArray[0]);
      }
    } catch (e) {
      // 无所谓
    }
  }
  return result;
}

/**
 * 获取地区树
 *
 * @param code 地区code
 */
export async function getGroupTree(
  code
): Promise<
  {
    name: string;
    code: string;
    parent: string;
    level: number;
    root: string;
    path: string;
    cycle: boolean;
    leaf: boolean;
  }[]
> {
  const condition = code ? `parent = '${code}'` : 'parent is null';
  // language=PostgreSQL
  return await appDB.execute(`
    with recursive tree(
                        name,
                        code,
                        parent,
                        level,
                        path,
                        root,
                        cycle
      ) as (
      select name,
             code                          as code,
             parent                        as code,
             1                             as level,
             (array [code])::varchar(36)[] as path,
             code                          as root,
             false                         as cycle
      from area
      where ${condition}
      union all
      select c.name,
             c.code                               as code,
             c.parent                             as parent,
             level + 1                            as level,
             (tree.path || c.code)::varchar(36)[] as path,
             tree.root                            as root,
             c.code = any (path)                  as cycle
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
           path,                                                       -- 根节点
           cycle,                                                      -- 是否循环
           case when t.parent is null then true else false end as leaf -- 是否是叶子节点
    from tree
           left join (select parent from area group by parent) t on tree.code = t.parent
  `);
}

/**
 * group实体类型
 */
type GroupModel = {code: string; name: string; parent?: string};

/**
 * group upsert函数
 * @param node group实体
 */
async function upsert(node: GroupModel): Promise<void> {
  // language=PostgreSQL
  const group = (
    await appDB.execute(
      `select *
       from "group"
       where code = ?
       limit 1`,
      node.code
    )
  )[0];
  if (group) {
    // language=PostgreSQL
    await appDB.execute(
      `update "group"
       set name   = ?,
           parent = ?
       where code = ?`,
      node.name,
      node.parent,
      node.code
    );
  } else {
    // language=PostgreSQL
    await appDB.execute(
      `insert into "group"(code, name, parent)
       values (?, ?, ?)`,
      node.code,
      node.name,
      node.parent
    );
  }
}

export default class Group {
  /**
   * group表同步接口
   */
  async sync() {
    return appDB.transaction(async () => {
      // 同步区级及以上的地区数据
      // language=PostgreSQL
      const regions: GroupModel[] = await appDB.execute(`
        select code, name, parent
        from region
        where level < 4
        order by level
      `);
      for (const region of regions) await upsert(region);

      // 同步一级机构
      // language=PostgreSQL
      const centers: GroupModel[] = await appDB.execute(`
        select h.name as name, h.id as code, foo.region as parent
        from hospital h
               inner join (
          select h1.id, r.code as region
          from hospital h1
                 inner join region r on h1.region = r.code and r.level = 3
        ) foo on h.parent = foo.id
      `);
      for (const center of centers) await upsert(center);

      // 同步二级机构
      const [sql, params] = sqlRender(
        `
          select id as code, name as name, parent as parent
          from hospital
          where parent in ({{#each centers}}{{? this}}{{#sep}},{{/sep}}{{/ each}})`,
        {centers: centers.map(it => it.code)}
      );
      const hospitals: GroupModel[] = await appDB.execute(sql, ...params);
      for (const hospital of hospitals) await upsert(hospital);
    });
  }

  /**
   * 地区列表
   * @param code
   * return usable: true:可选, false: 不可选
   */
  async list(code) {
    let where = '';
    // 判断code是否为空,如果传值,查询下级,如果没有传值,查询自身权限
    if (code) {
      where += ` and parent = ? `;
    } else {
      code = Context.current.user.regionId;
      // 没传值查本身
      where += ` and code = ? `;
    }
    // 地区列表
    const list = await appDB.execute(
      `
            select "code", "name"
            from "area"
            where 1 = 1 ${where}`,
      code
    );

    // 查询的年份
    const checkYear = dayjs().format('YYYY');
    // 已经参加考核的地区
    const checkArea = await appDB.execute(
      `select "area"."area"
       from check_area "area"
              left join check_system system on "area".check_system = system.check_id
       where system.check_year = ?`,
      checkYear
    );

    // 排查所有的地区是否已经参加考核
    const regionList = list.map(it => {
      const index = checkArea.findIndex(item => item.area === it.code);
      return {
        ...it,
        usable: index === -1 ? true : false
      };
    });
    return regionList;
  }
}
