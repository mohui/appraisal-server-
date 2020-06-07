import {etlDB} from '../app';
import {QueryTypes} from 'sequelize';

export default class Person {
  async list(pageSize, pageNo) {
    const limit = pageSize;
    const offset = (pageNo - 1 || 0) * limit;
    const his = '340203';
    // language=PostgreSQL
    const count = (
      await etlDB.query(
        `select count(1) as count
           from mark_person mp
                  left join view_personinfo vp on mp.personnum = vp.personnum and mp.hisid = vp.hisid
           where mp.hisid = ?
             and vp.vouchertype = '1'`,
        {
          replacements: [his],
          type: QueryTypes.SELECT
        }
      )
    )[0].count;

    // language=PostgreSQL
    const person = await etlDB.query(
      `
        select vp.name,
               vp.idcardno  as "idCard",
               mp."S03",
               mp."S23",
               vh0.hospname as hospital0,
               vh1.hospname as hospital1
        from mark_person mp
               left join view_personinfo vp on mp.personnum = vp.personnum and mp.hisid = vp.hisid
               left join view_hospital vh0 on mp.hisid = vh0.hisid and vp.operatorid = vh0.hospid
               left join view_hospital vh1 on mp.hisid = vh1.hisid and vp.adminorganization = vh1.hospid
        where mp.hisid = ?
          and vp.vouchertype = '1'
        limit ? offset ?
      `,
      {
        replacements: [his, limit, offset],
        type: QueryTypes.SELECT
      }
    );

    return {
      count: Number(count),
      rows: person.map(it => ({
        name: it.name,
        idCard: it.idCard,
        S03: it.S03,
        S23: it.S23,
        hospitalName: it.hospital0 ?? it.hospital1
      }))
    };
  }
}
