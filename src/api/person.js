import {etlDB} from '../app';
import {QueryTypes} from 'sequelize';
import {KatoCommonError} from 'kato-server';
import {sql as sqlRender} from '../database/template';
import {Context} from './context';

async function etlQuery(sql, params) {
  return etlDB.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

function listRender(params) {
  return sqlRender(
    `
      from mark_person mp
             inner join view_personinfo vp on mp.personnum = vp.personnum and mp.hisid = vp.hisid
             inner join view_hospital vh on mp.hisid = vh.hisid and vp.adminorganization = vh.hospid
      where mp.hisid = {{? his}}
        and vp.vouchertype = '1'
        {{#if name}} and vp.name like {{? name}} {{/if}}
        {{#if hospitals}} and vp.adminorganization in ({{#each hospitals}}{{? this}}{{#sep}},{{/sep}}{{/each}}){{/if}}
        {{#if idCard}} and vp.idcardno = {{? idCard}}{{/if}}
    `,
    params
  );
}

export default class Person {
  async list(params) {
    const {pageSize, pageNo, hospital, idCard} = params;
    const limit = pageSize;
    const offset = (pageNo - 1 || 0) * limit;
    const his = '340203';
    let {name} = params;
    if (name) name = `%${name}%`;
    let hospitals = Context.current.user.hospitals.map(it => it.id);
    if (hospital) hospitals = [hospital];
    // language=PostgreSQL
    hospitals = (
      await Promise.all(
        hospitals.map(it =>
          etlQuery(
            `select hishospid as id from hospital_mapping where h_id = ?`,
            [it]
          )
        )
      )
    )
      .filter(it => it.length > 0)
      .reduce(
        (result, current) => [...result, ...current.map(it => it.id)],
        []
      );
    const sqlRenderResult = listRender({his, name, hospitals, idCard});
    const count = (
      await etlQuery(
        `select count(1) as count ${sqlRenderResult[0]}`,
        sqlRenderResult[1]
      )
    )[0].count;
    const person = await etlQuery(
      `select vp.personnum   as id,
               vp.name,
               vp.idcardno    as "idCard",
               mp."S03",
               mp."S23",
               vh.hospname    as "hospitalName",
               vp.operatetime as date
           ${sqlRenderResult[0]}
           order by vp.operatetime desc
           limit ? offset ?`,
      [...sqlRenderResult[1], limit, offset]
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

  /**
   * 获取个人档案信息
   *
   * @param id 个人id
   */
  async document(id) {
    return (
      // language=PostgreSQL
      (
        await etlQuery(
          `
            select vp.*, vh.hospname as organization
            from view_personinfo vp
                   inner join view_hospital vh on vp.adminorganization = vh.hospid
            where personnum = ?
          `,
          [id]
        )
      ).map(it => ({
        ...it,
        sex: it.sex === '1' ? '男' : '女'
      }))[0]
    );
  }
}
