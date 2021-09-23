import {originalDB} from '../../app';

// 获取地区下的所有机构, 如果本身是机构返回自己
export async function getHospitals(code: string) {
  return await originalDB.execute(
    // language=PostgreSQL
    `select code,
              name,
              parent,
              path,
              label
       from area
       where label in ('hospital.center', 'hospital.station')
         and (code = ? or path like ?)`,
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
