import {originalDB} from '../app';
import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {sql as sqlRender} from '../database/template';
import {Context} from './context';
import * as dayjs from 'dayjs';
import {getTagsList} from '../../common/person-tag';
import * as Excel from 'exceljs';
import {createBackJob} from '../utils/back-job';
import {getHospitals} from './group/common';

async function dictionaryQuery(category) {
  // language=PostgreSQL
  return await originalDB.execute(
    `
      select category,
             code,
             name
      from ph_dict vc
      where category = ?
    `,
    category
  );
}

/**
 * 查询档案列表,并列出问题档案原因sql
 *
 * @param params {
 *   name: '姓名',
 *   hospitals: 机构数组,
 *   idCard: 身份证
 *   tags: 指标...,
 *   personOr: 是否有人群分类,
 *   documentOr: 档案问题
 *   year: 年份
 * }
 * @return [sql语句, [条件]]
 */
function listRenderForExcel(params) {
  return sqlRender(
    `
      from mark_person mp
             inner join ph_person vp on mp.id = vp.id and mp.year = {{? year}}
             inner join area on vp.adminorganization = area.code
             left join mark_content mc on mc.id = vp.id and mc.year = mp.year
      where 1 = 1
        {{#if name}} and vp.name like {{? name}} {{/if}}
        {{#if hospitals}} and vp.adminorganization in ({{#each hospitals}}{{? this}}{{#sep}},{{/sep}}{{/each}}){{/if}}
        {{#if idCard}} and vp.idcardno = {{? idCard}}{{/if}}
        and
          (
            1 = {{#if documentOr}} 0 {{else}} 1 {{/if}}
            {{#compare S03}}{{#if documentOr}} or {{else}} and {{/if}} mp."S03"={{? S03}} {{/compare}}
            {{#compare S23}}{{#if documentOr}} or {{else}} and {{/if}} mp."S23"={{? S23}} {{/compare}}
            {{#compare O00}}{{#if documentOr}} or {{else}} and {{/if}} mp."O00"={{? O00}} {{/compare}}
            {{#compare O02}}{{#if documentOr}} or {{else}} and {{/if}} mp."O02"={{? O02}} {{/compare}}
            {{#compare H00}}{{#if documentOr}} or {{else}} and {{/if}} mp."H00"={{? H00}} {{/compare}}
            {{#compare H01}}{{#if documentOr}} or {{else}} and {{/if}} mp."H01"={{? H01}} {{/compare}}
            {{#compare H02}}{{#if documentOr}} or {{else}} and {{/if}} mp."H02"={{? H02}} {{/compare}}
            {{#compare D00}}{{#if documentOr}} or {{else}} and {{/if}} mp."D00"={{? D00}} {{/compare}}
            {{#compare D01}}{{#if documentOr}} or {{else}} and {{/if}} mp."D01"={{? D01}} {{/compare}}
            {{#compare D02}}{{#if documentOr}} or {{else}} and {{/if}} mp."D02"={{? D02}} {{/compare}}
            {{#compare E00}}{{#if documentOr}} or {{else}} and {{/if}} mp."E00"={{? E00}} {{/compare}}
            {{#compare CH01}}{{#if documentOr}} or {{else}} and {{/if}} mp."CH01"={{? CH01}} {{/compare}}
            {{#compare CO01}}{{#if documentOr}} or {{else}} and {{/if}} mp."CO01"={{? CO01}} {{/compare}}
            {{#compare MCH01}}{{#if documentOr}} or {{else}} and {{/if}} mp."MCH01"={{? MCH01}} {{/compare}}
            {{#compare MCH02}}{{#if documentOr}} or {{else}} and {{/if}} mp."MCH02"={{? MCH02}} {{/compare}}
          )
          and
          (
            1 = {{#if personOr}} 0 {{else}} 1 {{/if}}
            {{#compare C01}}{{#if personOr}} or {{else}} and {{/if}} mp."C01"={{? C01}} {{/compare}}
            {{#compare C02}}{{#if personOr}} or {{else}} and {{/if}} mp."C02"={{? C02}} {{/compare}}
            {{#compare C03}}{{#if personOr}} or {{else}} and {{/if}} mp."C03"={{? C03}} {{/compare}}
            {{#compare C04}}{{#if personOr}} or {{else}} and {{/if}} mp."C04"={{? C04}} {{/compare}}
            {{#compare C05}}{{#if personOr}} or {{else}} and {{/if}} mp."C05"={{? C05}} {{/compare}}
            {{#compare C00}}{{#if personOr}} or {{else}} and {{/if}} mp."C00"={{? C00}} {{/compare}}
            {{#compare C06}}{{#if personOr}} or {{else}} and {{/if}} mp."C06"={{? C06}} {{/compare}}
            {{#compare C07}}{{#if personOr}} or {{else}} and {{/if}} mp."C07"={{? C07}} {{/compare}}
            {{#compare C08}}{{#if personOr}} or {{else}} and {{/if}} mp."C08"={{? C08}} {{/compare}}
            {{#compare C09}}{{#if personOr}} or {{else}} and {{/if}} mp."C09"={{? C09}} {{/compare}}
            {{#compare C10}}{{#if personOr}} or {{else}} and {{/if}} mp."C10"={{? C10}} {{/compare}}
            {{#compare C11}}{{#if personOr}} or {{else}} and {{/if}} mp."C11"={{? C11}} {{/compare}}
            {{#compare C13}}{{#if personOr}} or {{else}} and {{/if}} mp."C13"={{? C13}} {{/compare}}
            {{#compare C14}}{{#if personOr}} or {{else}} and {{/if}} mp."C14"={{? C14}} {{/compare}}
            {{#compare ai_2dm}}{{#if personOr}} or {{else}} and {{/if}} mp."ai_2dm"={{? ai_2dm}} {{/compare}}
            {{#compare ai_hua}}{{#if personOr}} or {{else}} and {{/if}} mp."ai_hua"={{? ai_hua}} {{/compare}}
          )
    `,
    params
  );
}

/***
 * 获取表格的buffer数据
 * @param params
 * @returns {Promise<{count: number, rows: []}|Buffer>}
 */
export async function getPersonExcelBuffer(params) {
  const {
    region,
    idCard,
    tags,
    personOr = false,
    documentOr = false,
    year
  } = params;
  let {name} = params;
  if (name) name = `%${name}%`;
  let hospitals = [];
  //没有选机构和地区,则默认查询当前用户所拥有的机构
  if (!region) throw new KatoCommonError('未传机构id或者地区code');
  // 获取所有的机构
  const areaModels = await getHospitals(region);
  hospitals = areaModels.map(it => it.code);

  //如果查询出来的机构列表为空,则数据都为空
  if (hospitals.length === 0) return {count: 0, rows: []};

  const sqlRenderResult = listRenderForExcel({
    name,
    hospitals,
    idCard,
    ...tags,
    personOr,
    documentOr,
    year
  });
  let person = await originalDB.execute(
    `
      select vp.id,
             vp.name,
             vp.idcardno    as "idCard",
             vp.address     as "address",
             vp.sex         as "gender",
             vp.phone       as "phone",
             mp."S03",
             mp."S23",
             mp."O00",
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
             mc.name        as "markName",
             mc.content     as "markContent",
             area.name      as "hospitalName",
             vp.operatetime as date
      ${sqlRenderResult[0]}
      order by vp.operatetime desc, vp.id desc
    `,
    ...sqlRenderResult[1]
  );
  person.forEach(p => {
    for (const i in p) {
      //空的指标 或 正常的档案指标、不是人群分类的指标 都不要
      if ((p[i] === null || p[i] === true) && i.indexOf('C') < 0) delete p[i];
    }
  });
  person = person
    .map(it => getTagsList(it))
    .reduce((pre, next) => {
      const current = pre.find(p => p.id === next.id);
      if (current) {
        const tag = current.tags.find(t => t.code === next.markName);
        if (tag) {
          if (tag.content.indexOf(next.markContent) < 0)
            tag.content.push(next.markContent);
        } else
          current.tags.push({
            label: current.label,
            code: current.markName,
            content: [current.markContent]
          });
      } else {
        const tags = next.tags.map(t => ({
          ...t,
          content: t.code === next.markName ? [next.markContent] : []
        }));
        pre.push({
          ...next,
          tags: tags
        });
      }
      return pre;
    }, [])
    .map(it => ({
      name: it.name,
      idCard: it.idCard,
      address: it.address,
      gender: it.gender === '1' ? '男' : '女',
      phone: it.phone,
      personTags: it.personTags.map(tag => tag.label).join(','),
      tags: it.tags
        .map(item => item.label + ':[' + item.content + ']')
        .join(',')
    }));
  //开始创建Excel表格
  const workBook = new Excel.Workbook();
  const workSheet = workBook.addWorksheet(`人员档案表格...`);
  //添加标题
  workSheet.addRow([
    '序号',
    '姓名',
    '身份证号',
    '住址',
    '性别',
    '电话',
    '人群分类',
    '档案问题'
  ]);
  const rows = person.map((it, index) => {
    const current = [index + 1];
    for (const k in it) {
      current.push(it[k]);
    }
    return current;
  });

  workSheet.addRows(rows);
  return workBook.xlsx.writeBuffer();
}

// region 拼接SQL
//查询档案列表的sql
function listRender(params) {
  return sqlRender(
    `
      from ph_person vp
             left join mark_person mp on mp.id = vp.id and mp.year = {{? year}}
             inner join area on vp.adminorganization = area.code
             left join ph_user pu on pu.id = vp.operatorId
             left join ph_dict pd_sex on pd_sex.category = '001' and vp.sex = pd_sex.code
      where 1 = 1
        and vp.WriteOff = false
        {{#if name}} and vp.name like {{? name}} {{/if}}
        {{#if hospitals}} and vp.adminorganization in ({{#each hospitals}}{{? this}}{{#sep}},{{/sep}}{{/each}}){{/if}}
        {{#if idCard}} and vp.idcardno = {{? idCard}}{{/if}}
        {{#if keyword}} and (vp.idcardno like {{? keyword}} or vp.name like {{? keyword}}){{/if}}
        {{#if doctor}} and pu.id = {{? doctor}}{{/if}}
        and
          (
            1 = {{#if documentOr}} 0 {{else}} 1 {{/if}}
            {{#compare S03}}{{#if documentOr}} or {{else}} and {{/if}} mp."S03"={{? S03}} {{/compare}}
            {{#compare S23}}{{#if documentOr}} or {{else}} and {{/if}} mp."S23"={{? S23}} {{/compare}}
            {{#compare O00}}{{#if documentOr}} or {{else}} and {{/if}} mp."O00"={{? O00}} {{/compare}}
            {{#compare O02}}{{#if documentOr}} or {{else}} and {{/if}} mp."O02"={{? O02}} {{/compare}}
            {{#compare H00}}{{#if documentOr}} or {{else}} and {{/if}} mp."H00"={{? H00}} {{/compare}}
            {{#compare H01}}{{#if documentOr}} or {{else}} and {{/if}} mp."H01"={{? H01}} {{/compare}}
            {{#compare H02}}{{#if documentOr}} or {{else}} and {{/if}} mp."H02"={{? H02}} {{/compare}}
            {{#compare D00}}{{#if documentOr}} or {{else}} and {{/if}} mp."D00"={{? D00}} {{/compare}}
            {{#compare D01}}{{#if documentOr}} or {{else}} and {{/if}} mp."D01"={{? D01}} {{/compare}}
            {{#compare D02}}{{#if documentOr}} or {{else}} and {{/if}} mp."D02"={{? D02}} {{/compare}}
            {{#compare E00}}{{#if documentOr}} or {{else}} and {{/if}} mp."E00"={{? E00}} {{/compare}}
            {{#compare CH01}}{{#if documentOr}} or {{else}} and {{/if}} mp."CH01"={{? CH01}} {{/compare}}
            {{#compare CO01}}{{#if documentOr}} or {{else}} and {{/if}} mp."CO01"={{? CO01}} {{/compare}}
            {{#compare MCH01}}{{#if documentOr}} or {{else}} and {{/if}} mp."MCH01"={{? MCH01}} {{/compare}}
            {{#compare MCH02}}{{#if documentOr}} or {{else}} and {{/if}} mp."MCH02"={{? MCH02}} {{/compare}}
          )
          and
          (
            1 = {{#if personOr}} 0 {{else}} 1 {{/if}}
            {{#compare C01}}{{#if personOr}} or {{else}} and {{/if}} mp."C01"={{? C01}} {{/compare}}
            {{#compare C02}}{{#if personOr}} or {{else}} and {{/if}} mp."C02"={{? C02}} {{/compare}}
            {{#compare C03}}{{#if personOr}} or {{else}} and {{/if}} mp."C03"={{? C03}} {{/compare}}
            {{#compare C04}}{{#if personOr}} or {{else}} and {{/if}} mp."C04"={{? C04}} {{/compare}}
            {{#compare C05}}{{#if personOr}} or {{else}} and {{/if}} mp."C05"={{? C05}} {{/compare}}
            {{#compare C00}}{{#if personOr}} or {{else}} and {{/if}} mp."C00"={{? C00}} {{/compare}}
            {{#compare C06}}{{#if personOr}} or {{else}} and {{/if}} mp."C06"={{? C06}} {{/compare}}
            {{#compare C07}}{{#if personOr}} or {{else}} and {{/if}} mp."C07"={{? C07}} {{/compare}}
            {{#compare C08}}{{#if personOr}} or {{else}} and {{/if}} mp."C08"={{? C08}} {{/compare}}
            {{#compare C09}}{{#if personOr}} or {{else}} and {{/if}} mp."C09"={{? C09}} {{/compare}}
            {{#compare C10}}{{#if personOr}} or {{else}} and {{/if}} mp."C10"={{? C10}} {{/compare}}
            {{#compare C11}}{{#if personOr}} or {{else}} and {{/if}} mp."C11"={{? C11}} {{/compare}}
            {{#compare C13}}{{#if personOr}} or {{else}} and {{/if}} mp."C13"={{? C13}} {{/compare}}
            {{#compare C14}}{{#if personOr}} or {{else}} and {{/if}} mp."C14"={{? C14}} {{/compare}}
            {{#compare ai_2dm}}{{#if personOr}} or {{else}} and {{/if}} mp."ai_2dm"={{? ai_2dm}} {{/compare}}
            {{#compare ai_hua}}{{#if personOr}} or {{else}} and {{/if}} mp."ai_hua"={{? ai_hua}} {{/compare}}
          )
    `,
    params
  );
}

// endregion
export default class Person {
  // region 列表

  @validate(
    should.object({
      pageSize: should.number().required(),
      pageNo: should.number().required(),
      name: should.string().allow('', null),
      hospital: should.string().allow('', null),
      region: should
        .string()
        .required()
        .allow('', null),
      idCard: should
        .string()
        .required()
        .allow('', null),
      tags: should
        .object()
        .required()
        .allow([]),
      crowd: should.object().allow({}),
      include: should.boolean().description('是否包含查询下级机构的个人档案'),
      personOr: should.boolean().description('人群分类是否or查询'),
      documentOr: should.boolean().description('档案问题是否or查询'),
      year: should.number().allow(null),
      keyword: should
        .string()
        .allow('', null)
        .description('姓名/身份证'),
      doctor: should
        .string()
        .allow('', null)
        .description('录入医生编号')
    })
  )
  async list(params) {
    const {
      pageSize,
      pageNo,
      region,
      idCard,
      tags,
      personOr = false,
      documentOr = false,
      year = dayjs().year(),
      doctor,
      crowd
    } = params;
    const limit = pageSize;
    const offset = (pageNo - 1 ?? 0) * limit;
    let {name} = params;
    if (name) name = `%${name}%`;
    let {keyword} = params;
    if (keyword) keyword = `%${keyword}%`;
    let hospitals = [];
    //没有选地区,则默认查询当前用户所拥有的机构
    if (!region || region === '')
      hospitals = Context.current.user.hospitals.map(it => it.id);
    else {
      const areaModels = await getHospitals(region);
      hospitals = areaModels.map(it => it.code);
    }

    //如果查询出来的机构列表为空,则数据都为空
    if (hospitals.length === 0) return {count: 0, rows: []};

    const sqlRenderResult = listRender({
      name,
      hospitals,
      idCard,
      ...tags,
      personOr,
      documentOr,
      year,
      keyword,
      doctor,
      ...crowd
    });
    const count = (
      await originalDB.execute(
        `select count(1) as count ${sqlRenderResult[0]}`,
        ...sqlRenderResult[1]
      )
    )[0].count;
    // 0-6 岁为true 查看详情不一定有数据 国卫和妇幼的数据是两套数据
    const person = await originalDB.execute(
      `
        select vp.id,
               vp.name,
               vp.idcardno    as "idCard",
               vp.address     as "address",
               vp.sex         as "gender",
               pd_sex.name    as "genderName",
               age(now(), vp.birth) as "age",
               vp.phone       as "phone",
               mp."S03",
               mp."S23",
               mp."O00",
               mp."O02",
               mp."H00",
               mp."H01",
               mp."H02",
               mp."D00",
               mp."D01",
               mp."D02",
               mp."MCH01",
               mp."MCH02",
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
               mp."CH01",
               mp."CO01",
               mp."E00",
               mp.ai_2dm,
               mp.ai_hua,
               mp.year,
               vp.operatorId  as "operatorId",
               pu.name        as "operatorName",
               area.name      as "hospitalName",
               vp.operatetime as date
        ${sqlRenderResult[0]}
        order by vp.operatetime desc, vp.id desc
        limit ? offset ?`,
      ...sqlRenderResult[1],
      limit,
      offset
    );

    return {
      count: Number(count),
      rows: person
    };
  }

