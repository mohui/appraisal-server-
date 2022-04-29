import {appDB, originalDB} from '../app';
import {Context} from './context';
import {KatoRuntimeError} from 'kato-server';

/**
 * group实体类型
 */
type GroupModel = {code: string; name: string; parent?: string};

export default class Group {
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
      ` select code, name, parent, label
          from area
          where parent = ? `,
      code
    );
  }
}
