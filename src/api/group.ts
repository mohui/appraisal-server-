import {appDB, originalDB} from '../app';
import {Context} from './context';
import {KatoRuntimeError} from 'kato-server';

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

/**
 * 获取地区树
 *
 * @param code 地区code
 */
export async function getGroupTree(code): Promise<AreaTreeNode[]> {
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
       from area
       where code = ?
       limit 1`,
      node.code
    )
  )[0];
  if (group) {
    // language=PostgreSQL
    await appDB.execute(
      `update area
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
      `insert into area(code, name, parent) values (?, ?, ?)`,
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

      // 同步中心层
      // language=PostgreSQL
      const centers: {
        u_id: string;
        id: string;
        name: string;
        region: string;
      }[] = await appDB.execute(`
        select h.id, h.name as name, hm.u_id, foo.region
        from hospital h
               inner join (
          select h1.id, r.code as region
          from hospital h1
                 inner join region r on h1.region = r.code and r.level = 3
        ) foo on h.parent = foo.id
               inner join hospital_mapping hm on hm.h_id = h.id
      `);
      for (const center of centers) {
        // 同步中心层
        await upsert({
          code: center.u_id,
          name: center.name,
          parent: center.region
        });
        // 同步一级机构
        await upsert({
          code: center.id,
          name: center.name,
          parent: center.u_id
        });
        // 同步二级机构
        const hospitals: {code: string; name: string}[] = await appDB.execute(
          `select id as code, name from hospital where parent = ?`,
          center.id
        );
        await Promise.all(
          hospitals.map(it =>
            upsert({
              ...it,
              parent: center.u_id
            })
          )
        );
      }
    });
  }

  /**
   * 地区列表
   * @param code
   * @param checkId
   * return usable: true:可选, false: 不可选
   */
  async list(code, checkId) {
    let where;
    // 判断code是否为空,如果传值,查询下级,如果没有传值,查询自身权限
    if (code) {
      where = `parent = ?`;
    } else {
      code = Context.current.user.regionId;
      where = `code = ?`;
    }
    // 地区列表
    const list = await originalDB.execute(
      // language=PostgreSQL
      `
        select code, name
        from area
        where
        ${where}
      `,
      code
    );

    // 根据checkId获取年份
    const checkSystem = await appDB.execute(
      `
      select check_year,area
      from check_system system
      left join check_area area on system.check_id = area.check_system
      where check_id = ?`,
      checkId
    );
    if (checkSystem.length === 0)
      throw new KatoRuntimeError(`checkId为${checkId} 的不存在`);

    const checkYear = checkSystem[0]['check_year'];

    // 已经参加考核的地区
    const checkArea = await appDB.execute(
      `
        select "area"."area",
               "system"."check_name"
        from check_area "area"
        left join check_system system on "area".check_system = system.check_id
        where system.check_year = ? and system.check_id != ?`,
      checkYear,
      checkId
    );

    // 排查所有的地区是否已经参加考核
    return list.map(it => {
      const index = checkArea.find(item => item.area === it.code);
      const area = checkSystem.find(item => item.area === it.code);
      return {
        code: it.code,
        name: it.name,
        system: index ? index.check_name : null,
        usable: index ? false : true,
        selected: area ? true : false
      };
    });
  }

  /**
   * 获取当前code的子级
   *
   * @param code 地区code
   */
  async children(code) {
    if (!code) {
      code = Context.current.user.code;
    }
    // language=PostgreSQL
    return await originalDB.execute(
      ` select code, name, parent
          from area
          where parent = ? `,
      code
    );
  }
}
