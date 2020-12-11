import {originalDB, appDB} from '../app';
import {KatoCommonError, should, validate} from 'kato-server';
import {sql as sqlRender} from '../database/template';
import {Context} from './context';
import dayjs from 'dayjs';
import {HospitalModel} from '../database/model';
import {Op} from 'sequelize';

async function dictionaryQuery(categoryno) {
  return await originalDB.execute(
    `select categoryno,code,codename from view_codedictionary vc where categoryno=?`,
    categoryno
  );
}

function listRender(params) {
  return sqlRender(
    `
      from mark_person mp
             inner join view_personinfo vp on mp.personnum = vp.personnum
             inner join view_hospital vh on vp.adminorganization = vh.hospid
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
            {{#compare H01}}{{#if documentOr}} or {{else}} and {{/if}} mp."H01"={{? H01}} {{/compare}}
            {{#compare H02}}{{#if documentOr}} or {{else}} and {{/if}} mp."H02"={{? H02}} {{/compare}}
            {{#compare D01}}{{#if documentOr}} or {{else}} and {{/if}} mp."D01"={{? D01}} {{/compare}}
            {{#compare D02}}{{#if documentOr}} or {{else}} and {{/if}} mp."D02"={{? D02}} {{/compare}}
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
            {{#compare E00}}{{#if personOr}} or {{else}} and {{/if}} mp."E00"={{? E00}} {{/compare}}
          )
    `,
    params
  );
}

export default class Person {
  @validate(
    should.object({
      pageSize: should.number().required(),
      pageNo: should.number().required(),
      name: should.string().allow('', null),
      hospital: should
        .string()
        .required()
        .allow('', null),
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
      include: should.boolean().description('是否包含查询下级机构的个人档案'),
      personOr: should.boolean().description('人群分类是否or查询'),
      documentOr: should.boolean().description('档案问题是否or查询')
    })
  )
  async list(params) {
    const {
      pageSize,
      pageNo,
      hospital,
      region,
      idCard,
      tags,
      include,
      personOr = false,
      documentOr = false
    } = params;
    const limit = pageSize;
    const offset = (pageNo - 1 ?? 0) * limit;
    const his = '340203';
    let {name} = params;
    if (name) name = `%${name}%`;
    let hospitals = [];
    //没有选机构和地区,则默认查询当前用户所拥有的机构
    if (!region && !hospital)
      hospitals = Context.current.user.hospitals.map(it => it.id);
    //仅有地区,则查询该地区下的所有机构
    if (region && !hospital) {
      hospitals = (
        await HospitalModel.findAll({
          where: {region: {[Op.like]: `${region}%`}}
        })
      ).map(it => it.id);
    }
    if (hospital) hospitals = [hospital];

    //如果查询出来的机构列表为空,则数据都为空
    if (hospitals.length === 0) return {count: 0, rows: []};
    // language=PostgreSQL
    hospitals = (
      await Promise.all(
        hospitals.map(it =>
          appDB.execute(
            `select hishospid as id from hospital_mapping where h_id = ?`,
            it
          )
        )
      )
    )
      .filter(it => it.length > 0)
      .reduce(
        (result, current) => [...result, ...current.map(it => it.id)],
        []
      );
    if (include && hospital)
      hospitals = (
        await Promise.all(
          hospitals.map(item =>
            //查询机构的下属机构
            originalDB.execute(
              `select hospid as id from view_hospital where hos_hospid = ?`,
              item
            )
          )
        )
      )
        .filter(it => it.length > 0)
        .reduce(
          (result, current) => [...result, ...current.map(it => it.id)],
          []
        )
        .concat(hospitals);

    const sqlRenderResult = listRender({
      his,
      name,
      hospitals,
      idCard,
      ...tags,
      personOr,
      documentOr
    });
    const count = (
      await originalDB.execute(
        `select count(1) as count ${sqlRenderResult[0]}`,
        ...sqlRenderResult[1]
      )
    )[0].count;
    const person = await originalDB.execute(
      `select vp.personnum   as id,
                vp.name,
                vp.idcardno    as "idCard",
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
                vh.hospname    as "hospitalName",
                vp.operatetime as date
         ${sqlRenderResult[0]}
         order by vp.operatetime desc, vp.personnum desc
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

  async detail(id) {
    // language=PostgreSQL
    const person = (
      await originalDB.execute(
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
        id
      )
    )[0];
    if (!person) throw new KatoCommonError('数据不存在');
    // language=PostgreSQL
    const hypertensionRows = await originalDB.execute(
      `
        select *
        from view_hypertension
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
          select vp.personnum as id,
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
                 vp.operatetime as "updateAt"
          from view_personinfo vp
             inner join mark_person mp on mp.personnum = vp.personnum
          where vp.personnum = ?
          limit 1
        `,
        id
      )
    )[0];

    if (!person) throw new KatoCommonError('数据不存在');
    person.operateOrganization = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select hospid as id, hospname as name
          from view_hospital
          where hospid = ?
        `,
        person.operateorganization
      )
    )[0];

