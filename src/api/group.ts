import {appDB} from '../app';
import {sql as sqlRender} from '../database';
import {Context} from './context';
import dayjs = require('dayjs');
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
            from "group"
            where 1 = 1 ${where}`,
      code
    );

    // 查询的年份
    const checkYear = dayjs().format('YYYY');
    // 已经参加考核的地区
    const checkGroup = await appDB.execute(
      `select "group"."group"
            from check_group "group"
            left join check_system system on "group".check_system = system.check_id
            where system.check_year = ?`,
      checkYear
    );

    // 排查所有的地区是否已经参加考核
    const regionList = list.map(it => {
      const index = checkGroup.findIndex(item => item.group === it.code);
      return {
        ...it,
        usable: index === -1 ? true : false
      };
    });
    return regionList;
  }
}
