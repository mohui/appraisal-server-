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
        {{#compare S03}} and mp."S03"={{? S03}}{{/compare}}
        {{#compare S23}} and mp."S23"={{? S23}}{{/compare}}
        {{#compare O00}} and mp."O00"={{? O00}}{{/compare}}
        {{#compare O01}} and mp."O01"={{? O01}}{{/compare}}
        {{#compare O02}} and mp."O02"={{? O02}}{{/compare}}
        {{#compare H01}} and mp."H01"={{? H01}}{{/compare}}
        {{#compare H02}} and mp."H02"={{? H02}}{{/compare}}
        {{#compare D01}} and mp."D01"={{? D01}}{{/compare}}
        {{#compare D02}} and mp."D02"={{? D02}}{{/compare}}
        {{#compare C01}} and mp."C01"={{? C01}}{{/compare}}
        {{#compare C02}} and mp."C02"={{? C02}}{{/compare}}
        {{#compare C03}} and mp."C03"={{? C03}}{{/compare}}
        {{#compare C04}} and mp."C04"={{? C04}}{{/compare}}
        {{#compare C05}} and mp."C05"={{? C05}}{{/compare}}
        {{#compare C00}} and mp."C00"={{? C00}}{{/compare}}
        {{#compare C06}} and mp."C06"={{? C06}}{{/compare}}
        {{#compare C07}} and mp."C07"={{? C07}}{{/compare}}
        {{#compare C08}} and mp."C08"={{? C08}}{{/compare}}
        {{#compare C09}} and mp."C09"={{? C09}}{{/compare}}
        {{#compare C10}} and mp."C10"={{? C10}}{{/compare}}
        {{#compare C11}} and mp."C11"={{? C11}}{{/compare}}
        {{#compare C13}} and mp."C13"={{? C13}}{{/compare}}
        {{#compare C14}} and mp."C14"={{? C14}}{{/compare}}
        {{#compare E00}} and mp."E00"={{? E00}}{{/compare}}
    `,
    params
  );
}

export default class Person {
  async list(params) {
    const {pageSize, pageNo, hospital, idCard, tags} = params;
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
    const sqlRenderResult = listRender({his, name, hospitals, idCard, ...tags});
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
                mp."O00",
                mp."O01",
                mp."O02",
                mp."H00",
                mp."H01",
                mp."H02",
                mp."D00",
                mp."D01",
                mp."D02",
                mp."C01",
                mp."C02",
                mp."C03",
                mp."C04",
                mp."C05",
                mp."C00",
                mp."C06",
                mp."C07",
                mp."C08",
                mp."C09",
                mp."C10",
                mp."C11",
                mp."C13",
                mp."C14",
                mp."E00",
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
   * @return {
   *   id: id
   *   name: 姓名
   *   address: 现住址
   *   census: 户籍地址
   *   phone: 联系电话
   *   operateOrganization{ 建档机构
   *     id: id
   *     name: 机构名
   *   }:
   *   organization: {
   *     id: id,
   *     name: 机构名
   *   }
   *   fileDate: 建档日期
   *   updateAt: 更新日期
   * }
   */
  async document(id) {
    const person = (
      await etlQuery(
        // language=PostgreSQL
        `
          select personnum       as id,
                 name,
                 address,
                 Residencestring as "census",
                 phone,
                 filedate        as "fileDate",
                 adminorganization,
                 operateorganization,
                 operatetime as "updateAt"
          from view_personinfo
          where personnum = ?
          limit 1
        `,
        [id]
      )
    )[0];

    if (!person) throw new KatoCommonError('数据不存在');
    person.operateOrganization = (
      await etlQuery(
        // language=PostgreSQL
        `
          select hospid as id, hospname as name
          from view_hospital
          where hospid = ?
        `,
        [person.operateorganization]
      )
    )[0];

    person.organization = (
      await etlQuery(
        // language=PostgreSQL
        `
            select hospid as id, hospname as name
            from view_hospital
            where hospid = ?
          `,
        [person.adminorganization]
      )
    )[0];

    return person;
  }

  /**
   * 获取高血压随访
   *
   * @param id 个人id
   * return {
   *   id: id,
   *   followDate: 随访时间
   *   followWay: 随访方式
   *   systolicpressure: 收缩压
   *   assertpressure: 舒张压
   *   doctor: 随访医生
   *   updateAt: 更新时间
   * }
   */
  async hypertensions(id) {
    const followCodeNames = await etlQuery(
      `select vc.codename,vc.code from view_codedictionary vc where vc.categoryno=?`,
      ['7010104']
    );
    return (
      await etlQuery(
        // language=PostgreSQL
        `
        select vhv.highbloodid as id,
               vhv.followupdate as "followDate",
               vhv.followupway as "followWay",
               vhv.systolicpressure as "systolicPressure",
               vhv.assertpressure as "assertPressure",
               vhv.doctor,
               vhv.operatetime as "updateAt"
        from view_hypertensionvisit vhv
               inner join view_hypertension vh on vhv.HypertensionCardID = vh.HypertensionCardID
        where vh.personnum = ?
        order by vhv.followupdate desc
      `,
        [id]
      )
    ).map(item => ({
      ...item,
      followWay: followCodeNames.find(way => way.code === item.followWay)
        ?.codename
    }));
  }

  /**
   * 获取糖尿病随访
   * followDate: 随访时间
   * followWay: 随访方式
   * fastingGlucose: 空腹血糖
   * postprandialGlucose: 随机血糖
   * doctor: 随访医生
   * updateAt: 更新时间
   * @param id 个人id
   */
  async diabetes(id) {
    const followCodeNames = await etlQuery(
      `select vc.codename,vc.code from view_codedictionary vc where vc.categoryno=?`,
      ['7010104']
    );
    // language=PostgreSQL
    return (
      await etlQuery(
        `
        select
          vdv.followupdate as "followDate",
          vdv.followupway as "followWay",
          vdv.FastingGlucose as "fastingGlucose",
          vdv.PostprandialGlucose as "postprandialGlucose",
          vdv.doctor,
          vdv.operatetime as "updateAt"
        from view_diabetesvisit vdv
               inner join view_diabetes vd on vdv.SugarDiseaseCardID = vd.SugarDiseaseCardID
        where vd.personnum = ?
        order by vdv.operatetime desc
      `,
        [id]
      )
    ).map(item => ({
      ...item,
      followWay: followCodeNames.find(way => way.code === item.followWay)
        ?.codename
    }));
  }

  /**
   * 获取体检表
   * stature: 身高
   * weight: 体重
   * temperature: 体温
   * symptom: 症状
   * bc_abnormal: B超说明
   * updateAt: 更新时间
   * @param id 个人id
   */
  async healthy(id) {
    return etlQuery(
      `
        select
          vh.stature as "stature",
          vh.weight as "weight",
          vh.temperature as "temperature",
          vh.symptom as "symptom",
          vh.bc_abnormal as "bc_abnormal",
          vh.operatetime as "updateAt"
        from view_healthy vh
        where vh.personnum = ?
        order by vh.operatetime desc
       `,
      [id]
    );
  }
}
