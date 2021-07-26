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

export default class Common {
  async test(code) {
    return getHospitals(code);
  }
}