    person.organization = (
      await originalDB.execute(
        // language=PostgreSQL
        `
            select hospid as id, hospname as name
            from view_hospital
            where hospid = ?
          `,
        person.adminorganization
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
    const followCodeNames = await originalDB.execute(
      `select vc.codename,vc.code from view_codedictionary vc where vc.categoryno=?`,
      '7010104'
    );
    return (
      await originalDB.execute(
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
          and vh.isdelete = false
          and vhv.isdelete = false
        order by vhv.followupdate desc
      `,
        id
      )
    ).map(item => ({
      ...item,
      followWay: followCodeNames.find(way => way.code === item.followWay)
        ?.codename
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
        `select * from view_codedictionary vc where categoryno=?;`,
        '331'
      )
    ).map(item => ({
      ...item,
      code: 0 + item.code //TODO:字典数据里的code不带0, vd记录的带0, 先在字典结果的code前面加个0暂用
    }));

    const result = await originalDB.execute(
      `select
        vh.highbloodid as "id",
        vh.hypertensioncardid as "cardId",
        vh.Name as "name",
        vc_sex.codeName as "gender",
        vh.age as "age",
        vh.ContactPhone as "phone",
        vh.SerialNum as "No",
        vh.FollowUpDate as "followDate",
        vc_follow.codename as "followWay",
        vh.PresentSymptoms as "symptoms",
        vh.SystolicPressure as "systolicPressure",
        vh.AssertPressure as "assertPressure",
        vh.Weight as "weight",
        vh.Weight_Suggest as "weigthSuggest",
        vh.Stature as "stature",
        vh.BMI as "BMI",
        vh.HeartRate as "heartRate",
        vh.Other_Tz as "other",
        vh.DaySmoke as "daySmoke",
        vh.DaySmoke_Suggest as "daySmokeSuggest",
        vh.DayDrink as "dayDrink",
        vh.DayDrink_Suggest as "dayDrinkSuggest",
        vh.Sport_Week as "exerciseWeek",
        vh.Sport_Minute as "exerciseMinute",
        vh.Sport_Week_Suggest as "exerciseWeekSuggest",
        vh.Sport_Minute_Suggest as "exerciseMinuteSuggest",
        vc_salt.codename as "saltInTake",
        vc_salt_suggest.codename as "saltInTakeSuggest",
        vh.MentalSet as "mental",
        vc_doctor_s.codename as "doctorStatue",
        vh.Fzjc as "assistExam",
        vc_ma.codename as "medicationAdherence",
        vh.AdverseEffect as "adverseReactions",
        vh.AdverseEffectOther as "adverseReactionsExplain",
        vc_vc.codename as "visitClass",
        vh.DrugName1 as "drugName1",
        vh.Usage_Day1 as "dailyTimesDrugName1",
        vh.Usage_Time1 as "usageDrugName1",
        vh.DrugName2 as "drugName2",
        vh.Usage_Day2 as "dailyTimesDrugName2",
        vh.Usage_Time2 as "usageDrugName2",
        vh.DrugName3 as "drugName3",
        vh.Usage_Day3 as "dailyTimesDrugName3",
        vh.Usage_Time3 as "usageDrugName3",
        concat(vh.DrugName4,vh.DrugName5,vh.DrugName6,vh.DrugName7,vh.DrugName8) as "otherDrugName",
        concat(vh.Usage_Day4,vh.Usage_Day5,vh.Usage_Day6,vh.Usage_Day7,vh.Usage_Day8) as "otherDailyTimesDrugName",
        concat(vh.Usage_Time4,vh.Usage_Time5,vh.Usage_Time6,vh.Usage_Time7,vh.Usage_Time8) as "otherUsageDrugName",
        vh.Remark as "remark",
        vh.Referral as "referral",
        vh.ReferralReason as "referralReason",
        vh.ReferralAgencies as "referralAgencies",
        vh.NextVisitDate as "nextVisitDate",
        vh.OperateOrganization as "hospital",
        vh.OperateTime as "updateAt",
        vh.Doctor as "doctor"
       from view_hypertensionvisit vh
       left join view_codedictionary vc_sex on vc_sex.categoryno='001' and vc_sex.code = vh.sex
       left join view_codedictionary vc_follow on vc_follow.categoryno='7010104' and vc_follow.code = vh.FollowUpWay
       left join view_codedictionary vc_salt on vc_salt.categoryno='7010112' and vc_salt.code = vh.Salt_Situation
       left join view_codedictionary vc_salt_suggest on vc_salt_suggest.categoryno='7010112' and vc_salt_suggest.code = vh.Salt_Situation_Suggest
       left join view_codedictionary vc_mental on vc_mental.categoryno='331' and vc_mental.code = vh.MentalSet  --TODO:字典数据里的code不带0, vh记录的带0
       left join view_codedictionary vc_doctor_s on vc_doctor_s.categoryno='332' and vc_doctor_s.code = vh.DoctorStatue
       left join view_codedictionary vc_ma on vc_ma.categoryno='181' and vc_ma.code = vh.MedicationAdherence
       left join view_codedictionary vc_vc on vc_vc.categoryno='7010106' and vc_vc.code = vh.VisitClass
       where vh.highbloodid=? and vh.isdelete=false`,
      id
    );
    return result.map(r => ({
      ...r,
      mental: mentalCodeNames.find(m => m.code === r.mental)?.codename
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
    const followCodeNames = await originalDB.execute(
      `select vc.codename,vc.code from view_codedictionary vc where vc.categoryno=?`,
      '7010104'
    );
    // language=PostgreSQL
    return (
      await originalDB.execute(
        `
        select
          vdv.DiabetesFollowUpID as "id",
          vdv.followupdate as "followDate",
          vdv.followupway as "followWay",
          vdv.FastingGlucose as "fastingGlucose",
          vdv.PostprandialGlucose as "postprandialGlucose",
          vdv.doctor,
          vdv.operatetime as "updateAt"
        from view_diabetesvisit vdv
               inner join view_diabetes vd on vdv.SugarDiseaseCardID = vd.SugarDiseaseCardID
        where vd.personnum = ?
          and vd.isdelete = false
          and vdv.isdelete = false
        order by vdv.operatetime desc
      `,
        id
      )
    ).map(item => ({
      ...item,
      followWay: followCodeNames.find(way => way.code === item.followWay)
        ?.codename
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
        `select * from view_codedictionary vc where categoryno=?;`,
        '331'
      )
    ).map(item => ({
      ...item,
      code: 0 + item.code //TODO:字典数据里的code不带0, vd记录的带0, 先在字典结果的code前面加个0暂用
    }));
    const result = await originalDB.execute(
      `select
        vd.DiabetesFollowUpID as "id",
        vd.name as "name",
        vc_sex.codeName as "gender",
        vd.age as "age",
        vd.idCardNo as "idCard",
        vd.serialNum as "No",
        vd.followUpDate as "followDate",
        vc_follow.codename as "followWay",
        vd.presentSymptoms as "symptoms",
        vd.SystolicPressure as "systolicPressure",
        vd.AssertPressure as "assertPressure",
        vd.Weight as "weight",
        vd.Weight_Suggest as "weightSuggest",
        vd.Stature as "stature",
        vd.BMI as "BMI",
        vd.BMI_Suggest as "BMISuggest",
        vc_arterial.codename as "arterial",
        vd.Other_Tz as "other",
        vd.DaySmoke as "daySmoke",
        vd.DaySmoke_Suggest as "daySmokeSuggest",
        vd.DayDrink as "dayDrink",
        vd.DayDrink_Suggest as "dayDrinkSuggest",
        vd.Sport_Week as "exerciseWeek",
        vd.Sport_Minute as "exerciseMinute",
        vd.Sport_Week_Suggest as "exerciseWeekSuggest",
        vd.Sport_Minute_Suggest as "exerciseMinuteSuggest",
        vd.Principal_Food as "principalFood",
        vd.Principal_Food_Suggest as "principalFoodSuggest",
        vd.MentalSet as "mental",
        vc_doctor_s.codename as "doctorStatue",
        vd.FastingGlucose as "fastingGlucose",
        vd.PostprandialGlucose as "postprandialGlucose",
        vd.Hemoglobin as "hemoglobin",
        vc_lb.codename as "lowBloodReaction",
        vd.CheckTime as "checkTime",
        vd.MedicationAdherence as "medicationAdherence",
        vd.Blfy as "adverseReactions",
        vd.BlfyOther as "adverseReactionsExplain",
        vc_vc.codename as "visitClass",
        vd.DrugName1 as "drugName1",
        vd.Usage_Day1 as "dailyTimesDrugName1",
        vd.Usage_Time1 as "usageDrugName1",
        vd.DrugName2 as "drugName2",
        vd.Usage_Day2 as "dailyTimesDrugName2",
        vd.Usage_Time2 as "usageDrugName2",
        vd.DrugName3 as "drugName3",
        vd.Usage_Day3 as "dailyTimesDrugName3",
        vd.Usage_Time3 as "usageDrugName3",
        concat(vd.DrugName4,vd.DrugName5,vd.DrugName6,vd.DrugName7,vd.DrugName8) as "otherDrugName",
        concat(vd.Usage_Day4,vd.Usage_Day5,vd.Usage_Day6,vd.Usage_Day7,vd.Usage_Day8) as "otherDailyTimesDrugName",
        concat(vd.Usage_Time4,vd.Usage_Time5,vd.Usage_Time6,vd.Usage_Time7,vd.Usage_Time8) as "otherUsageDrugName",
        vd.Insulin1 as "insulin1",
        vd.InsulinUsing1 as "usageInsulin1",
        vd.Insulin2 as "insulin2",
        vd.InsulinUsing2 as "usageInsulin2",
        vd.Remark as "remark",
        vd.Referral as "referral",
        vd.ReferralReason as "referralReason",
        vd.ReferralAgencies as "referralAgencies",
        vd.NextVisitDate as "nextVisitDate",
        vd.OperateOrganization as "hospital",
        vd.OperateTime as "updateAt",
        vd.Doctor as "doctor"
        from view_diabetesvisit vd
        left join view_codedictionary vc_sex on vc_sex.categoryno='001' and vc_sex.code = vd.sex
        left join view_codedictionary vc_follow on vc_follow.categoryno='7010104' and vc_follow.code = vd.FollowUpWay
        left join view_codedictionary vc_mental on vc_mental.categoryno='331' and vc_mental.code = vd.MentalSet
        left join view_codedictionary vc_doctor_s on vc_doctor_s.categoryno='332' and vc_doctor_s.code = vd.DoctorStatue
        left join view_codedictionary vc_ma on vc_ma.categoryno='181' and vc_ma.code = vd.MedicationAdherence
        left join view_codedictionary vc_vc on vc_vc.categoryno='7010106' and vc_vc.code = vd.VisitClass
        left join view_codedictionary vc_arterial on vc_arterial.categoryno='7152' and vc_arterial.code = vd.arterial
        left join view_codedictionary vc_lb on vc_lb.categoryno='7020101' and vc_lb.code = vd.LowBlood
        where DiabetesFollowUpID=? and vd.isdelete=false`,
      id
    );
    return result.map(r => ({
      ...r,
      mental: mentalCodeNames.find(m => m.code === r.mental)?.codename
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
    return originalDB.execute(
      `
        select
          vh.incrementno as "id",
          vh.stature as "stature",
          vh.weight as "weight",
          vh.temperature as "temperature",
          vh.symptom as "symptom",
          vh.bc_abnormal as "bc_abnormal",
          vh.operatetime as "updateAt"
        from view_healthy vh
        where vh.personnum = ?
        and vh.isdelete = false
        order by vh.operatetime desc
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
    const result = await originalDB.execute(
      `
        select
          vh.incrementno as "id",
          vh.name as "name",
          vh.checkupNo as "checkupNo",
          vh.IDCardNo as "IDCard",
          vh.sex as "gender",
          vh.stature as "stature",
          vh.weight as "weight",
          vh.checkupDate as "checkDate",
          vh.checkupDoctor as "checkupDoctor",
          vh.temperature as "temperature",
          vh.symptom as "symptom",
          vh.bc_abnormal as "bc_abnormal",
          vh.MarrageType as "marrage",
          vh.JobType as "professionType",
          vh.pulse as "pulse",
          vh.breathe as "breathe",
          vh.xyzcszy as "leftDiastolicPressure",
          vh.xyzcssy as "leftSystolicPressure",
          vh.xyycszy as "rightDiastolicPressure",
          vh.xyycssy as "rightSystolicPressure",
          vh.waistline as "waistline",
          vh.BMI as "BMI",
          vh.lnrjkzt as "oldManHealthSelf",
          vh.lnrzlnl as "oldManLifeSelf",
          vh.lnrrzgn as "oldManCognitiveSelf",
          vh.CognitiveFunctionScore as "cognitiveScore",
          vh.lnrqgzt as "oldManEmotion",
          vh.EmotionalStatusScore as "emotionalScore",
          vh.dlpn as "exerciseFrequency",
          vh.mcdlTime as "eachExerciseTime",
          vh.jcdlTime as "stickExerciseTime",
          vh.dlfs as "exerciseWay",
          vh.ysxg as "eatingHabit",
          vh.isxy as "smokingHistory",
          vh.xyl as "smokingAmount",
          vh.ksxyTime as "smokingStartTime",
          vh.jyTime as "smokingStopTime",
          vh.yjpn as "drinkFrequency",
          vh.yjl as "drinkAmount",
          vh.ksyjTime as "drinkStartTime",
          vh.isjj as "isDrinkStop",
          vh.ksjjTime as "drinkStopTime",
          vh.iszj as "isDrunkThisYear",
          vh.zyyjpz as "wineKind",
          vh.zyblqk as "professionExpose",
          vh.jtzy as "profession",
          vh.cysj as "workingTime",
          vh.fc as "dust",
          vh.fcfhcs as "dustProtection",
          vh.fcfhcs_other as "dustProtectionExplain",
          vh.wlys as "physicalCause",
          vh.wlysfhcs as "physicalProtection",
          vh.wlysfhcs_other as "physicalProtectionExplain",
          vh.hxp as "chemicals",
          vh.hxpfhcs as "chemicalsProtection",
          vh.hxpfhcs_other as "chemicalsProtectionExplain",
          vh.sx as "radiation",
          vh.sxfhcs as "radiationProtection",
          vh.sxfhcs_other as "radiationProtectionExplain",
          vh.qt as "other",
          vh.qtfhcs as "otherProtection",
          vh.qtfhcs_other as "otherProtectionExplain",
          vh.kc as "lip",
          vh.yb as "throat",
          vh.cl as "tooth",
          vh.qc1 as "missToothTopLeft",
          vh.qc2 as "missToothTopRight",
          vh.qc3 as "missToothBottomLeft",
          vh.qc4 as "missToothTopRight",
          vh.yuc1 as "cariesTopLeft",
          vh.yuc2 as "cariesTopRight",
          vh.yuc3 as "cariesBottomLeft",
          vh.yuc4 as "cariesBottomRight",
          vh.jy1 as "falseToothTopLeft",
          vh.jy2 as "falseToothTopRight",
          vh.jy3 as "falseToothBottomLeft",
          vh.jy4 as "falseToothBottomRight",
          vh.slzy as "visionLeft",
          vh.slyy as "visionRight",
          vh.yzzy as "visionCorrectionLeft",
          vh.jzyy as "visonCorrectionRight",
          vh.listen as "listen",
          vh.ydgn as "sport",
          vh.yd as "eyeGround",
          vh.yd_abnormal as "eyeGroundExplain",
          vh.pf as "skin",
          vh.pf_Other as "skinExplain",
          vh.gm as "sclera",
          vh.gm_Other as "scleraExplain",
          vh.lbj as "lymph",
          vh.lbjOther as "lymphExplain",
          vh.ftzx as "barrelChest",
          vh.fhxy as "breathSound",
          vh.fhxyyc as "breathSoundExplain",
          vh.fly as "lungSound",
          vh.flyOther as "lungSoundExplain",
          vh.xzxn as "heartRate",
          vh.xzxl as "heartRule",
          vh.xzzy as "noise",
          vh.xzzyOther as "noiseExplain",
          vh.fbyt as "abdominalTenderness",
          vh.fbytOther as "abdominalTendernessExplain",
          vh.fbbk as "abdominalBag",
          vh.fbbkOther as "abdominalBagExplain",
          vh.fbgd as "abdominalLiver",
          vh.fbgdOther as "abdominalLiverExplain",
          vh.fbpd as "abdominalSpleen",
          vh.fbpdOther as "abdominalSpleenExplain",
          vh.fbydxzy as "abdominalNoise",
          vh.fbydxzyOther as "abdominalNoiseExplain",
          vh.xzsz as "lowLimbsEdema",
          vh.gmzz as "anus",
          vh.tnbzbdmbd as "arterial",
          vh.rx as "mammary",
          vh.fk_wy as "vulva",
          vh.fk_wy_abnormal as "vulvaExplain",
          vh.fk_yd as "vagina",
          vh.fk_yd_abnormal as "vaginaExplain",
          vh.fk_gj as "cervical",
          vh.fk_gj_abnormal as "cervicalExplain",
          vh.fk_gt as "uterus",
          vh.fk_gt_abnormal as "uterusExplain",
          vh.fk_fj as "attach",
          vh.fk_fj_abnormal as "attachExplain",
          vh.ctqt as "vaginaOther",
          vh.xcgHb as "hemoglobin",
          vh.xcgWBC as "whiteCell",
          vh.xcgPLT as "platelet",
          vh.xcgqt as "bloodOther",
          vh.ncgndb as "urineProtein",
          vh.ncgnt as "urineSugar",
          vh.ncgntt as "urineKetone",
          vh.ncgnqx as "urineBlood",
          vh.ncgOther as "urineOther",
          vh.nwlbdb as "urineTraceAlbumin",
          vh.LEU as "urineWhiteCell",
          vh.dbqx as "defecateBlood",
          vh.xdt as "ecg",
          vh.xdt_abnormal as "ecgExplain",
          vh.HBsAg as "HBsAg",
          vh.suijxt as "postprandialGlucose",
          vh.kfxt as "fastingGlucose",
          vh.tnbthxhdb as "sugarHemoglobin",
          vh.ggnALT as "liverALT",
          vh.ggnAST as "liverAST",
          vh.ggnALB as "liverALB",
          vh.ggnTBIL as "liverTBIL",
          vh.ggnDBIL as "liverDBIL",
          vh.sgnScr as "renalSCR",
          vh.sgnBUN as "renalBUM",
          vh.sgnxjnd as "renalPotassium",
          vh.sgnxnnd as "renalSodium",
          vh.BUA as "BUA",
          vh.xzCHO as "bloodCHO",
          vh.xzTG as "bloodTG",
          vh.xzLDLC as "bloodLDLC",
          vh.xzHDLC as "bloodHDLC",
          vh.xp as "chest",
          vh.xp_abnormal as "chestExplain",
          vh.bc as "bc",
          vh.bc_abnormal as "bcExplain",
          vh.gjtp as "cervicalSmear",
          vh.gjtp_abnormal as "cervicalSmearExplain",
          vh.jkfzjcqt as "assistExam",
          vh.nxgjb as "cerebrovascular",
          vh.szjb as "renal",
          vh.xzjb as "heart",
          vh.xgjb as "bloodVessels",
          vh.ybjb as "eye",
          vh.sjxt as "nerve",
          vh.sjxt_other as "nerveExplain",
          vh.qtxt as "otherDisease",
          vh.otherDisease1 as "otherDiseaseExplain",
          vh.ruyTime1 as "inHospitalDate1",
          vh.chuyTime1 as "outHospitalDate1",
          vh.zhuyReason1 as "inHospitalReason1",
          vh.hospName1 as "inHospitalName1",
          vh.bah1 as "inHospitalRecord1",
          vh.ruyTime2 as "inHospitalDate2",
          vh.chuyTime2 as "outHospitalDate2",
          vh.HospName2 as "inHospitalName2",
          vh.bah2 as "inHospitalRecord2",
          vh.jcTime1 as "familyInHospitalDate1",
          vh.ccTime1 as "familyOutHospitalDate1",
          vh.jcyy1 as "familyInHospitalReason1",
          vh.jcyljgmc1 as "familyHospitalName1",
          vh.jcbah1 as "familyHospitalRecord1",
          vh.jcTime2 as "familyInHospitalDate2",
          vh.ccTime2 as "familyOutHospitalDate2",
          vh.jcyy2 as "familyInHospitalReason2",
          vh.jcyljgmc2 as "familyHospitalName2",
          vh.jcbah2 as "familyHospitalRecord2",
          vh.yaowu1 as "drug1",
          vh.yf1 as "drugUsage1",
          vh.yl1 as "drugAmount1",
          vh.yysj1 as "drugDate1",
          vh.fyycx as "drugAdherence1",
          vh.yaowu2 as "drug2",
          vh.yf2 as "drugUsage2",
          vh.yl2 as "drugAmount2",
          vh.yysj2 as "drugDate2",
          vh.fyycx2 as "drugAdherence2",
          vh.yaowu3 as "drug3",
          vh.yf3 as "drugUsage3",
          vh.yl3 as "drugAmount3",
          vh.yysj3 as "drugDate3",
          vh.fyycx3 as "drugAdherence3",
          vh.yaowu4 as "drug4",
          vh.yf4 as "drugUsage4",
          vh.yl4 as "drugAmount4",
          vh.yysj4 as "drugDate4",
          vh.fyycx4 as "drugAdherence4",
          vh.yaowu5 as "drug5",
          vh.yf5 as "drugUsage5",
          vh.yl5 as "drugAmount5",
          vh.yysj5 as "drugDate5",
          vh.fyycx5 as "drugAdherence5",
          vh.yaowu6 as "drug6",
          vh.yf6 as "drugUsage6",
          vh.yl6 as "drugAmount6",
          vh.yysj6 as "drugDate6",
          vh.fyycx6 as "drugAdherence6",
          vh.fmy_mc1 as "vaccine1",
          vh.fmy_jzrq1 as "vaccineDate1",
          vh.fmy_jzjg1 as "vaccineHospital1",
          vh.fmy_mc2 as "vaccine2",
          vh.fmy_jzrq2 as "vaccineDate2",
          vh.fmy_jzjg2 as "vaccineHospital2",
          vh.fmy_mc3 as "vaccine3",
          vh.fmy_jzrq3 as "vaccineDate3",
          vh.fmy_jzjg3 as "vaccineHospital3",
          vh.jkpjywyc as "healthyState",
          vh.yichang1 as "abnormal1",
          vh.yichang2 as "abnormal2",
          vh.yichang3 as "abnormal3",
          vh.yichang4 as "abnormal4",
          vh.jkzd_dqsf as "healthyGuide",
          vh.jkzd_wxyskz as "healthyRisk",
          vc_hos.hospname as "hospital",
          vh.operatetime as "updateAt"
        from view_healthy vh
        left join view_hospital vc_hos on vc_hos.hospid=vh.OperateOrganization
        where vh.incrementno = ? and vh.isdelete=false
        order by vh.operatetime desc
       `,
      id
    );
    return result.map(item => ({
      ...item,
      checkDate: dayjs(item.checkDate).toDate(),
      gender: genderCode.find(it => it.code === item.gender)?.codename ?? '',
      marrage: marrageCode.find(it => it.code === item.marrage)?.codename ?? '',
      professionType:
        jobTypeCode.find(it => `0${it.code}` === item.professionType)
          ?.codename ?? '',
      // oldManHealthSelf:
      //   oldManHealthSelfCode.find(it => it.code === item.professionType)
      //     ?.codename || '',
      // oldManLifeSelf:
      //   oldManLifeSelfCode.find(it => it.code === item.oldManLifeSelf)
      //     ?.codename || '',
      // eyeGround:
      //   eyeGroundCode.find(it => it.code === item.eyeGround)?.codename || '',
      // skin: skinCode.find(it => it.code === item.skin)?.codename || '',
      // sclera: scleraCode.find(it => it.code === item.sclera)?.codename || '',
      // lymph: lymphCode.find(it => it.code === item.lymph)?.codename || '',
      // barrelChest:
      //   barrelChestCode.find(it => it.code === item.barrelChest)?.codename ||
      //   '',
      // breathSound:
      //   breathSoundCode.find(it => it.code === item.breathSound)?.codename ||
      //   '',
      // lungSound:
      //   lungSoundCode.find(it => it.code === item.lungSound)?.codename || '',
      // exerciseFrequency:
      //   exerciseFrequencyCode.find(it => it.code === item.exerciseFrequency)
      //     ?.codename || '',
      // drinkFrequency:
      //   drinkFrequencyCode.find(it => it.code === item.drinkFrequency)
      //     ?.codename || '',
      // professionExpose:
      //   professionExposeCode.find(it => it.code === item.professionExpose)
      //     ?.codename || '',
      dustProtection:
        professionExposeCode.find(it => it.code === item.dustProtection)
          ?.codename ?? '',
      physicalProtection:
        professionExposeCode.find(it => it.code === item.physicalProtection)
          ?.codename ?? '',
      chemicalsProtection:
        professionExposeCode.find(it => it.code === item.physicalProtection)
          ?.codename ?? '',
      radiationProtection:
        professionExposeCode.find(it => it.code === item.physicalProtection)
          ?.codename ?? '',
      otherProtection:
        professionExposeCode.find(it => it.code === item.otherProtection)
          ?.codename ?? '',
      // abdominalBag:
      //   abdominalCode.find(it => it.code === item.abdominalBag)?.codename || '',
      // abdominalLiver:
      //   abdominalCode.find(it => it.code === item.abdominalLiver)?.codename ||
      //   '',
      // abdominalSpleen:
      //   abdominalCode.find(it => it.code === item.abdominalSpleen)?.codename ||
      //   '',
      // abdominalNoise:
      //   abdominalCode.find(it => it.code === item.abdominalNoise)?.codename ||
      //   '',
      // arterial:
      //   arterialCode.find(it => it.code === item.arterial)?.codename || '',
      // vulva: vaginaCode.find(it => it.code === item.vulva)?.codename || '',
      // vagina: vaginaCode.find(it => it.code === item.vagina)?.codename || '',
      // cervical:
      //   vaginaCode.find(it => it.code === item.cervical)?.codename || '',
      // uterus: vaginaCode.find(it => it.code === item.uterus)?.codename || '',
      // attach: vaginaCode.find(it => it.code === item.attach)?.codename || '',
      urineProtein:
        urineProteinCode.find(it => it.code === item.urineProtein)?.codename ??
        '',
      urineSugar:
        urineSugarCode.find(it => it.code === item.urineSugar)?.codename ?? '',
      urineKetone:
        urineKetoneCode.find(it => it.code === item.urineKetone)?.codename ??
        '',
      urineBlood:
        urineBloodCode.find(it => it.code === item.urineBlood)?.codename ?? ''
    }));
  }

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
      `select
        vp.PersonNum as "id",
        vp.name as "name",
        vp.Sex as "gender",
        vp.VoucherType as "voucher",
        vp.IdCardNo as "idCard",
        vp.Birth as "birth",
        vp.Phone as "phone",
        vp.RegionCode as "regionCode",
        vp.Address as "address",
        vp.Residencestring as "census",
        vp.WorkUnit as "workUnit",
        vp.RHeadHousehold as "houseHold",
        vp.ContactName as "contactName",
        vp.ContactPhone as "contactPhone",
        vp.Relationship as "contactRelationship",
        vp.LivingConditions as "livingConditions",
        vp.AccountType as "accountType",
        vp.BloodABO as blood,
        vp.national as "national",
        vp.RH as "RH",
        vp.Education as "education",
        vp.Occupation as "profession",
        vp.MaritalStatus as "marrage",
        vp.Responsibility as "doctor",
        vp.FileDate as "createdAt",
        vp.XNHCardNo as "XNHCard",
        vp.YBCardNo as "medicareCard",
        vp.MedicalExpensesPayKind as "medicalPayType",
        vp.PaymentCard as "medicalCard",
        vp.IsLowWarranty as "isLowWarranty",
        vp.LowWarrantyCardNo as "lowWarrantyCard",
        vp.DrugAllergy as "drugAllergy",
        vp.AncestralHistory as "ancestralHistory",
        vp.FatherHistory as "fatherHistory",
        vp.MotherHistory as "motherHistory",
        vp.SiblingHistory as "siblingHistory",
        vp.ChildrenHistory as "childrenHistory",
        vp.IsGeneticHistory as "isGeneticHistory",
        vp.GeneticDisease as "geneticDisease",
        vp.WhetherDisability as "isDisability",
        vp.ExposureHistory as "exposureHistory",
        vp.PastHistory as "diseaseHistory",
        vp.IsSurgicalHistory as "isSurgeryHistory",
        vp.IsTraumaticHistory as "isTraumaticHistory",
        vp.IsTransfusionHistory as "isTransfusionHistory",
        vp.shhjcf as "kitchenVentilation",
        vp.shhjrl as "fuelType",
        vp.shhjys as "water",
        vp.shhjcs as "toilet",
        vp.shhjscl as "livestock",
        vp.ContractStaff as "contractStaff",
        vp.AdminOrganization as "managementHospital",
        vp.OperateOrganization as "hospital",
        vc_hos.hospname as "hospital",
        vp.OperatorId as "hospitalId",
        vp.OperateTime as "updatedAt"
        from view_personinfo vp
        left join view_hospital vc_hos on vc_hos.hospid=vp.OperateOrganization
        where personnum=?`,
      id
    );

    return result.map(item => ({
      ...item,
      gender: genderCode.find(it => it.code === item.gender)?.codename ?? '',
      voucher: voucherCode.find(it => it.code === item.voucher)?.codename ?? '',
      national:
        nationalCode.find(it => it.code === item.national)?.codename ?? '',
      houseHold:
        houseHoldCode.find(it => it.code === item.houseHold)?.codename ?? '',
      contractStaff:
        contractStaffCode.find(it => it.code === item.contractStaff)
          ?.codename ?? ''
    }));
  }

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
        `select
            vhc.scoreID as "id",
            vhc.IncrementNo as "healthyID",
            vh.checkupDate as "checkDate",
            vhc.jcScore as "mealScore",
            vhc.sxScore as "washScore",
            vhc.cyScore as "dressScore",
            vhc.rcScore as "toiletScore",
            vhc.hdScore as "activityScore",
            vhc.AllScore as "total"
        from view_healthchecktablescore vhc
        left join view_healthy vh on vh.incrementno=vhc.incrementno
        where vh.personnum=? and vh.isdelete=false`,
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
        `select
            vhc.scoreID as "id",
            vhc.IncrementNo as "healthyID",
            vh.checkupDate as "checkDate",
            vh.name as "name",
            vhc.jckzl as "mealNormal",
            vhc.jczdyl as "mealModerate",
            vhc.jcbnzl as "mealDisable",
            vhc.jcScore as "mealScore",
            vhc.sxkzl as "washNormal",
            vhc.sxqdyl as "washMild",
            vhc.sxzdyl as "washModerate",
            vhc.sxbnzl as "washDisable",
            vhc.sxScore as "washScore",
            vhc.cykzl as "dressNormal",
            vhc.cyzdyl as "dressModerate",
            vhc.cybnzl as "dressDisable",
            vhc.cyScore as "dressScore",
            vhc.rckzl as "toiletNormal",
            vhc.rcqdyl as "toiletMild",
            vhc.rczdyl as "toiletModerate",
            vhc.rcbnzl as "toiletDisable",
            vhc.rcScore as "toiletScore",
            vhc.hdkzl as "activityNormal",
            vhc.hdqdyl as "activityMild",
            vhc.hdzdyl as "activityModerate",
            vhc.hdbnzl as "activityDisable",
            vhc.hdScore as "activityScore",
            vhc.AllScore as "total"
        from view_healthchecktablescore vhc
        left join view_healthy vh on vh.incrementno=vhc.incrementno
        where vhc.scoreID=? and vh.isdelete=false`,
        id
      )
    ).map(it => ({
      ...it,
      checkDate: dayjs(it.checkDate).toDate()
    }));
  }

  /***
   * 标签的具体内容
   * @param id
   * @param code
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
  async markContent(id, code) {
    return originalDB.execute(
      `select * from mark_content where id=? and name=?`,
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
    return originalDB.execute(
      `
       select
     vq.QuestionnaireMainSN as "id",
     vp.name,
     vq.questionnairemaindate as "date",
     vq.doctorname as "doctor",
     vh.hospname as "hospitalName"
     from view_questionnairemain vq
     left join view_personinfo vp on vq.personnum = vp.personnum
     left join view_hospital vh on vp.operateorganization = vh.hospid
     where vp.personnum=?;`,
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
   *      score:        选项分数
   *      secondScore:  选项反向分数
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
    const questionnaire = (
      await originalDB.execute(
        `select
            cast(vb.questioncode as int) as "questionCode",
            vb.questioncode as "questionCode",
            vqd.questionnairemainsn as "detailId",
            vqd.questionnairedetailcontent as "question",
            vq.optioncontent as "option",
            vq.optioncode as "optionCode",
            vq.score
            from view_questionnairedetail vqd
            inner join view_questionoptionslib vq on
            cast(vqd.optionsn as int) = cast(vq.optionsn as int)
            inner join view_questionlib vb on
                vb.questionsn = vq.questionsn
            where vqd.QuestionnaireMainSN = ?
        order by cast(vb.questioncode as int)`,
        id
      )
    ).reduce((res, next) => {
      let current = res.find(it => it.questionCode === next.questionCode);
      if (current) {
        //正向分数排在前面
        if (current.optionCode === current.score.toString()) {
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
          `
        select vp.name from view_questionnairedetail vqd
            left join view_questionnairemain vm on
            cast(vm.questionnairemainsn as varchar) = cast(vqd.questionnairemainsn as varchar)
            right join view_personinfo vp on vm.personnum = vp.personnum
        where vqd.questionnairemainsn = ? limit 1;`,
          id
        )
      )[0]?.name ?? '';
    //体质结果
    const constitution =
      (
        await originalDB.execute(
          `select
            vp.name,
            vq.constitutiontype,
            vq.constitutiontypepossible,
            vq.OperateTime as "date",
            vh.hospname as "hospitalName",
            vq.doctor
            from view_questionnaireguide  vq
            left join view_personinfo vp on vq.personnum = vp.personnum
            left join view_hospital vh on vp.operateorganization = vh.hospid
            where vq.questionnairemainsn = ?`,
          questionnaire[0]?.detailId
        )
      )[0] ?? [];
    //TODO 指定建议暂时无数据
    constitution.guide = '';
    return {name, questionnaire, constitution};
  }
}
