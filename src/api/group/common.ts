import {originalDB} from '../../app';

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

export async function getChildrenArea(code: string) {
  const children = await originalDB.execute(
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
  if (children.length === 0) {
    return await originalDB.execute(
      // language=PostgreSQL
      `select code,
              name,
              parent,
              path,
              label
       from area
       where code = ?`,
      code
    );
  }
  return children;
}
