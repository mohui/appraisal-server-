import {etlDB} from '../app';
import {QueryTypes} from 'sequelize';
import {KatoCommonError} from 'kato-server';

async function etlQuery(sql, params): Promise<any[]> {
  return etlDB.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

export default class Person {
  async list(params) {
    const {pageSize, pageNo} = params;
    const limit = pageSize;
    const offset = (pageNo - 1 || 0) * limit;
    const his = '340203';
    // language=PostgreSQL
    const count = (
      await etlDB.query(
        `select count(1) as count
           from mark_person mp
                  inner join view_personinfo vp on mp.personnum = vp.personnum and mp.hisid = vp.hisid
                  inner join view_hospital vh on mp.hisid = vh.hisid and vp.adminorganization = vh.hospid
           where mp.hisid = ?
             and vp.vouchertype = '1'
        `,
        {
          replacements: [his],
          type: QueryTypes.SELECT
        }
      )
    )[0].count;

    // language=PostgreSQL
    const person = await etlDB.query(
      `
        select vp.personnum   as id,
               vp.name,
               vp.idcardno    as "idCard",
               mp."S03",
               mp."S23",
               vh.hospname    as "hospitalName",
               vp.operatetime as date
        from mark_person mp
               inner join view_personinfo vp on mp.personnum = vp.personnum and mp.hisid = vp.hisid
               inner join view_hospital vh on mp.hisid = vh.hisid and vp.adminorganization = vh.hospid
        where mp.hisid = ?
          and vp.vouchertype = '1' -- 证件类型 身份证
        order by vp.operatetime desc
        limit ? offset ?
      `,
      {
        replacements: [his, limit, offset],
        type: QueryTypes.SELECT
      }
    );

    return {
      count: Number(count),
      rows: person
    };
  }

  async detail(id) {
    // language=PostgreSQL
    const person = (
      await etlQuery(
        `
          select personnum as id,
                 name,
                 sex,
                 birth,
                 idcardno  as "idCard",
                 phone
          from view_personinfo
          where personnum = ?
          limit 1
        `,
        [id]
      )
    )[0];
    if (!person) throw new KatoCommonError('数据不存在');
    // language=PostgreSQL
    const hypertensionRows = await etlQuery(
      `
        select *
        from view_hypertension
        where personnum = ?
      `,
      [id]
    );

    return {
      document: person,
      hypertension: hypertensionRows
    };
  }
}