  // endregion

  // region 导出人员档案表格

  /***
   * 导出人员档案表格
   * @param params
   * @returns {Promise<void>}
   */
  async personExcel(params) {
    try {
      // 如果region没有值
      if (!params.region) {
        //补充默认的地区code
        params.region = Context.current.user.code;
      }

      // 获取名称
      // language=PostgreSQL
      const areaModel = await originalDB.execute(
        `
          select name
          from area
          where code = ?
        `,
        params.region
      );
      const fileName = `${areaModel[0]?.name}人员档案表格`;

      return createBackJob('personExcel', fileName, {
        params,
        fileName
      });
    } catch (e) {
      throw new KatoCommonError(e.message);
    }
  }

  // endregion

  // region 详情

  async detail(id) {
    // language=PostgreSQL
    const person = (
      await originalDB.execute(
        `
          select id,
                 name,
                 sex,
                 birth,
                 idcardno as "idCard",
                 phone
          from ph_person
          where id = ?
          limit 1
        `,
        id
      )
    )[0];
    if (!person) throw new KatoCommonError('数据不存在');
    // language=PostgreSQL
    const hypertensionRows = await originalDB.execute(
      `
        select *
        from ph_hypertension
        where personnum = ?
      `,
      id
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
      await originalDB.execute(
        // language=PostgreSQL
        `
          select vp.id,
                 vp.name,
                 vp.address,
                 vp.Residencestring as "census",
                 vp.phone,
                 vp.filedate        as "fileDate",
                 vp.adminorganization,
                 vp.operateorganization,
                 mp."S03",
                 mp."S23",
                 mp."O00",
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
                 mp."MCH01",
                 mp."MCH02",
                 vp.operatetime     as "updateAt"
          from ph_person vp
                 left join mark_person mp on mp.id = vp.id and year = ?
          where vp.id = ?
            and vp.WriteOff = false
          limit 1
        `,
        dayjs().year(),
        id
      )
    )[0];

    if (!person) throw new KatoCommonError('数据不存在');
    person.operateOrganization = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select code as id, name as name
          from area
          where code = ?
        `,
        person.operateorganization
      )
    )[0];

    person.organization = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select code as id, name as name
          from area
          where code = ?
        `,
        person.adminorganization
      )
    )[0];

    return person;
  }

  // endregion

  // region 高血压
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
    const followCodeNames = await originalDB.execute(
      // language=PostgreSQL
      `
        select dict.name, dict.code
        from ph_dict dict
        where dict.category = ?
      `,
      '7010104'
    );
    return (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select vhv.id,
                 vhv.followupdate     as "followDate",
                 vhv.followupway      as "followWay",
                 vhv.systolicpressure as "systolicPressure",
                 vhv.assertpressure   as "assertPressure",
                 vhv.doctor,
                 vhv.operatetime      as "updateAt"
          from ph_hypertension_visit vhv
                 inner join ph_hypertension vh on vhv.hypertensionCardID = vh.id
          where vh.personnum = ?
            and vh.isdelete = false
            and vhv.isdelete = false
          order by vhv.followupdate desc
        `,
        id
      )
    ).map(item => ({
      ...item,
      followWay: followCodeNames.find(way => way.code === item.followWay)?.name
    }));
  }

  /***
   * 高血压随访详情
   * return {
   *   id: id,
   *   idCard: 身份证号码
   *   gender: 性别
   *   age: 年龄
   *   phone: 联系电话
   *   No: 编号
   *   followDate: 随访日期
   *   followWay: 随访方式
   *   symptoms: 症状
   *   systolicPressure: 收缩压
   *   assertPressure: 舒张压
   *   weight: 体重
   *   weightSuggest: 建议体重
   *   stature: 身高
   *   BMI: BMI
   *   BMIck: 建议BMI
   *   heartRate: 心率
   *   other: 其他
   *   daySmoke: 日吸烟量
   *   daySmokeSuggest: 建议日吸烟量
   *   dayDrink: 日饮酒量
   *   dayDrinkSuggest: 建议日饮酒量
   *   exerciseWeek: 运动(次/周)
   *   exerciseMinute: 每次锻炼时间(分钟/次)
   *   exerciseWeekSuggest: 运动（次/周）（建议）
   *   exerciseMinuteSuggest: 运动（分钟/次）（建议）
   *   saltInTake: 摄入盐量情况
   *   saltInTakeSuggest: 摄入盐量情况(建议)
   *   mental: 心理调整
   *   doctorStatue:  遵医行为
   *   assistExam: 辅助检查
   *   medicationAdherence: 服药依从性
   *   adverseReactions: 不良反应
   *   adverseReactionsExplain: 不良反应说明
   *   visitClass: 此次随访分类
   *   drugName1: 用药1名称
   *   dailyTimesDrugName1: 用药1每日次数
   *   usageDrugName1: 用药1每次量
   *   drugName2: 用药2名称
   *   dailyTimesDrugName2: 用药2每日次数
   *   usageDrugName2: 用药2每次量
   *   drugName3: 用药3名称
   *   dailyTimesDrugName3: 用药3每日次数
   *   usageDrugName3: 用药3每次量
   *   otherDrugName: 其他用药
   *   otherDailyTimesDrugName: 其他用药每日次数
   *   otherUsageDrugName: 其他用药每次用量
   *   remark: 备注
   *   referral: 是否转诊
   *   referralReason: 转诊原因
   *   referralAgencies: 转诊机构及科室
   *   nextVisitDate: 下次随访日期
   *   hospital: 录入机构
   *   updateAt: 录入时间
   *   doctor: 随访医生
   * }
   * @param id
   * @returns {Promise<void>}
   */
  async hypertensionsDetail(id) {
    const mentalCodeNames = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select code, name
          from ph_dict vc
          where category = ?
        `,
        '331'
      )
    ).map(item => ({
      ...item,
      code: 0 + item.code //TODO:字典数据里的code不带0, vd记录的带0, 先在字典结果的code前面加个0暂用
    }));

    const result = await originalDB.execute(
      // language=PostgreSQL
      `
        select vh.id,
               vh.hypertensioncardid   as "cardId",
               vh.Name                 as "name",
               vc_sex.name             as "gender",
               vh.age                  as "age",
               vh.ContactPhone         as "phone",
               vh.SerialNum            as "No",
               vh.FollowUpDate         as "followDate",
               vc_follow.name          as "followWay",
               vh.PresentSymptoms      as "symptoms",
               vh.SystolicPressure     as "systolicPressure",
               vh.AssertPressure       as "assertPressure",
               vh.Weight               as "weight",
               vh.Weight_Suggest       as "weightSuggest",
               vh.Stature              as "stature",
               vh.BMI                  as "BMI",
               vh.BMIck                as "BMISuggest",
               vh.HeartRate            as "heartRate",
               vh.Other_Tz             as "other",
               vh.DaySmoke             as "daySmoke",
               vh.DaySmoke_Suggest     as "daySmokeSuggest",
               vh.DayDrink             as "dayDrink",
               vh.DayDrink_Suggest     as "dayDrinkSuggest",
               vh.Sport_Week           as "exerciseWeek",
               vh.Sport_Minute         as "exerciseMinute",
               vh.Sport_Week_Suggest   as "exerciseWeekSuggest",
               vh.Sport_Minute_Suggest as "exerciseMinuteSuggest",
               vc_salt.name            as "saltInTake",
               vc_salt_suggest.name    as "saltInTakeSuggest",
               vh.MentalSet            as "mental",
               vc_doctor_s.name        as "doctorStatue",
               vh.Fzjc                 as "assistExam",
               vc_ma.name              as "medicationAdherence",
               vh.AdverseEffect        as "adverseReactions",
               vh.AdverseEffectOther   as "adverseReactionsExplain",
               vc_vc.name              as "visitClass",
               vh.DrugName1            as "drugName1",
               vh.Usage_Day1           as "dailyTimesDrugName1",
               vh.Usage_Time1          as "usageDrugName1",
               vh.DrugName2            as "drugName2",
               vh.Usage_Day2           as "dailyTimesDrugName2",
               vh.Usage_Time2          as "usageDrugName2",
               vh.DrugName3            as "drugName3",
               vh.Usage_Day3           as "dailyTimesDrugName3",
               vh.Usage_Time3          as "usageDrugName3",
               concat(vh.DrugName4, vh.DrugName5, vh.DrugName6, vh.DrugName7,
                      vh.DrugName8)    as "otherDrugName",
               concat(vh.Usage_Day4, vh.Usage_Day5, vh.Usage_Day6, vh.Usage_Day7,
                      vh.Usage_Day8)   as "otherDailyTimesDrugName",
               concat(vh.Usage_Time4, vh.Usage_Time5, vh.Usage_Time6, vh.Usage_Time7,
                      vh.Usage_Time8)  as "otherUsageDrugName",
               vh.Remark               as "remark",
               vh.Referral             as "referral",
               vh.ReferralReason       as "referralReason",
               vh.ReferralAgencies     as "referralAgencies",
               vh.NextVisitDate        as "nextVisitDate",
               vh.OperateOrganization  as "hospital",
               vh.OperateTime          as "updateAt",
               vh.Doctor               as "doctor"
        from ph_hypertension_visit vh
               left join ph_dict vc_sex on vc_sex.category = '001' and vc_sex.code = vh.sex
               left join ph_dict vc_follow on vc_follow.category = '7010104' and vc_follow.code = vh.FollowUpWay
               left join ph_dict vc_salt on vc_salt.category = '7010112' and vc_salt.code = vh.Salt_Situation
               left join ph_dict vc_salt_suggest
                         on vc_salt_suggest.category = '7010112' and vc_salt_suggest.code = vh.Salt_Situation_Suggest
               left join ph_dict vc_mental
                         on vc_mental.category = '331' and vc_mental.code = vh.MentalSet --TODO:字典数据里的code不带0, vh记录的带0
               left join ph_dict vc_doctor_s on vc_doctor_s.category = '332' and vc_doctor_s.code = vh.DoctorStatue
               left join ph_dict vc_ma on vc_ma.category = '181' and vc_ma.code = vh.MedicationAdherence
               left join ph_dict vc_vc on vc_vc.category = '7010106' and vc_vc.code = vh.VisitClass
        where vh.id = ?
          and vh.isdelete = false
      `,
      id
    );
    return result.map(r => ({
      ...r,
      mental: mentalCodeNames.find(m => m.code === r.mental)?.name
    }));
  }

  // endregion

  // region 糖尿病
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
    const followCodeNames = await originalDB.execute(
      // language=PostgreSQL
      `
        select vc.name, vc.code
        from ph_dict vc
        where vc.category = ?
      `,
      '7010104'
    );
    return (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select vdv.id,
                 vdv.followupdate        as "followDate",
                 vdv.followupway         as "followWay",
                 vdv.FastingGlucose      as "fastingGlucose",
                 vdv.PostprandialGlucose as "postprandialGlucose",
                 vdv.doctor,
                 vdv.operatetime         as "updateAt"
          from ph_diabetes_visit vdv
                 inner join ph_diabetes vd on vdv.SugarDiseaseCardID = vd.id
          where vd.personnum = ?
            and vd.isdelete = false
            and vdv.isdelete = false
          order by vdv.followupdate desc
        `,
        id
      )
    ).map(item => ({
      ...item,
      followWay: followCodeNames.find(way => way.code === item.followWay)?.name
    }));
  }

  /***
   * 糖尿病随访详情
   * return {
   * id : id
   * name: 姓名
   * gender: 性别
   * age: 年龄
   * idCard: 身份证号码
   * No:编号
   * followDate: 随访日期
   * followWay: 随访方式
   * symptoms: 症状
   * systolicPressure: 收缩压
   * assertPressure: 舒张压
   * weight: 体重
   * weightSuggest: 建议体重
   * stature: 身高
   * BMI: BMI
   * arterial: 足背动脉搏动
   * other: 其他
   * daySmoke: 日吸烟量
   * daySmokeSuggest: 建议日吸烟量
   * dayDrink: 日饮酒量
   * dayDrinkSuggest:建议日饮酒量
   * exerciseWeek: 运动(次/周)
   * exerciseMinute: 每次锻炼时间(分钟/次)
   * exerciseWeekSuggest: 运动（次/周)（建议）
   * exerciseMinuteSuggest: 运动（分钟/次）（建议）
   * principalFood: 主食
   * principalFoodSuggest: 主食(建议)
   * mental: 心理调整
   * doctorStatue: 遵医行为
   * fastingGlucose: 空腹血糖
   * postprandialGlucose: 随机血糖
   * hemoglobin: 糖化血红蛋白
   * lowBloodReaction: 低血糖反应
   * checkTime: 检查时间
   * medicationAdherence: 服药依从性
   * adverseReactions: 不良反应
   * visitClass: 此次随访分类
   * drugName1: 用药1名称
   * dailyTimesDrugName1: 用药1每日次数
   * usageDrugName1: 用药1每次量
   * drugName2: 用药2名称
   * dailyTimesDrugName2: 用药2每日次数
   * usageDrugName2: 用药2每次量
   * drugName3: 用药3名称
   * dailyTimesDrugName3: 用药3每日次数
   * usageDrugName3: 用药3每次量
   * otherDrugName: 其他用药
   * otherDailyTimesDrugName: 其他用药每日次数
   * otherUsageDrugName: 其他用药每次用量
   * insulin1: 胰岛素1名称
   * usageInsulin1: 胰岛素1用法用量
   * insulin2: 胰岛素2名称
   * usageInsulin2: 胰岛素2用法用量
   * remark: 备注
   * referral: 是否转诊
   * referralReason: 转诊原因
   * referralAgencies: 转诊机构及科室
   * nextVisitDate: 下次随访日期
   * hospital: 录入机构
   * updateAt: 录入时间
   * doctor: 随访医生
   * }
   * @param id
   */
  async diabetesDetail(id) {
    const mentalCodeNames = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select code, name
          from ph_dict vc
          where category = ?
        `,
        '331'
      )
    ).map(item => ({
      ...item,
      code: 0 + item.code //TODO:字典数据里的code不带0, vd记录的带0, 先在字典结果的code前面加个0暂用
    }));

    // language=PostgreSQL
    const result = await originalDB.execute(
      `
        select vd.id,
               vd.name                   as "name",
               vc_sex.name               as "gender",
               vd.age                    as "age",
               vd.idCardNo               as "idCard",
               vd.serialNum              as "No",
               vd.followUpDate           as "followDate",
               vc_follow.name            as "followWay",
               vd.presentSymptoms        as "symptoms",
               vd.SystolicPressure       as "systolicPressure",
               vd.AssertPressure         as "assertPressure",
               vd.Weight                 as "weight",
               vd.Weight_Suggest         as "weightSuggest",
               vd.Stature                as "stature",
               vd.BMI                    as "BMI",
               vd.BMI_Suggest            as "BMISuggest",
               vc_arterial.name          as "arterial",
               vd.Other_Tz               as "other",
               vd.DaySmoke               as "daySmoke",
               vd.DaySmoke_Suggest       as "daySmokeSuggest",
               vd.DayDrink               as "dayDrink",
               vd.DayDrink_Suggest       as "dayDrinkSuggest",
               vd.Sport_Week             as "exerciseWeek",
               vd.Sport_Minute           as "exerciseMinute",
               vd.Sport_Week_Suggest     as "exerciseWeekSuggest",
               vd.Sport_Minute_Suggest   as "exerciseMinuteSuggest",
               vd.Principal_Food         as "principalFood",
               vd.Principal_Food_Suggest as "principalFoodSuggest",
               vd.MentalSet              as "mental",
               vc_doctor_s.name          as "doctorStatue",
               vd.FastingGlucose         as "fastingGlucose",
               vd.PostprandialGlucose    as "postprandialGlucose",
               vd.Hemoglobin             as "hemoglobin",
               vc_lb.name                as "lowBloodReaction",
               vd.CheckTime              as "checkTime",
               vd.MedicationAdherence    as "medicationAdherence",
               vd.Blfy                   as "adverseReactions",
               vd.BlfyOther              as "adverseReactionsExplain",
               vc_vc.name                as "visitClass",
               vd.DrugName1              as "drugName1",
               vd.Usage_Day1             as "dailyTimesDrugName1",
               vd.Usage_Time1            as "usageDrugName1",
               vd.DrugName2              as "drugName2",
               vd.Usage_Day2             as "dailyTimesDrugName2",
               vd.Usage_Time2            as "usageDrugName2",
               vd.DrugName3              as "drugName3",
               vd.Usage_Day3             as "dailyTimesDrugName3",
               vd.Usage_Time3            as "usageDrugName3",
               concat(vd.DrugName4, vd.DrugName5, vd.DrugName6, vd.DrugName7,
                      vd.DrugName8)      as "otherDrugName",
               concat(vd.Usage_Day4, vd.Usage_Day5, vd.Usage_Day6, vd.Usage_Day7,
                      vd.Usage_Day8)     as "otherDailyTimesDrugName",
               concat(vd.Usage_Time4, vd.Usage_Time5, vd.Usage_Time6, vd.Usage_Time7,
                      vd.Usage_Time8)    as "otherUsageDrugName",
               vd.Insulin1               as "insulin1",
               vd.InsulinUsing1          as "usageInsulin1",
               vd.Insulin2               as "insulin2",
               vd.InsulinUsing2          as "usageInsulin2",
               vd.Remark                 as "remark",
               vd.Referral               as "referral",
               vd.ReferralReason         as "referralReason",
               vd.ReferralAgencies       as "referralAgencies",
               vd.NextVisitDate          as "nextVisitDate",
               vd.OperateOrganization    as "hospital",
               vd.OperateTime            as "updateAt",
               vd.Doctor                 as "doctor"
        from ph_diabetes_visit vd
               left join ph_dict vc_sex on vc_sex.category = '001' and vc_sex.code = vd.sex
               left join ph_dict vc_follow on vc_follow.category = '7010104' and vc_follow.code = vd.FollowUpWay
               left join ph_dict vc_mental on vc_mental.category = '331' and vc_mental.code = vd.MentalSet
               left join ph_dict vc_doctor_s on vc_doctor_s.category = '332' and vc_doctor_s.code = vd.DoctorStatue
               left join ph_dict vc_ma on vc_ma.category = '181' and vc_ma.code = vd.MedicationAdherence
               left join ph_dict vc_vc on vc_vc.category = '7010106' and vc_vc.code = vd.VisitClass
               left join ph_dict vc_arterial on vc_arterial.category = '7152' and vc_arterial.code = vd.arterial
               left join ph_dict vc_lb on vc_lb.category = '7020101' and vc_lb.code = vd.LowBlood
        where id = ?
          and vd.isdelete = false
      `,
      id
    );
    return result.map(r => ({
      ...r,
      mental: mentalCodeNames.find(m => m.code === r.mental)?.name
    }));
  }

  // endregion

  // region 体检

  /**
   * 获取体检表
   *
   * @param id 个人id
   * @return [{
   * id: 体检编号
   * checkDate: 检查时间
   * stature: 身高
   * weight: 体重
   * temperature: 体温
   * symptom: 症状
   * bc_abnormal: B超说明
   * updateAt: 更新时间
   * }]
   */
  async healthy(id) {
    // language=PostgreSQL
    return originalDB.execute(
      `
        select vh.id,
               vh.checkupdate as "checkDate",
               vh.stature     as "stature",
               vh.weight      as "weight",
               vh.temperature as "temperature",
               vh.symptom     as "symptom",
               vh.bc_abnormal as "bc_abnormal",
               vh.operatetime as "updateAt"
        from ph_healthy vh
        where vh.personnum = ?
          and vh.isdelete = false
        order by vh.checkupdate desc
      `,
      id
    );
  }

  /**
   * 获取体检表详情
   * gender: 性别
   * checkupNo: 体检编号
   * IDCard: 身份证
   * stature: 身高
   * weight: 体重
   * checkDate: 体验日期
   * checkupDoctor: 体检医生
   * temperature: 体温
   * symptom: 症状
   * bc_abnormal: B超说明
   * marrage: 婚姻状态
   * professionType: 职业种类
   * pulse:脉率
   * BMI: BMI
   * breathe:呼吸频率
   * leftDiastolicPressure: 左侧舒张压
   * leftSystolicPressure: 左侧收缩压
   * rightDiastolicPressure: 右侧舒张压
   * rightSystolicPressure: 右侧收缩压
   * waistline: 腰围
   * oldManHealthSelf: 老年人健康状态自我评估
   * oldManLifeSelf: 老年人生活自理能力自我评估
   * oldManCognitiveSelf: 老年人认知功能     //TODO: 没有对应字典code
   * cognitiveScore: 简易智力状态检查
   * oldManEmotion: 老年人情感状态           //TODO: 没有对应字典code
   * emotionalScore: 老年人抑郁评分检查
   * exerciseFrequency 锻炼评率
   * eachExerciseTime 每次锻炼时间
   * stickExerciseTime 坚持锻炼时间
   * exerciseWay 锻炼方式
   * eatingHabit 饮食习惯
   * smokingHistory 吸烟史
   * smokingAmount 吸烟量
   * smokingStartTime 开始吸烟时间
   * smokingStopTime 戒烟年龄
   * drinkFrequency 饮酒频率
   * drinkAmount 日饮酒量
   * drinkStartTime 开始饮酒时间
   * isDrinkStop 是否戒酒
   * drinkStopTime 开始戒酒时间
   * isDrunkThisYear 近一年内是否曾醉酒
   * wineKind 主要饮酒品种
   * professionExpose 职业暴露情况
   * profession 具体职业
   * workingTime 从业时间
   * dust 粉尘
   * dustProtection 粉尘防护措施
   * dustProtectionExplain 粉尘防护措施说明
   * physicalCause 物理原因
   * physicalProtection 物理原因防护措施
   * physicalProtectionExplain 物理原因防护措施说明
   * chemicals 化学物质
   * chemicalsProtection 化学物质防护措施
   * chemicalsProtectionExplain 化学物质防护措施说明
   * radiation 放射物质
   * radiationProtection 放射物质防护措施
   * radiationProtectionExplain 放射物质防护措施说明
   * other 其他（健康辅助检查）
   * otherProtection 其他防护措施
   * otherProtectionExplain 其他防护措施说明
   * lip 口唇
   * throat 咽部
   * tooth 齿列情况
   * missToothTopLeft 缺齿（上左）
   * missToothTopRight 缺齿（上右）
   * missToothBottomLeft 缺齿（下左）
   * missToothTopRight 缺齿（下右）
   * cariesTopLeft 龋齿（上左）
   * cariesTopRight 龋齿（上右）
   * cariesBottomLeft 龋齿（下左）
   * cariesBottomRight 龋齿（下右）
   * falseToothTopLeft 义齿（上左）
   * falseToothTopRight 义齿（上右）
   * falseToothBottomLeft 义齿（下左）
   * falseToothBottomRight 义齿（下右）
   * visionLeft 视力（左眼）
   * visionRight 视力（右眼）
   * visionCorrectionLeft 矫正视力（左眼）
   * visonCorrectionRight 矫正视力（右眼）
   * listen 听力
   * sport 运动功能
   * eyeGround: 眼底状态
   * eyeGroundExplain:眼底说明
   * skin 皮肤状态
   * skinExplain 皮肤说明
   * sclera 巩膜状态
   * scleraExplain: 巩膜说明
   * lymph: 淋巴结状态
   * lymphExplain: 淋巴结说明
   * barrelChest: 桶状胸
   * breathSound: 呼吸音状态
   * breathSoundExplain: 呼吸音说明
   * lungSound: 罗音状态
   * lungSoundExplain: 罗音说明
   * heartRate 心率
   * heartRule 心律
   * noise 杂音状态
   * noiseExplain 杂音说明
   * abdominalTenderness 腹部压痛状态
   * abdominalTendernessExplain 腹部压痛说明
   * abdominalBag 腹部包块状态
   * abdominalBagExplain 腹部包块说明
   * abdominalLiver 腹部肝大状态
   * abdominalLiverExplain 腹部肝大说明
   * abdominalSpleen 腹部脾大状态
   * abdominalSpleenExplain 腹部脾大说明
   * abdominalNoise 腹部移动性浊音状态
   * abdominalNoiseExplain 腹部移动性浊音说明
   * lowLimbsEdema 下肢水肿
   * anus 肛门指诊状态
   * arterial 足背动脉搏动
   * mammary 乳腺
   * vulva 外阴状态
   * vulvaExplain 外阴说明
   * vagina 阴道状态
   * vaginaExplain 阴道说明
   * cervical 宫颈状态
   * cervicalExplain 宫颈说明
   * uterus 宫体状态
   * uterusExplain 宫体说明
   * attach 附件状态
   * attachExplain 附件说明
   * vaginaOther 查体其他
   * hemoglobin 血红蛋白
   * whiteCell 白细胞
   * platelet 血小板
   * bloodOther 其他
   * urineProtein 尿蛋白
   * urineSugar 尿糖
   * urineKetone 尿酮体
   * urineBlood 尿潜血
   * urineOther 尿 其他
   * urineTraceAlbumin 尿微量白蛋白
   * urineWhiteCell 尿白细胞
   * defecateBlood 大便潜血
   * ecg 心电图状态
   * ecgExplain 心电图说明
   * HBsAg HBsAg
   * fastingGlucose 空腹血糖
   * 餐后血糖
   * sugarHemoglobin 糖化血红蛋白
   * liverALT 血清谷丙转氨酶
   * liverAST 血清谷草转氨酶
   * liverALB 白蛋白
   * liverTBIL 总胆红素
   * liverDBIL 结合胆红素
   * renalSCR 血清肌酐
   * renalBUM 血尿素氮
   * renalPotassium 血钾浓度
   * renalSodium 血钠浓度
   * 血尿酸
   * bloodCHO 总胆固醇
   * bloodTG 甘油三酯
   * bloodLDLC 血清低密度蛋白胆固醇
   * bloodHDLC 血清高密度蛋白胆固醇
   * chest 胸片状态
   * chestExplain 胸片说明
   * bc B态超状
   * bcExplain B超说明
   * cervicalSmear 宫颈涂片状态
   * cervicalSmearExplain 宫颈涂片说明
   * assistExam 其他(健康辅助检查)
   * cerebrovascular 脑血管疾病
   * renal 肾脏疾病
   * heart 心脏疾病
   * bloodVessels 血管疾病
   * eye 眼部疾病
   * nerve 神经系统疾病状态
   * nerveExplain 神经系统疾病说明
   * otherDisease 其他系统疾病状态
   * otherDiseaseExplain 其他系统疾病说明
   * inHospitalDate1 住院1住院时间
   * outHospitalDate1 住院1出院时间
   * inHospitalReason1 住院1原因
   * inHospitalName1 住院1医疗结构名称
   * inHospitalRecord1 住院1病案号
   * inHospitalDate2 住院2住院时间
   * outHospitalDate2 住院2出院时间
   * inHospitalReason2 住院2原因
   * inHospitalName2 住院2医疗结构名称
   * inHospitalRecord2 住院2病案号
   * familyInHospitalDate1 家族病床史1建床时间
   * familyOutHospitalDate1 家族病床史1撤床时间
   * familyInHospitalReason1 家族病床史1原因
   * familyHospitalName1 家族病床史1医疗机构名称
   * familyHospitalRecord1 家族病床史1病案号
   * familyInHospitalDate2 家族病床史2建床时间
   * familyOutHospitalDate2 家族病床史2撤床时间
   * familyInHospitalReason2 家族病床史2原因
   * familyHospitalName2 家族病床史2医疗机构名称
   * familyHospitalRecord2 家族病床史2病案号
   * drug1 药物1名称
   * drugUsage1 药物1用法
   * drugAmount1 药物1用量
   * drugDate1 药物1用药时间
   * drugAdherence1 药物1服药依从性
   * drug2 药物2名称
   * drugUsage2 药物2用法
   * drugAmount2 药物2用量
   * drugDate2 药物2用药时间
   * drugAdherence2 药物2服药依从性
   * drug3 药物3名称
   * drugUsage3 药物3用法
   * drugAmount3 药物3用量
   * drugDate3 药物3用药时间
   * drugAdherence3 药物3服药依从性
   * drug4 药物4名称
   * drugUsage4 药物4用法
   * drugAmount4 药物4用量
   * drugDate4 药物4用药时间
   * drugAdherence4 药物4服药依从性
   * drug5 药物5名称
   * drugUsage5 药物5用法
   * drugAmount5 药物5用量
   * drugDate5 药物5用药时间
   * drugAdherence5 药物5服药依从性
   * drug6 药物6名称
   * drugUsage6 药物6用法
   * drugAmount6 药物6用量
   * drugDate6 药物6用药时间
   * drugAdherence6 药物6服药依从性
   * vaccine1 疫苗1名称
   * vaccineDate1 疫苗1接种日期
   * vaccineHospital1 疫苗1接种机构
   * vaccine2 疫苗2名称
   * vaccineDate2 疫苗2接种日期
   * vaccineHospital2 疫苗2接种机构
   * vaccine3 疫苗3名称
   * vaccineDate3 疫苗3接种日期
   * vaccineHospital3 疫苗3接种机构
   * healthyState 健康评价状态
   * abnormal1 健康评价异常1
   * abnormal2 健康评价异常2
   * abnormal3 健康评价异常3
   * abnormal4 健康评价异常4
   * healthyGuide 健康指导
   * healthyRisk 危险因素控制
   * hospital 录入机构
   * updateAt: 更新时间
   * @param id 体检表id
   */
  async healthyDetail(id) {
    const [
      genderCode, //性别字典
      marrageCode, //婚姻字典
      jobTypeCode, //职业字典
      //exerciseFrequencyCode, //锻炼频率
      // oldManHealthSelfCode, //健康状态自我评估
      // oldManLifeSelfCode, //生活自理
      // eyeGroundCode, //眼底
      // skinCode, //皮肤
      // scleraCode, //巩膜状态
      // lymphCode, //淋巴结状态
      // barrelChestCode, //桶状胸
      // breathSoundCode, //呼吸音状态
      // lungSoundCode, //肺罗音状态
      // abdominalCode, //腹部状态
      // drinkFrequencyCode, //饮酒频率
      professionExposeCode, //职业暴露情况,是否防护措施 7468
      // arterialCode, //足背动脉搏动	tnbzbdmbd	7152
      // vaginaCode, //妇科Code	7465
      urineProteinCode, //尿蛋白	ncgndb	009
      urineSugarCode, //尿糖	ncgnt	362
      urineKetoneCode, //尿酮体	ncgntt	4010006
      urineBloodCode //尿潜血	ncgnqx	4010007
    ] = await Promise.all([
      dictionaryQuery('001'), //性别字典
      dictionaryQuery('558'), //婚姻字典
      dictionaryQuery('557'), //职业字典
      //dictionaryQuery('724'), //锻炼频率
      // dictionaryQuery('7470'), //健康状态自我评估
      // dictionaryQuery('7471'), //生活自理
      // dictionaryQuery('745'), //眼底
      // dictionaryQuery('715'), //皮肤
      // dictionaryQuery('7151'), //巩膜状态
      // dictionaryQuery('716'), //淋巴结状态
      // dictionaryQuery('743'), //桶状胸
      // dictionaryQuery('745'), //呼吸音状态
      // dictionaryQuery('717'), //肺罗音状态
      // dictionaryQuery('744'), //腹部状态
      // dictionaryQuery('729'), //饮酒频率
      dictionaryQuery('7468'), //职业暴露情况,是否防护措施
      // dictionaryQuery('7152'), //足背动脉搏动
      // dictionaryQuery('7465'), //妇科状态
      dictionaryQuery('009'), //尿蛋白
      dictionaryQuery('362'), //尿糖
      dictionaryQuery('4010006'), //尿酮体	ncgntt	4010006
      dictionaryQuery('4010007') //尿潜血	ncgnqx	4010007
    ]);
    // language=PostgreSQL
    const result = await originalDB.execute(
      `
        select vh.id,
               vh.name                   as "name",
               vh.checkupNo              as "checkupNo",
               vh.IDCardNo               as "IDCard",
               vh.sex                    as "gender",
               vh.stature                as "stature",
               vh.weight                 as "weight",
               vh.checkupDate            as "checkDate",
               vh.checkupDoctor          as "checkupDoctor",
               vh.temperature            as "temperature",
               vh.symptom                as "symptom",
               vh.bc_abnormal            as "bc_abnormal",
               vh.MarrageType            as "marrage",
               vh.JobType                as "professionType",
               vh.pulse                  as "pulse",
               vh.breathe                as "breathe",
               vh.xyzcszy                as "leftDiastolicPressure",
               vh.xyzcssy                as "leftSystolicPressure",
               vh.xyycszy                as "rightDiastolicPressure",
               vh.xyycssy                as "rightSystolicPressure",
               vh.waistline              as "waistline",
               vh.BMI                    as "BMI",
               vh.lnrjkzt                as "oldManHealthSelf",
               vh.lnrzlnl                as "oldManLifeSelf",
               vh.lnrrzgn                as "oldManCognitiveSelf",
               vh.CognitiveFunctionScore as "cognitiveScore",
               vh.lnrqgzt                as "oldManEmotion",
               vh.EmotionalStatusScore   as "emotionalScore",
               vh.dlpn                   as "exerciseFrequency",
               vh.mcdlTime               as "eachExerciseTime",
               vh.jcdlTime               as "stickExerciseTime",
               vh.dlfs                   as "exerciseWay",
               vh.ysxg                   as "eatingHabit",
               vh.isxy                   as "smokingHistory",
               vh.xyl                    as "smokingAmount",
               vh.ksxyTime               as "smokingStartTime",
               vh.jyTime                 as "smokingStopTime",
               vh.yjpn                   as "drinkFrequency",
               vh.yjl                    as "drinkAmount",
               vh.ksyjTime               as "drinkStartTime",
               vh.isjj                   as "isDrinkStop",
               vh.ksjjTime               as "drinkStopTime",
               vh.iszj                   as "isDrunkThisYear",
               vh.zyyjpz                 as "wineKind",
               vh.zyblqk                 as "professionExpose",
               vh.jtzy                   as "profession",
               vh.cysj                   as "workingTime",
               vh.fc                     as "dust",
               vh.fcfhcs                 as "dustProtection",
               vh.fcfhcs_other           as "dustProtectionExplain",
               vh.wlys                   as "physicalCause",
               vh.wlysfhcs               as "physicalProtection",
               vh.wlysfhcs_other         as "physicalProtectionExplain",
               vh.hxp                    as "chemicals",
               vh.hxpfhcs                as "chemicalsProtection",
               vh.hxpfhcs_other          as "chemicalsProtectionExplain",
               vh.sx                     as "radiation",
               vh.sxfhcs                 as "radiationProtection",
               vh.sxfhcs_other           as "radiationProtectionExplain",
               vh.qt                     as "other",
               vh.qtfhcs                 as "otherProtection",
               vh.qtfhcs_other           as "otherProtectionExplain",
               vh.kc                     as "lip",
               vh.yb                     as "throat",
               vh.cl                     as "tooth",
               vh.qc1                    as "missToothTopLeft",
               vh.qc2                    as "missToothTopRight",
               vh.qc3                    as "missToothBottomLeft",
               vh.qc4                    as "missToothTopRight",
               vh.yuc1                   as "cariesTopLeft",
               vh.yuc2                   as "cariesTopRight",
               vh.yuc3                   as "cariesBottomLeft",
               vh.yuc4                   as "cariesBottomRight",
               vh.jy1                    as "falseToothTopLeft",
               vh.jy2                    as "falseToothTopRight",
               vh.jy3                    as "falseToothBottomLeft",
               vh.jy4                    as "falseToothBottomRight",
               vh.slzy                   as "visionLeft",
               vh.slyy                   as "visionRight",
               vh.yzzy                   as "visionCorrectionLeft",
               vh.jzyy                   as "visonCorrectionRight",
               vh.listen                 as "listen",
               vh.ydgn                   as "sport",
               vh.yd                     as "eyeGround",
               vh.yd_abnormal            as "eyeGroundExplain",
               vh.pf                     as "skin",
               vh.pf_Other               as "skinExplain",
               vh.gm                     as "sclera",
               vh.gm_Other               as "scleraExplain",
               vh.lbj                    as "lymph",
               vh.lbjOther               as "lymphExplain",
               vh.ftzx                   as "barrelChest",
               vh.fhxy                   as "breathSound",
               vh.fhxyyc                 as "breathSoundExplain",
               vh.fly                    as "lungSound",
               vh.flyOther               as "lungSoundExplain",
               vh.xzxn                   as "heartRate",
               vh.xzxl                   as "heartRule",
               vh.xzzy                   as "noise",
               vh.xzzyOther              as "noiseExplain",
               vh.fbyt                   as "abdominalTenderness",
               vh.fbytOther              as "abdominalTendernessExplain",
               vh.fbbk                   as "abdominalBag",
               vh.fbbkOther              as "abdominalBagExplain",
               vh.fbgd                   as "abdominalLiver",
               vh.fbgdOther              as "abdominalLiverExplain",
               vh.fbpd                   as "abdominalSpleen",
               vh.fbpdOther              as "abdominalSpleenExplain",
               vh.fbydxzy                as "abdominalNoise",
               vh.fbydxzyOther           as "abdominalNoiseExplain",
               vh.xzsz                   as "lowLimbsEdema",
               vh.gmzz                   as "anus",
               vh.tnbzbdmbd              as "arterial",
               vh.rx                     as "mammary",
               vh.fk_wy                  as "vulva",
               vh.fk_wy_abnormal         as "vulvaExplain",
               vh.fk_yd                  as "vagina",
               vh.fk_yd_abnormal         as "vaginaExplain",
               vh.fk_gj                  as "cervical",
               vh.fk_gj_abnormal         as "cervicalExplain",
               vh.fk_gt                  as "uterus",
               vh.fk_gt_abnormal         as "uterusExplain",
               vh.fk_fj                  as "attach",
               vh.fk_fj_abnormal         as "attachExplain",
               vh.ctqt                   as "vaginaOther",
               vh.xcgHb                  as "hemoglobin",
               vh.xcgWBC                 as "whiteCell",
               vh.xcgPLT                 as "platelet",
               vh.xcgqt                  as "bloodOther",
               vh.ncgndb                 as "urineProtein",
               vh.ncgnt                  as "urineSugar",
               vh.ncgntt                 as "urineKetone",
               vh.ncgnqx                 as "urineBlood",
               vh.ncgOther               as "urineOther",
               vh.nwlbdb                 as "urineTraceAlbumin",
               vh.LEU                    as "urineWhiteCell",
               vh.dbqx                   as "defecateBlood",
               vh.xdt                    as "ecg",
               vh.xdt_abnormal           as "ecgExplain",
               vh.HBsAg                  as "HBsAg",
               vh.suijxt                 as "postprandialGlucose",
               vh.kfxt                   as "fastingGlucose",
               vh.tnbthxhdb              as "sugarHemoglobin",
               vh.ggnALT                 as "liverALT",
               vh.ggnAST                 as "liverAST",
               vh.ggnALB                 as "liverALB",
               vh.ggnTBIL                as "liverTBIL",
               vh.ggnDBIL                as "liverDBIL",
               vh.sgnScr                 as "renalSCR",
               vh.sgnBUN                 as "renalBUM",
               vh.sgnxjnd                as "renalPotassium",
               vh.sgnxnnd                as "renalSodium",
               vh.BUA                    as "BUA",
               vh.xzCHO                  as "bloodCHO",
               vh.xzTG                   as "bloodTG",
               vh.xzLDLC                 as "bloodLDLC",
               vh.xzHDLC                 as "bloodHDLC",
               vh.xp                     as "chest",
               vh.xp_abnormal            as "chestExplain",
               vh.bc                     as "bc",
               vh.bc_abnormal            as "bcExplain",
               vh.gjtp                   as "cervicalSmear",
               vh.gjtp_abnormal          as "cervicalSmearExplain",
               vh.jkfzjcqt               as "assistExam",
               vh.nxgjb                  as "cerebrovascular",
               vh.szjb                   as "renal",
               vh.xzjb                   as "heart",
               vh.xgjb                   as "bloodVessels",
               vh.ybjb                   as "eye",
               vh.sjxt                   as "nerve",
               vh.sjxt_other             as "nerveExplain",
               vh.qtxt                   as "otherDisease",
               vh.otherDisease1          as "otherDiseaseExplain",
               vh.ruyTime1               as "inHospitalDate1",
               vh.chuyTime1              as "outHospitalDate1",
               vh.zhuyReason1            as "inHospitalReason1",
               vh.hospName1              as "inHospitalName1",
               vh.bah1                   as "inHospitalRecord1",
               vh.ruyTime2               as "inHospitalDate2",
               vh.chuyTime2              as "outHospitalDate2",
               vh.HospName2              as "inHospitalName2",
               vh.bah2                   as "inHospitalRecord2",
               vh.jcTime1                as "familyInHospitalDate1",
               vh.ccTime1                as "familyOutHospitalDate1",
               vh.jcyy1                  as "familyInHospitalReason1",
               vh.jcyljgmc1              as "familyHospitalName1",
               vh.jcbah1                 as "familyHospitalRecord1",
               vh.jcTime2                as "familyInHospitalDate2",
               vh.ccTime2                as "familyOutHospitalDate2",
               vh.jcyy2                  as "familyInHospitalReason2",
               vh.jcyljgmc2              as "familyHospitalName2",
               vh.jcbah2                 as "familyHospitalRecord2",
               vh.yaowu1                 as "drug1",
               vh.yf1                    as "drugUsage1",
               vh.yl1                    as "drugAmount1",
               vh.yysj1                  as "drugDate1",
               vh.fyycx                  as "drugAdherence1",
               vh.yaowu2                 as "drug2",
               vh.yf2                    as "drugUsage2",
               vh.yl2                    as "drugAmount2",
               vh.yysj2                  as "drugDate2",
               vh.fyycx2                 as "drugAdherence2",
               vh.yaowu3                 as "drug3",
               vh.yf3                    as "drugUsage3",
               vh.yl3                    as "drugAmount3",
               vh.yysj3                  as "drugDate3",
               vh.fyycx3                 as "drugAdherence3",
               vh.yaowu4                 as "drug4",
               vh.yf4                    as "drugUsage4",
               vh.yl4                    as "drugAmount4",
               vh.yysj4                  as "drugDate4",
               vh.fyycx4                 as "drugAdherence4",
               vh.yaowu5                 as "drug5",
               vh.yf5                    as "drugUsage5",
               vh.yl5                    as "drugAmount5",
               vh.yysj5                  as "drugDate5",
               vh.fyycx5                 as "drugAdherence5",
               vh.yaowu6                 as "drug6",
               vh.yf6                    as "drugUsage6",
               vh.yl6                    as "drugAmount6",
               vh.yysj6                  as "drugDate6",
               vh.fyycx6                 as "drugAdherence6",
               vh.fmy_mc1                as "vaccine1",
               vh.fmy_jzrq1              as "vaccineDate1",
               vh.fmy_jzjg1              as "vaccineHospital1",
               vh.fmy_mc2                as "vaccine2",
               vh.fmy_jzrq2              as "vaccineDate2",
               vh.fmy_jzjg2              as "vaccineHospital2",
               vh.fmy_mc3                as "vaccine3",
               vh.fmy_jzrq3              as "vaccineDate3",
               vh.fmy_jzjg3              as "vaccineHospital3",
               vh.jkpjywyc               as "healthyState",
               vh.yichang1               as "abnormal1",
               vh.yichang2               as "abnormal2",
               vh.yichang3               as "abnormal3",
               vh.yichang4               as "abnormal4",
               vh.jkzd_dqsf              as "healthyGuide",
               vh.jkzd_wxyskz            as "healthyRisk",
               area.name                 as "hospital",
               vh.operatetime            as "updateAt"
        from ph_healthy vh
               left join area on area.code = vh.OperateOrganization
        where vh.id = ?
          and vh.isdelete = false
        order by vh.operatetime desc
      `,
      id
    );
    return result.map(item => ({
      ...item,
      checkDate: dayjs(item.checkDate).toDate(),
      gender: genderCode.find(it => it.code === item.gender)?.name ?? '',
      marrage: marrageCode.find(it => it.code === item.marrage)?.name ?? '',
      professionType:
        jobTypeCode.find(it => `0${it.code}` === item.professionType)?.name ??
        '',
      // oldManHealthSelf:
      //   oldManHealthSelfCode.find(it => it.code === item.professionType)
      //     ?.name || '',
      // oldManLifeSelf:
      //   oldManLifeSelfCode.find(it => it.code === item.oldManLifeSelf)
      //     ?.name || '',
      // eyeGround:
      //   eyeGroundCode.find(it => it.code === item.eyeGround)?.name || '',
      // skin: skinCode.find(it => it.code === item.skin)?.name || '',
      // sclera: scleraCode.find(it => it.code === item.sclera)?.name || '',
      // lymph: lymphCode.find(it => it.code === item.lymph)?.name || '',
      // barrelChest:
      //   barrelChestCode.find(it => it.code === item.barrelChest)?.name ||
      //   '',
      // breathSound:
      //   breathSoundCode.find(it => it.code === item.breathSound)?.name ||
      //   '',
      // lungSound:
      //   lungSoundCode.find(it => it.code === item.lungSound)?.name || '',
      // exerciseFrequency:
      //   exerciseFrequencyCode.find(it => it.code === item.exerciseFrequency)
      //     ?.name || '',
      // drinkFrequency:
      //   drinkFrequencyCode.find(it => it.code === item.drinkFrequency)
      //     ?.name || '',
      // professionExpose:
      //   professionExposeCode.find(it => it.code === item.professionExpose)
      //     ?.name || '',
      dustProtection:
        professionExposeCode.find(it => it.code === item.dustProtection)
          ?.name ?? '',
      physicalProtection:
        professionExposeCode.find(it => it.code === item.physicalProtection)
          ?.name ?? '',
      chemicalsProtection:
        professionExposeCode.find(it => it.code === item.physicalProtection)
          ?.name ?? '',
      radiationProtection:
        professionExposeCode.find(it => it.code === item.physicalProtection)
          ?.name ?? '',
      otherProtection:
        professionExposeCode.find(it => it.code === item.otherProtection)
          ?.name ?? '',
      // abdominalBag:
      //   abdominalCode.find(it => it.code === item.abdominalBag)?.name || '',
      // abdominalLiver:
      //   abdominalCode.find(it => it.code === item.abdominalLiver)?.name ||
      //   '',
      // abdominalSpleen:
      //   abdominalCode.find(it => it.code === item.abdominalSpleen)?.name ||
      //   '',
      // abdominalNoise:
      //   abdominalCode.find(it => it.code === item.abdominalNoise)?.name ||
      //   '',
      // arterial:
      //   arterialCode.find(it => it.code === item.arterial)?.name || '',
      // vulva: vaginaCode.find(it => it.code === item.vulva)?.name || '',
      // vagina: vaginaCode.find(it => it.code === item.vagina)?.name || '',
      // cervical:
      //   vaginaCode.find(it => it.code === item.cervical)?.name || '',
      // uterus: vaginaCode.find(it => it.code === item.uterus)?.name || '',
      // attach: vaginaCode.find(it => it.code === item.attach)?.name || '',
      urineProtein:
        urineProteinCode.find(it => it.code === item.urineProtein)?.name ?? '',
      urineSugar:
        urineSugarCode.find(it => it.code === item.urineSugar)?.name ?? '',
      urineKetone:
        urineKetoneCode.find(it => it.code === item.urineKetone)?.name ?? '',
      urineBlood:
        urineBloodCode.find(it => it.code === item.urineBlood)?.name ?? ''
    }));
  }

  // endregion

  // region 妇幼

  /**
   * 获取新生儿访视记录及儿童检查记录列表
   * @param id
   * @returns {Promise<[{name: string, type: string, records: []}, {name: string, type: string, records: []}]>}
   */
  async childrenHealthCheck(id) {
    // 通过居民id查找到身份证号,这里的id是其母亲的id，因为国卫的数据库中新生儿没有记录身份证号
    // language=PostgreSQL
    const idCardNo = (
      await originalDB.execute(
        `
          select idcardno
          from ph_person
          where id = ?
        `,
        id
      )
    )[0]?.idcardno;
    if (!idCardNo) throw new KatoRuntimeError(`id为 ${id} 的居民不存在`);

    // 通过身份证号查找产后访视记录表，拿到产后访视code（visitCode）
    // language=PostgreSQL
    const maternalVisits = await originalDB.execute(
      `
        select id
        from mch_maternal_visit
        where maternalidcardno = ?
        order by visitdate
      `,
      idCardNo
    );

    // 通过产后访视code关联查询新生儿家庭访视记录表(V_NewbornVisit_KN)
    // language=PostgreSQL
    let newbornVisits = [];
    for (const i of maternalVisits) {
      const newbornVisit = await originalDB.execute(
        `
          select id as visitno,
                 newbornchildno,
                 mothervisitno,
                 newbornname,
                 newbornbirthday,
                 feedingpatterns,
                 temperaturedegrees,
                 jaundice,
                 doorbrine,
                 eyes,
                 eyesinfection,
                 limbs,
                 ear,
                 earinfection,
                 nose,
                 noseinfection,
                 skin,
                 oral,
                 hip,
                 cardiopulmonary,
                 umbilicalcord,
                 treatmentviews,
                 visitdate,
                 doctor,
                 operatetime,
                 operatorid,
                 operateorganization,
                 created_at,
                 updated_at
          from mch_new_born_visit
          where mothervisitno = ?
          order by visitdate
        `,
        i.id
      );
      if (newbornVisit.length > 0) newbornVisits.push(newbornVisit);
    }
    // 二维数组降一维数组
    newbornVisits = newbornVisits.flat();

    // 0~6岁儿童体检表
    // 儿童保健手册 -> 儿童保健卡主键
    // 通过母亲身份证号(MotherIdCardNo)查询儿童保健手册表(V_ChildHealthBooks_KN)拿到儿童保健卡主键
    // language=PostgreSQL
    const childHealthBooksNo = (
      await originalDB.execute(
        'select id from mch_child_health_books where motheridcardno = ? order by constructionlistdate',
        idCardNo
      )
    ).map(it => it.id);
    const childChecks = [];
    for (const childHealthBookNo of childHealthBooksNo) {
      // 儿童保健卡主键 -> 儿童体检表
      const childCheck = await originalDB.execute(
        // language=PostgreSQL
        `
          select cc.id as medicalcode,
                 cc.childhealthbooksno,
                 cc.chronologicalage,
                 cc.checkdate,
                 cc.weight,
                 cc.weightage,
                 cc.height,
                 cc.heightage,
                 cc.headcircumference,
                 cc.face,
                 cc.skin,
                 cc.fontanelle,
                 cc.backfontanelle,
                 cc.eyes,
                 cc.ear,
                 cc.lefthearing,
                 cc.righthearing,
                 cc.oral,
                 cc.ricketsseems,
                 cc.genitaliainfo,
                 cc.genitalia,
                 cc.hemoglobin,
                 cc.fewteeth,
                 cc.signsrickets,
                 cc.outdoortime,
                 cc.guidancetreatment,
                 cc.reservationsdate,
                 cc.checkdoctor,
                 cc.doctor,
                 cc.operatetime,
                 cc.operatorid,
                 cc.operateorganization,
                 cc.created_at,
                 cc.updated_at,
                 cb.name  childname,
                 cb.birth birthday
          from mch_child_check cc
                 inner join mch_child_health_books cb on cc.childhealthbooksno = cb.id
          where cc.childhealthbooksno = ?
          order by checkdate
        `,
        childHealthBookNo
      );
      if (childCheck.length > 0) childChecks.push(childCheck);
    }
    // 如果 新生儿家庭访视记录表 和 0-6岁儿童体检表 都为空, 返回空字符串
    if (newbornVisits.length === 0 && childChecks.length === 0) return [];
    return [
      {
        name: '新生儿家庭访视记录表',
        type: 'newbornVisit',
        records: newbornVisits
      },
      {
        name: '0-6岁儿童体检表',
        type: 'childCheck',
        records: childChecks
      }
    ];
  }

  /**
   * 新生儿家庭访视记录表详情
   * @param code
   * @returns {Promise<any>}
   */
  async newbornVisitDetail(code) {
    // language=PostgreSQL
    const result = await originalDB.execute(
      `
        select id as visitno,
               newbornchildno,
               mothervisitno,
               newbornname,
               newbornbirthday,
               feedingpatterns,
               temperaturedegrees,
               jaundice,
               doorbrine,
               eyes,
               eyesinfection,
               limbs,
               ear,
               earinfection,
               nose,
               noseinfection,
               skin,
               oral,
               hip,
               cardiopulmonary,
               umbilicalcord,
               treatmentviews,
               visitdate,
               doctor,
               operatetime,
               operatorid,
               operateorganization,
               created_at,
               updated_at
        from mch_new_born_visit
        where id = ?
        order by visitdate
      `,
      code
    );
    return result[0];
  }

  /**
   * 儿童健康检查记录表详情
   * @param code
   * @returns {Promise<any>}
   */
  async childCheckDetail(code) {
    // language=PostgreSQL
    const result = await originalDB.execute(
      `
        select cc.id as medicalcode,
               cc.childhealthbooksno,
               cc.chronologicalage,
               cc.checkdate,
               cc.weight,
               cc.weightage,
               cc.height,
               cc.heightage,
               cc.headcircumference,
               cc.face,
               cc.skin,
               cc.fontanelle,
               cc.backfontanelle,
               cc.eyes,
               cc.ear,
               cc.lefthearing,
               cc.righthearing,
               cc.oral,
               cc.ricketsseems,
               cc.genitaliainfo,
               cc.genitalia,
               cc.hemoglobin,
               cc.fewteeth,
               cc.signsrickets,
               cc.outdoortime,
               cc.guidancetreatment,
               cc.reservationsdate,
               cc.checkdoctor,
               cc.doctor,
               cc.operatetime,
               cc.operatorid,
               cc.operateorganization,
               cc.created_at,
               cc.updated_at,
               cb.name  childname
        from mch_child_check cc
               inner join mch_child_health_books cb on cc.childhealthbooksno = cb.id
        where cc.id = ?
        order by cc.checkdate
      `,
      code
    );
    return result[0];
  }

  /**
   * 儿童生长发育监测数据(0-6岁)
   * @param childHealthBookNo
   * @returns {Promise<any[]>}
   */
  async developmentMonitoring(childHealthBookNo) {
    // 儿童保健卡主键 -> 儿童体检表
    const childCheck = await originalDB.execute(
      // language=PostgreSQL
      `
        select cc.id   as medicalcode,
               cc.chronologicalage,
               cc.weight,
               cc.height,
               cb.name as childname
        from mch_child_check cc
               inner join mch_child_health_books cb on cc.childhealthbooksno = cb.id
        where cc.childhealthbooksno = ?
        order by cc.checkdate
      `,
      childHealthBookNo
    );
    return childCheck;
  }

  /**
   *获取孕产妇健康检查表数据
   * @param id 个人id
   * newlyDiagnosed 第一次产前检查信息表
   * prenatalCare 第2~5次产前随访服务信息表
   * maternalVisits 产后访视记录表
   * examine42thDay 产后42天健康检查记录表
   */
  async maternalHealthCheck(id) {
    // 通过居民id查找到身份证号
    const idCardNo = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select idcardno
          from ph_person
          where id = ?
        `,
        id
      )
    )[0]?.idcardno;

    if (!idCardNo) throw new KatoRuntimeError(`id为 ${id} 的居民不存在`);

    // 母子健康手册表
    // 通过身份证号（idCardNo）查询
    // language=PostgreSQL
    const pregnancyBooks = await originalDB.execute(
      `
        select PregnancyBooksId as id
        from mch_newly_diagnosed a
               inner join mch_pregnancy_books b on b.id = a.PregnancyBooksId and b.IdCardNo = ?
        where a.PregnancyBooksId is not null
        union
        select PregnancyBooksId as id
        from mch_prenatal_care a
               inner join mch_pregnancy_books b on b.id = a.PregnancyBooksId and b.IdCardNo = ?
        where a.PregnancyBooksId is not null
        union
        select COALESCE(v.PregnancyBooksId, r.PregnancyBooksId) as id
        from mch_maternal_visit v
               left join mch_delivery_record r on r.id = v.maternitycode
        where v.MaternalIdCardNo = ?
          and (v.PregnancyBooksId is not null or r.PregnancyBooksId is not null)
        union
        select COALESCE(v.PregnancyBooksId, r.PregnancyBooksId) as id
        from mch_examine_42th_day v
               left join mch_delivery_record r on r.id = v.maternitycode
        where idCard = ?
          and (v.PregnancyBooksId is not null or r.PregnancyBooksId is not null)
      `,
      idCardNo,
      idCardNo,
      idCardNo,
      idCardNo
    );
    const result = [];
    for (const pregnancyBook of pregnancyBooks) {
      const maternalData = [];

      // 通过母子健康手册表中的主键（id）查询以下表

      // 第一次产前检查信息表
      // language=PostgreSQL
      const newlyDiagnosedRecords = await originalDB.execute(
        `
          select id               as newlydiagnosedcode,
                 pregnancybooksid as pre_newlydiagnosedcode,
                 name,
                 newlydiagnoseddate,
                 gestationalweeks,
                 gestationalageday,
                 age,
                 parity,
                 productionmeeting,
                 vaginaldelivery,
                 cesareansection,
                 lastmenstrual,
                 birth,
                 pasthistory,
                 familyhistory,
                 womansurgeryhistory,
                 spontaneousabortiontimes,
                 abortiontimes,
                 stillfetaltimes,
                 stillbirthtimes,
                 height,
                 weight,
                 bodymassindex,
                 systolicpressure,
                 assertpressure,
                 heart,
                 lung,
                 deputymilkgenital,
                 vagina,
                 cervical,
                 attachment,
                 hemoglobin,
                 interleukin,
                 plateletcount,
                 urinaryprotein,
                 urine,
                 ketone,
                 urineoccultblood,
                 bloodtype,
                 sgpt_fastingplasmaglucose,
                 sgpt_alt,
                 sgpt_ast,
                 sgpt_alb,
                 sgpt_tbili,
                 intoxicated,
                 urea,
                 vaginasecrete,
                 hbsagin,
                 hbsab,
                 hbeag,
                 kanghbe,
                 kanghbc,
                 rprscreen,
                 hivscreening,
                 bultrasonography,
                 nextcaredate,
                 doctor,
                 operatetime,
                 operatorid,
                 operateorganization,
                 created_at,
                 updated_at
          from mch_newly_diagnosed
          where pregnancybooksid = ?
            and isdelete = false
          order by newlydiagnoseddate
        `,
        pregnancyBook.id
      );
      const newlyDiagnosed = {
        name: '第一次产前检查信息表',
        type: 'newlyDiagnosed',
        records: newlyDiagnosedRecords
      };
      maternalData.push(newlyDiagnosed);

      // 第2~5次产前随访服务信息表
      const prenatalCareRecords = await originalDB.execute(
        // language=PostgreSQL
        `
          select card.id               as prenatalcarecode,
                 card.pregnancybooksid as newlydiagnosedcode,
                 card.checkdate,
                 card.gestationalagemonth,
                 ''                    as diseasehistory,
                 card.chiefcomplaint,
                 card.weight,
                 card.uterinehigh,
                 card.abdominalcircumference,
                 card.fetalposition,
                 card.fetalheartrate,
                 card.assertpressure,
                 card.systolicpressure,
                 card.hemoglobin,
                 card.urinaryprotein,
                 card.guide,
                 card.nextappointmentdate,
                 card.doctor,
                 card.operatetime,
                 card.operatorid,
                 card.operateorganization,
                 card.created_at,
                 card.updated_at
          from mch_prenatal_care card
          where card.pregnancybooksid = ?
            and card.isdelete = false
          order by card.checkdate
        `,
        pregnancyBook.id
      );
      const prenatalCare = {
        name: '第2~5次产前随访服务信息表',
        type: 'prenatalCare',
        records: prenatalCareRecords
      };
      maternalData.push(prenatalCare);
      // 产后访视记录表
      // 按孕册表匹配
      const pregnancyBookVisitRecords = await originalDB.execute(
        // language=PostgreSQL
        `
          select id               as visitcode,
                 pregnancybooksid as newlydiagnosedcode,
                 maternitycode,
                 maternalname,
                 maternalidcardno,
                 visitdate,
                 temperaturedegrees,
                 diastolicpressure,
                 systolicpressure,
                 breast,
                 lochiatype,
                 lochiavolume,
                 perinealincision,
                 doctor,
                 operatetime,
                 operatorid,
                 operateorganization,
                 created_at,
                 updated_at
          from mch_maternal_visit
          where pregnancybooksid = ?
            and isdelete = false
          order by visitdate
        `,
        pregnancyBook.id
      );
      const maternalVisitRecords = await originalDB.execute(
        // language=PostgreSQL
        `
          select v.id               as visitcode,
                 v.pregnancybooksid as newlydiagnosedcode,
                 v.maternitycode,
                 v.maternalname,
                 v.maternalidcardno,
                 v.visitdate,
                 v.temperaturedegrees,
                 v.diastolicpressure,
                 v.systolicpressure,
                 v.breast,
                 v.lochiatype,
                 v.lochiavolume,
                 v.perinealincision,
                 v.doctor,
                 v.operatetime,
                 v.operatorid,
                 v.operateorganization,
                 v.created_at,
                 v.updated_at
          from mch_maternal_visit v
                 inner join mch_delivery_record v1
                            on v1.pregnancybooksid = ? and v1.isdelete = false and v1.id = v.maternitycode
          where v.pregnancybooksid is null
            and v.maternitycode is not null
            and v.isdelete = false
          order by v.visitdate
        `,
        pregnancyBook.id
      );
      const maternalVisits = {
        name: '产后访视记录表',
        type: 'maternalVisits',
        records: pregnancyBookVisitRecords.concat(maternalVisitRecords)
      };
      maternalData.push(maternalVisits);

      // 产后42天健康检查记录表
      // 按孕册表匹配
      const bookExamine42thDayRecords = await originalDB.execute(
        // language=PostgreSQL
        `
          select id               as examineno,
                 pregnancybooksid as newlydiagnosedcode,
                 pregnantwomenname,
                 visitdate,
                 diastolicpressure,
                 systolicpressure,
                 breast,
                 lochia,
                 lochiacolor,
                 lochiasmell,
                 perinealincision,
                 other,
                 doctor,
                 operatetime,
                 operatorid,
                 operateorganization,
                 created_at,
                 updated_at
          from mch_examine_42th_day
          where pregnancybooksid = ?
            and isdelete = false
          order by visitdate
        `,
        pregnancyBook.id
      );
      const maternalExamine42thDayRecords = await originalDB.execute(
        // language=PostgreSQL
        `
          select a.id               as examineno,
                 a.pregnancybooksid as newlydiagnosedcode,
                 a.pregnantwomenname,
                 a.visitdate,
                 a.diastolicpressure,
                 a.systolicpressure,
                 a.breast,
                 a.lochia,
                 a.lochiacolor,
                 a.lochiasmell,
                 a.perinealincision,
                 a.other,
                 a.doctor,
                 a.operatetime,
                 a.operatorid,
                 a.operateorganization,
                 a.created_at,
                 a.updated_at
          from mch_examine_42th_day a
                 inner join mch_delivery_record b
                            on b.pregnancybooksid = ? and b.isdelete = false and a.maternitycode = b.id
          where a.pregnancybooksid is null
            and a.maternitycode is not null
            and a.isdelete = false
          order by a.visitdate`,
        pregnancyBook.id
      );
      const examine42thDay = {
        name: '产后42天健康检查记录表',
        type: 'examine42thDay',
        records: bookExamine42thDayRecords.concat(maternalExamine42thDayRecords)
      };
      maternalData.push(examine42thDay);

      result.push(maternalData);
    }
    //有对应的产后记录
    const deliveryList = await originalDB.execute(
      //language=PostgreSQL
      `
        select distinct a.MaternityCode as id
        from mch_maternal_visit a
               inner join mch_examine_42th_day d on a.MaternityCode = d.MaternityCode and d.isdelete = false
               left join mch_delivery_record r on r.id = d.MaternityCode
        where a.MaternalIdCardNo = ?
          and a.MaternityCode is not null
          and a.isdelete = false
          and r.PregnancyBooksId is null
          and r.isdelete = false
      `,
      idCardNo
    );
    //单独的产后访视记录
    const deliveryList1 = await originalDB.execute(
      // language=PostgreSQL
      `
        select distinct a.MaternityCode as id
        from mch_maternal_visit a
               left join mch_examine_42th_day d on a.MaternityCode = d.MaternityCode
               left join mch_delivery_record r on r.id = a.MaternityCode
        where a.MaternalIdCardNo = ?
          and d.MaternityCode is null
          and d.isdelete = false
          and a.MaternityCode is not null
          and a.isdelete = false
          and r.PregnancyBooksId is null
          and r.isdelete = false
      `,
      idCardNo
    );
    //单独的产后42天记录
    const deliveryList2 = await originalDB.execute(
      // language=PostgreSQL
      `
        select distinct a.MaternityCode as id
        from mch_examine_42th_day a
               left join mch_maternal_visit d on a.MaternityCode = d.MaternityCode
               left join mch_delivery_record r on r.id = a.MaternityCode
        where a.idCard = ?
          and d.MaternityCode is null
          and a.MaternityCode is not null
          and r.PregnancyBooksId is null
          and a.isdelete = false
          and d.isdelete = false
          and r.isdelete = false
      `,
      idCardNo
    );
    for (const delivery of [
      ...deliveryList,
      ...deliveryList1,
      ...deliveryList2
    ]) {
      const deliveryData = [
        {
          name: '第一次产前检查信息表',
          type: 'newlyDiagnosed',
          records: []
        },
        {
          name: '第2~5次产前随访服务信息表',
          type: 'prenatalCare',
          records: []
        }
      ];
      const maternalVisitRecords = await originalDB.execute(
        // language=PostgreSQL
        `
          select id               as visitcode,
                 pregnancybooksid as newlydiagnosedcode,
                 maternitycode,
                 maternalname,
                 maternalidcardno,
                 visitdate,
                 temperaturedegrees,
                 diastolicpressure,
                 systolicpressure,
                 breast,
                 lochiatype,
                 lochiavolume,
                 perinealincision,
                 doctor,
                 operatetime,
                 operatorid,
                 operateorganization,
                 created_at,
                 updated_at
          from mch_maternal_visit
          where maternitycode = ?
            and isdelete = false
          order by visitdate
        `,
        delivery.id
      );
      const maternalVisits = {
        name: '产后访视记录表',
        type: 'maternalVisits',
        records: maternalVisitRecords
      };
      maternalVisits.name = '产后访视记录表';
      maternalVisits.type = 'maternalVisits';
      maternalVisits.records = maternalVisitRecords;
      deliveryData.push(maternalVisits);
      const maternalExamine42thDayRecords = await originalDB.execute(
        // language=PostgreSQL
        `
          select id               as examineno,
                 pregnancybooksid as newlydiagnosedcode,
                 pregnantwomenname,
                 visitdate,
                 diastolicpressure,
                 systolicpressure,
                 breast,
                 lochia,
                 lochiacolor,
                 lochiasmell,
                 perinealincision,
                 other,
                 doctor,
                 operatetime,
                 operatorid,
                 operateorganization,
                 created_at,
                 updated_at
          from mch_examine_42th_day
          where maternitycode = ?
            and isdelete = false
          order by visitdate
        `,
        delivery.id
      );
      const examine42thDay = {
        name: '产后42天健康检查记录表',
        type: 'examine42thDay',
        records: maternalExamine42thDayRecords
      };
      deliveryData.push(examine42thDay);

      result.push(deliveryData);
    }
    //无孕册 无分娩的产后访视记录
    const maternalVisitRecords = await originalDB.execute(
      // language=PostgreSQL
      `
        select id               as visitcode,
               pregnancybooksid as newlydiagnosedcode,
               maternitycode,
               maternalname,
               maternalidcardno,
               visitdate,
               temperaturedegrees,
               diastolicpressure,
               systolicpressure,
               breast,
               lochiatype,
               lochiavolume,
               perinealincision,
               doctor,
               operatetime,
               operatorid,
               operateorganization,
               created_at,
               updated_at
        from mch_maternal_visit
        where maternalidcardno = ?
          and pregnancybooksid is null
          and maternitycode is null
          and isdelete = false
        order by visitdate
      `,
      idCardNo
    );
    if (maternalVisitRecords.length > 0) {
      result.push([
        {
          name: '第一次产前检查信息表',
          type: 'newlyDiagnosed',
          records: []
        },
        {
          name: '第2~5次产前随访服务信息表',
          type: 'prenatalCare',
          records: []
        },
        {
          name: '产后访视记录表',
          type: 'maternalVisits',
          records: maternalVisitRecords
        },
        {
          name: '产后42天健康检查记录表',
          type: 'examine42thDay',
          records: []
        }
      ]);
    }
    //无孕册 无分娩的42天记录
    const maternalExamine42thDayRecords = await originalDB.execute(
      // language=PostgreSQL
      `
        select id               as examineno,
               pregnancybooksid as newlydiagnosedcode,
               pregnantwomenname,
               visitdate,
               diastolicpressure,
               systolicpressure,
               breast,
               lochia,
               lochiacolor,
               lochiasmell,
               perinealincision,
               other,
               doctor,
               operatetime,
               operatorid,
               operateorganization,
               created_at,
               updated_at
        from mch_examine_42th_day
        where idcard = ?
          and pregnancybooksid is null
          and maternitycode is null
          and isdelete = false
        order by visitdate
      `,
      idCardNo
    );
    if (maternalExamine42thDayRecords.length > 0) {
      result.push([
        {
          name: '第一次产前检查信息表',
          type: 'newlyDiagnosed',
          records: []
        },
        {
          name: '第2~5次产前随访服务信息表',
          type: 'prenatalCare',
          records: []
        },
        {
          name: '产后访视记录表',
          type: 'maternalVisits',
          records: []
        },
        {
          name: '产后42天健康检查记录表',
          type: 'examine42thDay',
          records: maternalExamine42thDayRecords
        }
      ]);
    }
    return result;
  }

  /**
   * 第 1 次产前检查服务记录表详情
   * @param code 主键id
   *
   * @return {
   *   fathername: 丈夫姓名,
   *   fatherage: 丈夫年龄
   *   id: 主键
   *   pregnancybooksid: 编号
   *   name: 姓名
   *   newlydiagnoseddate: 填表日期
   *   gestationalweeks: 孕周 - 周
   *   gestationalageday: 孕周 - 天
   *   age: 孕妇年龄
   *   丈夫电话暂无,
   *   parity: 孕次,
   *   productionmeeting: 产次,
   *   vaginaldelivery: 产次 - 阴道分娩次数,
   *   cesareansection: 产次 - 剖宫产次数,
   *   lastmenstrual: 末次月经,
   *   birth: 预产期,
   *   pasthistory: 既往史,
   *   familyhistory: 家族史,
   *   暂无字段: 个人史,
   *   womansurgeryhistory: 妇科手术史,
   *   暂无字段: 妇产史,
   *   spontaneousabortiontimes: 孕产史 - 自然流产次数,
   *   abortiontimes: 孕产史 - 人工流产次数,
   *   stillfetaltimes: 孕产史 - 死胎次数,
   *   stillbirthtimes: 孕产史 - 死产次数,
   *   newborndeadtimes: 孕产史 - 新生儿死亡,
   *   height: 身高,
   *   weight: 体重,
   *   bodymassindex: 体质指数(BMI),
   *   systolicpressure: 血压 - 舒张压,
   *   assertpressure: 血压 - 收缩压,
   *   heart: 听诊 - 心脏,
   *   lung: 听诊 - 肺,
   *   deputymilkgenital: 妇科检查 - 外阴,
   *   vagina: 妇科检查 - 阴道,
   *   cervical: 妇科检查 - 宫颈,
   *   uterinesize: '子宫大小',
   *   uterinehigh: '宫高',
   *   attachment: '妇科检查 - 附件',
   *   hemoglobin: '辅助检查 - 血常规 - 血红蛋白值',
   *   interleukin: '辅助检查 - 血常规 - 白细胞计数值',
   *   plateletcount: '辅助检查 - 血常规 - 血小板计数值',
   *   urinaryprotein: '辅助检查 - 尿常规 - 尿蛋白. 编码表009',
   *   urine: '辅助检查 - 尿常规 - 尿糖. 编码表362',
   *   ketone: '辅助检查 - 尿常规 - 尿酮体',
   *   urineoccultblood: '辅助检查 - 尿常规 - 尿潜血',
   *   bloodtype: '辅助检查 - 血型 - ABO. 编码表004',
   *   sgpt_fastingplasmaglucose: '辅助检查 - 空腹血糖',
   *   fullhypoglycemia: '辅助检查 - 餐后血糖',
   *   sgpt_alt: '辅助检查 - 肝功能 - 血清谷丙转氨酶',
   *   sgpt_ast: '辅助检查 - 肝功能 - 血清谷草转氨酶',
   *   sgpt_alb: '辅助检查 - 肝功能 - 白蛋白',
   *   sgpt_tbili: '辅助检查 - 肝功能 - 总胆红素',
   *   sgpt_dbili: '辅助检查 - 肝功能 - 结合胆红素',
   *   intoxicated: '辅助检查 - 肾功能 - 血清肌酐',
   *   urea: '辅助检查 - 肾功能 - 血尿素',
   *   vaginasecrete: '辅助检查 - 阴道分泌物 + 阴道清洁度. 编码表4010008',
   *   hbsagin: '辅助检查 - 乙型肝炎 - 乙型肝炎表面抗原. 编码表262',
   *   hbsab: '辅助检查 - 乙型肝炎 - 乙型肝炎表面抗体. 编码表262',
   *   hbeag: '辅助检查 - 乙型肝炎 - 乙型肝炎e抗原. 编码表262',
   *   kanghbe: '辅助检查 - 乙型肝炎 - 乙型肝炎e抗体. 编码表262',
   *   kanghbc: '辅助检查 - 乙型肝炎 - 乙型肝炎核心抗体. 编码表262',
   *   rprscreen: '辅助检查 - 梅毒血清试验. 编码表364',
   *   hivscreening: '辅助检查 - HIV抗体检测',
   *   bultrasonography: '辅助检查 - B超',
   *   classification: '总体评估',
   *   treatment: '保健指导',
   *   referral: '是否转诊',
   *   referralreason: '转诊原因',
   *   referralorg: '转诊机构及科室',
   *   nextcaredate: '下次随访日期',
   *   doctor: '医生姓名',
   *   operateorganization: '操作机构',
   *   operatorid: '操作账号',
   *   operatetime: '操作时间',
   *   updateoperatorid: '更新账号',
   *   updatetime: '更新时间',
   *   isdelete: '是否删除',
   *   deleteoperatorid: '删除账号',
   *   deletetime: '删除时间'
   * }
   */
  async firstPrenatalCheck(code) {
    // 第一次产前检查信息表
    // language=PostgreSQL
    const newlyDiagnosed = await originalDB.execute(
      `
        select b.fathername,
               b.fatherage,
               n.id,
               n.pregnancybooksid,
               n.name,
               n.newlydiagnoseddate,
               n.gestationalweeks,
               n.gestationalageday,
               n.age,
               n.parity,
               n.productionmeeting,
               n.vaginaldelivery,
               n.cesareansection,
               n.lastmenstrual,
               n.birth,
               n.pasthistory,
               n.familyhistory,
               n.womansurgeryhistory,
               n.spontaneousabortiontimes,
               n.abortiontimes,
               n.stillfetaltimes,
               n.stillbirthtimes,
               n.newborndeadtimes,
               n.height,
               n.weight,
               n.bodymassindex,
               n.systolicpressure,
               n.assertpressure,
               n.heart,
               n.lung,
               n.deputymilkgenital,
               n.vagina,
               n.cervical,
               n.uterinesize,
               n.uterinehigh,
               n.attachment,
               n.hemoglobin,
               n.interleukin,
               n.plateletcount,
               n.urinaryprotein,
               n.urine,
               n.ketone,
               n.urineoccultblood,
               (select name from mch_dict where code = n.bloodtype and category = '004') bloodtype,
               n.sgpt_fastingplasmaglucose,
               n.fullhypoglycemia,
               n.sgpt_alt,
               n.sgpt_ast,
               n.sgpt_alb,
               n.sgpt_tbili,
               n.sgpt_dbili,
               n.intoxicated,
               n.urea,
               n.vaginasecrete,
               n.hbsagin,
               n.hbsab,
               n.hbeag,
               n.kanghbe,
               n.kanghbc,
               n.rprscreen,
               n.hivscreening,
               n.bultrasonography,
               n.classification,
               n.treatment,
               n.referral,
               n.referralreason,
               n.referralorg,
               n.nextcaredate,
               n.doctor,
               n.operatetime,
               n.operatorid,
               n.operateorganization,
               n.updateoperatorid,
               n.updatetime,
               n.isdelete,
               n.deleteoperatorid,
               n.deletetime,
               n.created_at,
               n.updated_at
        from mch_newly_diagnosed n
               left join mch_pregnancy_books b on n.pregnancybooksid = b.id
        where n.id = ?
          and n.isdelete = false
          and b.isdelete = false
      `,
      code
    );
    return newlyDiagnosed.map(it => ({
      ...it,
      referral: !!Number(it.referral)
    }))[0];
  }

  /**
   * 第2~5次产前随访服务信息表详情
   *
   * @param code 主键id
   * @return {
   *   name: '姓名'
   *   id: '主键',
   *   pregnancybooksid: '母子健康手册表主键',
   *   checkdate: '随访日期',
   *   gestationalagemonth: '孕周',
   *   chiefcomplaint: '主诉',
   *   weight: '体重',
   *   uterinehigh: '产科检查 - 宫底高度',
   *   abdominalcircumference: '产科检查 - 腹围',
   *   fetalposition: '产科检查 - 胎位. 编码表358',
   *   fetalheartrate: '产科检查 - 胎心率',
   *   systolicpressure: '血压 - 收缩压',
   *   assertpressure: '血压 - 舒张压',
   *   hemoglobin: '血红蛋白',
   *   urinaryprotein: '尿蛋白. 编码表009',
   *   classification: '分类',
   *   guide: '指导. 编码表401004',
   *   referral: '是否转诊',
   *   referralreason: '转诊原因',
   *   referralorg: '转诊机构及科室',
   *   nextappointmentdate: '下次随访日期',
   *   doctor: '医生姓名',
   *   operateorganization: '操作机构',
   *   operatorid: '操作账号',
   *   operatetime: '操作时间',
   *   updateoperatorid: '更新账号',
   *   updatetime: '更新时间',
   *   isdelete: '是否删除',
   *   deleteoperatorid: '删除账号',
   *   deletetime: '删除时间'
   * }
   */
  async recordPrenatalFollowUp(code) {
    // 第2~5次产前随访服务信息表
    const result = await originalDB.execute(
      // language=PostgreSQL
      `
        select b.name,
               card.id,
               card.pregnancybooksid,
               card.checkdate,
               card.gestationalagemonth,
               card.chiefcomplaint,
               card.weight,
               card.uterinehigh,
               card.abdominalcircumference,
               card.fetalposition,
               card.fetalheartrate,
               card.assertpressure,
               card.systolicpressure,
               card.hemoglobin,
               card.urinaryprotein,
               card.classification,
               card.guide,
               card.referral,
               card.referralorg,
               card.nextappointmentdate,
               card.doctor,
               card.operatetime,
               card.operatorid,
               card.operateorganization,
               card.updateoperatorid,
               card.updatetime,
               card.isdelete,
               card.deleteoperatorid,
               card.deletetime,
               card.created_at,
               card.updated_at
        from mch_prenatal_care card
               left join mch_pregnancy_books b on card.pregnancybooksid = b.id
        where card.id = ?
          and card.isdelete = false
          and b.isdelete = false
      `,
      code
    );
    return result.map(it => ({
      ...it,
      nextappointmentdate: dayjs(it.nextappointmentdate),
      referral: !!Number(it.referral)
    }))[0];
  }

  /**
   * 产后访视记录表详情
   *
   * @param code 主键
   * @return {
   *   id: '主键',
   *   pregnancybooksid: '母子健康手册表主键',
   *   maternitycode: '产妇分娩表主键',
   *   maternalname: '姓名',
   *   maternalidcardno: '身份证',
   *   visitdate: '访视日期',
   *   birthday: '出生时间',
   *   dischargedate: '出院日期',
   *   temperaturedegrees: '体温',
   *   generalhealthcondition: '一般健康情况',
   *   generalmentalcondition: '一般心理情况',
   *   diastolicpressure: '舒张压',
   *   systolicpressure: '收缩压',
   *   breast: '乳房',
   *   lochiatype: '恶露类型',
   *   lochiavolume: '恶露量',
   *   perinealincision: '伤口',
   *   other: '其他',
   *   classification: '分类',
   *   guide: '指导',
   *   referral: '是否转诊',
   *   referralreason: '转诊原因',
   *   referralorg: '转诊机构',
   *   nextvisitdate: '下次随访日期',
   *   doctor: '医生姓名',
   *   operateorganization: '操作机构',
   *   operatorid: '操作账号',
   *   operatetime: '操作时间',
   *   updateoperatorid: '更新账号',
   *   updatetime: '更新时间',
   *   isdelete: '是否删除',
   *   deleteoperatorid: '删除账号',
   *   deletetime: '删除时间'
   * }
   */
  async maternalVisits(code) {
    // language=PostgreSQL
    const result = await originalDB.execute(
      `
        select id,
               pregnancybooksid,
               maternitycode,
               maternalname,
               maternalidcardno,
               visitdate,
               birthday,
               dischargedate,
               temperaturedegrees,
               generalhealthcondition,
               generalmentalcondition,
               diastolicpressure,
               systolicpressure,
               breast,
               lochiatype,
               lochiavolume,
               perinealincision,
               other,
               classification,
               guide,
               referral,
               referralreason,
               referralorg,
               nextvisitdate,
               doctor,
               operatetime,
               operatorid,
               operateorganization,
               updateoperatorid,
               updatetime,
               isdelete,
               deleteoperatorid,
               deletetime,
               created_at,
               updated_at
        from mch_maternal_visit
        where id = ?
          and isdelete = false
      `,
      code
    );
    return result[0];
  }

  /**
   * 产后42天健康检查记录表详情
   *
   * @param code 主键
   * @return {
   *   id: '主键',
   *   pregnancybooksid: '母子健康手册主键',
   *   maternitycode: '产妇分娩表主键',
   *   idcard: '身份证号码',
   *   pregnantwomenname: '姓名',
   *   visitdate: '访视日期',
   *   generalmentalcondition: '一般心理情况',
   *   systolicpressure: '收缩压',
   *   diastolicpressure: '舒张压',
   *   breast: '乳房',
   *   lochia: '恶露',
   *   lochiacolor: '恶露色',
   *   lochiasmell: '恶露味',
   *   perinealincision: '伤口',
   *   other: '其他',
   *   guide: '指导',
   *   treatmentviews: '处理',
   *   doctor: '随访医生签名',
   *   operateorganization: '操作机构',
   *   operatorid: '操作账号',
   *   operatetime: '操作时间',
   *   updateoperatorid: '更新账号',
   *   updatetime: '更新时间',
   *   isdelete: '是否删除',
   *   deleteoperatorid: '删除账号',
   *   deletetime: '删除时间',
   * }
   */
  async recordPostpartum42DaysCheck(code) {
    // 产后42天健康检查记录表
    const result = await originalDB.execute(
      // language=PostgreSQL
      `
        select id,
               pregnancybooksid,
               maternitycode,
               idcard,
               pregnantwomenname,
               visitdate,
               generalmentalcondition,
               diastolicpressure,
               systolicpressure,
               breast,
               lochia,
               lochiacolor,
               lochiasmell,
               perinealincision,
               other,
               guide,
               treatmentviews,
               doctor,
               operatetime,
               operatorid,
               operateorganization,
               updateoperatorid,
               updatetime,
               isdelete,
               deleteoperatorid,
               deletetime,
               created_at,
               updated_at
        from mch_examine_42th_day
        where id = ?
          and isdelete = false
      `,
      code
    );
    return result[0];
  }

  // endregion

  // region 个人档案详情

  /***
   * 个人档案详情
   * @param id
   * @return {
   *  id: id
   *  name: 姓名
   *  gender: 性别
   *  voucher: 证件类型
   *  idCard: 身份证号
   *  birth: 出生日期
   *  phone: 电话
   *  regionCode: 行政区域code(现住址)
   *  address: 居住地址
   *  census: 户籍地址
   *  workUnit: 工作单位
   *  houseHold: 家庭关系
   *  contactName: 联系人姓名
   *  contactPhone: 联系人电话
   *  contactRelationship: 联系人与本人关系
   *  livingConditions: 常住类型
   *  accountType: 户口类型
   *  blood: 血型
   *  national: 民族
   *  RH: RH
   *  education: 文化程度
   *  profession: 职业
   *  marrage: 婚姻状况
   *  doctor: 责任医生
   *  createdAt: 建档日期
   *  XNHCard: 新农合卡号
   *  medicareCard: 医保卡号
   *  medicalPayType: 医疗费用支付
   *  medicalCard: 医疗卡号
   *  isLowWarranty: 是否低保
   *  lowWarrantyCard: 低保卡号
   *  drugAllergy: 药物过敏
   *  ancestralHistory: 祖辈病史
   *  fatherHistory: 父亲病史
   *  motherHistory: 母亲病史
   *  siblingHistory: 兄弟姐妹病史
   *  childrenHistory: 子女病史
   *  isGeneticHistory: 有无遗传病史
   *  geneticDisease: 遗传病名
   *  isDisability: 有无残疾
   *  exposureHistory: 暴露史
   *  diseaseHistory: 有无疾病史
   *  isSurgeryHistory: 有无手术史
   *  isTraumaticHistory: 有无外伤史
   *  isTransfusionHistory: 有无输血史
   *  kitchenVentilation: 厨房排风设施
   *  FuelType: 燃料类型
   *  water: 饮水
   *  toilet: 厕所
   *  livestock: 禽畜栏
   *  contractStaff: 重点人群类型
   *  managementHospital: 管理机构
   *  hospital: 录入机构
   *  hospitalId: 录入账号
   *  updatedAt: 录入时间
   * }
   */
  async personDetail(id) {
    const [
      genderCode, //性别字典
      voucherCode, //证件类型
      houseHoldCode, //家庭关系
      contractStaffCode, //重点人群
      nationalCode //民族
    ] = await Promise.all([
      dictionaryQuery('001'), //性别字典
      dictionaryQuery('674'), //证件类型
      dictionaryQuery('548'), //家庭关系
      dictionaryQuery('100007'), //contractStaff
      dictionaryQuery('002') //contractStaff
    ]);
    const result = await originalDB.execute(
      // language=PostgreSQL
      `
        select vp.id,
               vp.name                   as "name",
               vp.Sex                    as "gender",
               vp.VoucherType            as "voucher",
               vp.IdCardNo               as "idCard",
               vp.Birth                  as "birth",
               vp.Phone                  as "phone",
               vp.RegionCode             as "regionCode",
               vp.Address                as "address",
               vp.Residencestring        as "census",
               vp.WorkUnit               as "workUnit",
               vp.RHeadHousehold         as "houseHold",
               vp.ContactName            as "contactName",
               vp.ContactPhone           as "contactPhone",
               vp.Relationship           as "contactRelationship",
               vp.LivingConditions       as "livingConditions",
               vp.AccountType            as "accountType",
               vp.BloodABO               as blood,
               vp.national               as "national",
               vp.RH                     as "RH",
               vp.Education              as "education",
               vp.Occupation             as "profession",
               vp.MaritalStatus          as "marrage",
               vp.Responsibility         as "doctor",
               vp.FileDate               as "createdAt",
               vp.XNHCardNo              as "XNHCard",
               vp.YBCardNo               as "medicareCard",
               vp.MedicalExpensesPayKind as "medicalPayType",
               vp.PaymentCard            as "medicalCard",
               vp.IsLowWarranty          as "isLowWarranty",
               vp.LowWarrantyCardNo      as "lowWarrantyCard",
               vp.DrugAllergy            as "drugAllergy",
               vp.AncestralHistory       as "ancestralHistory",
               vp.FatherHistory          as "fatherHistory",
               vp.MotherHistory          as "motherHistory",
               vp.SiblingHistory         as "siblingHistory",
               vp.ChildrenHistory        as "childrenHistory",
               vp.IsGeneticHistory       as "isGeneticHistory",
               vp.GeneticDisease         as "geneticDisease",
               vp.WhetherDisability      as "isDisability",
               vp.ExposureHistory        as "exposureHistory",
               vp.PastHistory            as "diseaseHistory",
               vp.IsSurgicalHistory      as "isSurgeryHistory",
               vp.IsTraumaticHistory     as "isTraumaticHistory",
               vp.IsTransfusionHistory   as "isTransfusionHistory",
               vp.shhjcf                 as "kitchenVentilation",
               vp.shhjrl                 as "fuelType",
               vp.shhjys                 as "water",
               vp.shhjcs                 as "toilet",
               vp.shhjscl                as "livestock",
               vp.ContractStaff          as "contractStaff",
               vp.AdminOrganization      as "managementHospital",
               vp.OperateOrganization    as "hospital",
               area.name                 as "hospital",
               vp.OperatorId             as "hospitalId",
               vp.OperateTime            as "updatedAt"
        from ph_person vp
               left join area on area.code = vp.OperateOrganization
        where id = ?
      `,
      id
    );

    return result.map(item => ({
      ...item,
      gender: genderCode.find(it => it.code === item.gender)?.name ?? '',
      voucher: voucherCode.find(it => it.code === item.voucher)?.name ?? '',
      national: nationalCode.find(it => it.code === item.national)?.name ?? '',
      houseHold:
        houseHoldCode.find(it => it.code === item.houseHold)?.name ?? '',
      contractStaff:
        contractStaffCode.find(it => it.code === item.contractStaff)?.name ?? ''
    }));
  }

  // endregion

  // region 老年人

  /***
   * 老年人生活自理评分
   * @param id
   * @returns[{
   * id: id
   * healthyID:体验表id
   * checkDate: 检查时间
   * mealScore:进餐得分
   * washScore:梳洗得分
   * dressScore:穿衣得分
   * toiletScore:如厕得分
   * activityScore:活动得分
   * total:总分
   * }]
   */
  async oldManSelfCare(id) {
    return (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select vhc.id,
                 vhc.IncrementNo as "healthyID",
                 vh.checkupDate  as "checkDate",
                 vhc.jcScore     as "mealScore",
                 vhc.sxScore     as "washScore",
                 vhc.cyScore     as "dressScore",
                 vhc.rcScore     as "toiletScore",
                 vhc.hdScore     as "activityScore",
                 vhc.AllScore    as "total"
          from ph_old_health_check vhc
                 left join ph_healthy vh on vh.id = vhc.incrementno
          where vh.personnum = ?
            and vh.isdelete = false
          order by vh.checkupDate desc, vhc.operatetime desc
        `,
        id
      )
    ).map(it => ({
      ...it,
      checkDate: dayjs(it.checkDate).toDate()
    }));
  }

  /***
   * 老年人生活自理评分详情
   * @param id
   * @returns[{
   * id: id
   * healthyID:体验表id
   * checkDate:体检时间
   * name:姓名
   * mealNormal: 进餐可以自理
   * mealModerate:进餐中度依赖
   * mealDisable:进餐不能自理
   * mealScore:进餐得分
   * washNormal:梳洗可以自理
   * washMild:梳洗轻度依赖
   * washModerate:梳洗中度依赖
   * washDisable:梳洗不能自理
   * washScore:梳洗得分
   * dressNormal:穿衣可以自理
   * dressModerate:穿衣中度依赖
   * dressDisable:穿衣不能自理
   * dressScore:穿衣得分
   * toiletNormal:如厕可以自理
   * toiletMild:如厕轻度依赖
   * toiletModerate:如厕中度依赖
   * toiletDisable:如厕不能自理
   * toiletScore:如厕得分
   * activityNormal:活动可以自理
   * activityMild:活动轻度依赖
   * activityModerate:活动中度依赖
   * activityDisable:活动不能自理
   * activityScore:活动得分
   * total:总分
   * }]
   */
  async oldManSelfCareDetail(id) {
    return (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select vhc.id,
                 vhc.IncrementNo as "healthyID",
                 vh.checkupDate  as "checkDate",
                 vh.name         as "name",
                 vhc.jckzl       as "mealNormal",
                 vhc.jczdyl      as "mealModerate",
                 vhc.jcbnzl      as "mealDisable",
                 vhc.jcScore     as "mealScore",
                 vhc.sxkzl       as "washNormal",
                 vhc.sxqdyl      as "washMild",
                 vhc.sxzdyl      as "washModerate",
                 vhc.sxbnzl      as "washDisable",
                 vhc.sxScore     as "washScore",
                 vhc.cykzl       as "dressNormal",
                 vhc.cyzdyl      as "dressModerate",
                 vhc.cybnzl      as "dressDisable",
                 vhc.cyScore     as "dressScore",
                 vhc.rckzl       as "toiletNormal",
                 vhc.rcqdyl      as "toiletMild",
                 vhc.rczdyl      as "toiletModerate",
                 vhc.rcbnzl      as "toiletDisable",
                 vhc.rcScore     as "toiletScore",
                 vhc.hdkzl       as "activityNormal",
                 vhc.hdqdyl      as "activityMild",
                 vhc.hdzdyl      as "activityModerate",
                 vhc.hdbnzl      as "activityDisable",
                 vhc.hdScore     as "activityScore",
                 vhc.AllScore    as "total"
          from ph_old_health_check vhc
                 left join ph_healthy vh on vh.id = vhc.incrementno
          where vhc.id = ?
            and vh.isdelete = false
        `,
        id
      )
    ).map(it => ({
      ...it,
      checkDate: dayjs(it.checkDate).toDate()
    }));
  }

  // endregion

  // region 问卷

  /***
   * 标签的具体内容
   * @param id
   * @param code
   * @param year
   */
  @validate(
    should
      .string()
      .required()
      .description('个人id'),
    should
      .string()
      .required()
      .description('标签code')
  )
  async markContent(id, code, year) {
    if (!year) year = dayjs().year();
    return originalDB.execute(
      // language=PostgreSQL
      `
        select *
        from mark_content
        where year = ?
          and id = ?
          and name = ?
      `,
      year,
      id,
      code
    );
  }

  /***
   * 问卷选项表
   * @returns {
   *   id: 问卷id
   *   name: 姓名
   *   date: 问卷时间
   *   doctor: 医生姓名
   *   hospitalName:机构名称
   * }
   */
  @validate(
    should
      .string()
      .required()
      .description('个人id')
  )
  async questionnaire(id) {
    // language=PostgreSQL
    return originalDB.execute(
      `
        select vq.id,
               vp.name,
               vq.questionnairemaindate as "date",
               vq.doctorname            as "doctor",
               area.name                as "hospitalName"
        from ph_old_questionnaire_main vq
               left join ph_person vp on vq.personnum = vp.id
               left join area on vp.operateorganization = area.code
        where vp.id = ?
        order by vq.questionnairemaindate desc
      `,
      id
    );
  }

  /***
   * 老年人中医药健康管理服务记录表
   * return {
   *   questionnaire: 问卷详情
   *    {
   *      questionCode: 问题编号
   *      question:     问题描述
   *      option:       选择描述
   *      optionCode:   选项编号
   *      score:        选项分数(正向分数([选几得几分])
   *      secondScore?:  选项反向分数(选1得5分,比如平和质)
   *    }
   *   constitution: 体质结果
   *    {
   *      name: 姓名
   *      constitutiontype:  体质
   *      constitutiontypepossible: 倾向体质
   *      date: 问卷时间
   *      hospitalName: 机构名称
   *      doctor: 医生名称
   *      guide: 指导建议 (TODO:目前无数据)
   *    }
   * }
   */
  @validate(
    should
      .string()
      .required()
      .description('问卷表id')
  )
  async questionnaireDetail(id) {
    const questionnaireModels = await originalDB.execute(
      // language=PostgreSQL
      `
        select cast(vb.questioncode as int)   as "questionCode",
               vb.questioncode                as "questionCode",
               vqd.questionnairemainsn        as "detailId",
               vqd.questionnairedetailcontent as "question",
               vq.optioncontent               as "option",
               vq.optioncode                  as "optionCode",
               vq.score
        from ph_questionnaire_detail vqd
               inner join ph_question_options vq on
          cast(vqd.optionsn as int) = cast(vq.optionsn as int)
               inner join ph_question_lib vb on
          vb.questionsn = vq.questionsn
        where vqd.QuestionnaireMainSN = ?
        order by cast(vb.questioncode as int)
      `,
      id
    );
    const questionnaire = questionnaireModels.reduce((res, next) => {
      const current = res.find(it => it.questionCode === next.questionCode);
      // 如果查找到, 说明这个答案得分有两次
      if (current) {
        //有反向分数(1 -> 5 [选1得5分])和正向分数(选几得几分)之分
        if (Number(current.optionCode) === Number(current.score)) {
          // 反向分数(即:选1得5分)放到secondScore中
          current.secondScore = next.score;
        } else {
          //分数和选项序号相反,则交换位置
          const score = current.score;
          current.score = next.score;
          current.secondScore = score;
        }
      } else {
        next.secondScore = null;
        res.push(next);
      }
      return res;
    }, []);
    //找人名:
    const name =
      (
        await originalDB.execute(
          // language=PostgreSQL
          `
            select vp.name
            from ph_questionnaire_detail vqd
                   left join ph_old_questionnaire_main vm on
              cast(vm.id as varchar) = cast(vqd.questionnairemainsn as varchar)
                   right join ph_person vp on vm.personnum = vp.id
            where vqd.questionnairemainsn = ?
            limit 1;`,
          id
        )
      )[0]?.name ?? null;
    //体质结果
    const constitution =
      (
        await originalDB.execute(
          // language=PostgreSQL
          `
            select vp.name,
                   vq.constitutiontype,
                   vq.constitutiontypepossible,
                   vq.OperateTime as "date",
                   area.name      as "hospitalName",
                   vq.doctor
            from ph_questionnaire_guide vq
                   left join ph_person vp on vq.personnum = vp.id
                   left join area on vp.operateorganization = area.code
            where vq.id = ?
          `,
          questionnaire[0]?.detailId
        )
      )[0] ?? null;
    //TODO 指定建议暂时无数据
    if (constitution) constitution.guide = '';
    return {name, questionnaire, constitution};
  }

  // endregion

  // region 高危人群

  /**
   * 高危人群随访列表
   *
   * @param id 居民id
   * return [{
   * id: 随访主键,
   * followDate: 随访时间,
   * followWay: 随访方式,
   * riskFactorsName: 高危因素,
   * doctor: 医生,
   * updateAt: 录入时间
   * }]
   */
  async chronicDiseaseHighList(id) {
    const followCodeNames = await dictionaryQuery('7010104');
    // language=PostgreSQL
    return (
      await originalDB.execute(
        `
          select vdv.id,
                 vdv.FollowUpDate    as "followDate",
                 vdv.FollowUpWay     as "followWay",
                 vdv.RiskFactorsName as "riskFactorsName",
                 vdv.Doctor,
                 vdv.OperateTime     as "updateAt"
          from ph_chronic_disease_high_visit vdv
                 inner join ph_chronic_disease_high_card vd on vdv.ChronicDiseaseHighCardID = vd.id
          where vd.PersonNum = ?
            and vd.TerminationManage = true
            and vd.IsDelete = false
            and vdv.IsDelete = false
          order by vdv.OperateTime desc
        `,
        id
      )
    ).map(item => ({
      ...item,
      followWay: followCodeNames.find(way => way.code === item.followWay)?.name
    }));
  }

  /**
   * 高危人群随访详情
   *
   * @param id 随访id
   * return {
   * id: 随访主键,
   * No: 随访编号,
   * name: 姓名,
   * followDate: 随访时间
   * followWay: 随访方式,
   * riskFactorsName: 高危因素,
   * systolicPressure: 高压,
   * assertPressure: 低压,
   * bloodFat: 血脂,
   * weight: 体重,
   * waist: 腰围,
   * kfxt: 空腹血糖,
   * sjxt: 随机血糖,
   * isSmoke: 是否吸烟,
   * daySmoke: 吸烟量,
   * isDiet: 膳食指导,
   * dietDescription: 膳食指导描述,
   * isPhysicalActivity: 身体活动指导,
   * physicalActivityDesc: 身体活动指导描述,
   * isQuitSmoking: 戒烟指导,
   * quitSmokingDesc: 戒烟指导描述,
   * isLimitDrink: 限酒指导,
   * limitDrinkDesc: 限酒描述,
   * isVisit: 是否失访,
   * visitReason: 失访原因,
   * nextVisitDate: 下次随访时间,
   * updateAt: 录入时间,
   * doctor: 医生,
   * remark: 备注
   * }
   */
  async chronicDiseaseHighVisit(id) {
    // language=PostgreSQL
    return (
      await originalDB.execute(
        `
          select vd.id,
                 vd.serialNum            as "No",
                 vp.name                 as "name",
                 vd.followUpDate         as "followDate",
                 vc_follow.name          as "followWay",
                 vd.RiskFactorsName      as "riskFactorsName",
                 vd.SystolicPressure     as "systolicPressure",
                 vd.AssertPressure       as "assertPressure",
                 vd.Blood_Fat            as "bloodFat",
                 vd.Weight               as "weight",
                 vd.The_Waist            as "waist",
                 vd.Blood_Sugar          as "kfxt",
                 vd.Blood_Random         as "sjxt",
                 vd.IsSmoke              as "isSmoke",
                 vd.DaySmoke             as "daySmoke",
                 vd.IsDiet               as "isDiet",
                 vd.DietDescription      as "dietDescription",
                 vd.IsPhysicalActivity   as "isPhysicalActivity",
                 vd.PhysicalActivityDesc as "physicalActivityDesc",
                 vd.IsQuitSmoking        as "isQuitSmoking",
                 vd.QuitSmokingDesc      as "quitSmokingDesc",
                 vd.IsLimitDrink         as "isLimitDrink",
                 vd.LimitDrinkDesc       as "limitDrinkDesc",
                 vd.IsVisit              as "isVisit",
                 vd.VisitReason          as "visitReason",
                 vd.NextVisitDate        as "nextVisitDate",
                 vd.OperateTime          as "updateAt",
                 vd.Doctor               as "doctor",
                 vd.Remark               as "remark"
          from ph_chronic_disease_high_visit vd
                 inner join ph_person vp on vd.personnum = vp.id
                 left join ph_dict vc_follow
                           on vc_follow.category = '7010104' and vc_follow.code = vd.FollowUpWay
          where vd.id = ?
            and vd.isdelete = false
        `,
        id
      )
    )[0];
  }

  // endregion

  // region 其他慢病

  /**
   * 其他慢病随访列表
   *
   * @param id 居民id
   * return [{
   * id: 随访主键,
   * followDate: 随访时间,
   * followWay: 随访方式,
   * presentSymptoms: 症状,
   * doctor: 医生,
   * updateAt: 录入时间
   }]
   */
  async chronicDiseaseOtherList(id) {
    const followCodeNames = await dictionaryQuery('7010104');
    // language=PostgreSQL
    return (
      await originalDB.execute(
        `
          select vdv.id,
                 vdv.FollowUpDate    as "followDate",
                 vdv.FollowUpWay     as "followWay",
                 vdv.PresentSymptoms as "presentSymptoms",
                 vdv.Doctor,
                 vdv.OperateTime     as "updateAt"
          from ph_chronic_disease_other_visit vdv
                 inner join ph_chronic_disease_other_card vd
                            on vdv.ChronicDiseaseHighCardID = vd.id
          where vd.PersonNum = ?
            and vd.TerminationManage = true
            and vd.IsDelete = false
            and vdv.IsDelete = false
          order by vdv.OperateTime desc
        `,
        id
      )
    ).map(item => ({
      ...item,
      followWay: followCodeNames.find(way => way.code === item.followWay)?.name
    }));
  }

  /**
   * 其他慢病随访详情
   *
   * @param id 随访id
   * return {
   * id: 随访主键,
   * No: 随访编号,
   * name: 姓名,
   * followDate: 随访时间
   * followWay: 随访方式,
   * symptoms: 症状,
   * systolicPressure: 高压,
   * assertPressure: 低压,
   * weight: 体重,
   * weightSuggest: 体重建议,
   * stature: 身高,
   * BMI: 体质指数,
   * BMISuggest: 推荐体质指数,
   * HeartRate: 心率,
   * other: 其他,
   * daySmoke: 日吸烟量,
   * daySmokeSuggest: 建议日吸烟量,
   * dayDrink: 日饮酒量,
   * dayDrinkSuggest: 推荐日饮酒量,
   * exerciseWeek: 每周运动次数,
   * exerciseMinute: 每次运动时长,
   * exerciseWeekSuggest: 推荐每周运动次数,
   * exerciseMinuteSuggest: 推荐每次运动时长,
   * saltSituation: 摄盐情况,
   * saltSituationSuggest: 推荐摄盐情况,
   * mental: 心理调整,
   * doctorStatue: 遵医行为,
   * qtzysx: 其他注意事项,
   * fzjc: 辅助检查,
   * medicationAdherence: 服药依赖性,
   * adverseReactions: 药物不良反应,
   * adverseReactionsExplain: 药物不良反应其他,
   * visitClass: 随访分类,
   * drugName1: 药品1,
   * dailyTimesDrugName1: 用法1,
   * usageDrugName1: 用量1,
   * drugName2: 药品2,
   * dailyTimesDrugName2: 用法2,
   * usageDrugName2: 用量2,
   * drugName3: 药品3,
   * dailyTimesDrugName3: 用法3,
   * usageDrugName3: 用量3,
   * otherDrugName: 其他药品,
   * otherDailyTimesDrugName: 其他药品用法,
   * otherUsageDrugName: 其他药品用量,
   * remark: 备注,
   * referral: 是否建议转诊,
   * referralReason: 转诊原因,
   * referralAgencies: 转诊机构科室,
   * nextVisitDate: 下次随访时间,
   * updateAt: 录入时间,
   * doctor: 医生
   * }
   */
  async chronicDiseaseOtherVisit(id) {
    // language=PostgreSQL
    return (
      await originalDB.execute(
        `
          select vd.id,
                 vd.serialNum            as "No",
                 vp.name                 as "name",
                 vd.followUpDate         as "followDate",
                 vc_follow.name          as "followWay",
                 vd.presentSymptoms      as "symptoms",
                 vd.SystolicPressure     as "systolicPressure",
                 vd.AssertPressure       as "assertPressure",
                 vd.Weight               as "weight",
                 vd.Weight_Suggest       as "weightSuggest",
                 vd.Stature              as "stature",
                 vd.BMI                  as "BMI",
                 vd.BMI_Suggest          as "BMISuggest",
                 vd.HeartRate            as "HeartRate",
                 vd.Other_Tz             as "other",
                 vd.DaySmoke             as "daySmoke",
                 vd.DaySmoke_Suggest     as "daySmokeSuggest",
                 vd.DayDrink             as "dayDrink",
                 vd.DayDrink_Suggest     as "dayDrinkSuggest",
                 vd.Sport_Week           as "exerciseWeek",
                 vd.Sport_Minute         as "exerciseMinute",
                 vd.Sport_Week_Suggest   as "exerciseWeekSuggest",
                 vd.Sport_Minute_Suggest as "exerciseMinuteSuggest",
                 vc_salt.name            as "saltSituation",
                 vc_salt_suggest.name    as "saltSituationSuggest",
                 vc_mental.name          as "mental",
                 vc_doctor_s.name        as "doctorStatue",
                 vd.Other_Sysjc          as "qtzysx",
                 vd.Fzjc                 as "fzjc",
                 vc_ma.name              as "medicationAdherence",
                 vc_effect.name          as "adverseReactions",
                 vd.AdverseEffectOther   as "adverseReactionsExplain",
                 vc_vc.name              as "visitClass",
                 vd.DrugName1            as "drugName1",
                 vd.Usage_Day1           as "dailyTimesDrugName1",
                 vd.Usage_Time1          as "usageDrugName1",
                 vd.DrugName2            as "drugName2",
                 vd.Usage_Day2           as "dailyTimesDrugName2",
                 vd.Usage_Time2          as "usageDrugName2",
                 vd.DrugName3            as "drugName3",
                 vd.Usage_Day3           as "dailyTimesDrugName3",
                 vd.Usage_Time3          as "usageDrugName3",
                 vd.DrugNameOther        as "otherDrugName",
                 vd.Usage_DayOther       as "otherDailyTimesDrugName",
                 vd.Usage_TimeOther      as "otherUsageDrugName",
                 vd.Remark               as "remark",
                 vd.Referral             as "referral",
                 vd.ReferralReason       as "referralReason",
                 vd.ReferralAgencies     as "referralAgencies",
                 vd.NextVisitDate        as "nextVisitDate",
                 vd.OperateTime          as "updateAt",
                 vd.Doctor               as "doctor"
          from ph_chronic_disease_other_visit vd
                 inner join ph_person vp on vd.personnum = vp.id
                 left join ph_dict vc_follow
                           on vc_follow.category = '7010104' and vc_follow.code = vd.FollowUpWay
                 left join ph_dict vc_salt
                           on vc_salt.category = '7010112' and vc_salt.code = vd.Salt_Situation
                 left join ph_dict vc_salt_suggest
                           on vc_salt_suggest.category = '7010112' and
                              vc_salt_suggest.code = vd.Salt_Situation_Suggest
                 left join ph_dict vc_mental
                           on vc_mental.category = '331' and vc_mental.code = vd.MentalSet
                 left join ph_dict vc_doctor_s
                           on vc_doctor_s.category = '332' and vc_doctor_s.code = vd.DoctorStatue
                 left join ph_dict vc_ma on vc_ma.category = '181' and vc_ma.code = vd.MedicationAdherence
                 left join ph_dict vc_effect
                           on vc_effect.category = '005' and vc_effect.code = vd.AdverseEffect
                 left join ph_dict vc_vc on vc_vc.category = '7010106' and vc_vc.code = vd.VisitClass
          where vd.id = ?
            and vd.isdelete = false
        `,
        id
      )
    )[0];
  }

  // endregion
}
