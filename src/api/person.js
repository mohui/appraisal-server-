import {etlDB} from '../app';
import {QueryTypes} from 'sequelize';
import {KatoCommonError, should, validate} from 'kato-server';
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
             inner join view_personinfo vp on mp.personnum = vp.personnum
             inner join view_hospital vh on vp.adminorganization = vh.hospid
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
  @validate(
    should.object({
      pageSize: should.number().required(),
      pageNo: should.number().required(),
      name: should.string().allow('', null),
      hospital: should
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
      include: should.boolean().description('是否包含查询下级机构的个人档案')
    })
  )
  async list(params) {
    const {pageSize, pageNo, hospital, idCard, tags, include} = params;
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
    if (include && hospital)
      hospitals = (
        await Promise.all(
          hospitals.map(item =>
            //查询机构的下属机构
            etlQuery(
              `select hospid as id from view_hospital where hos_hospid = ?`,
              [item]
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
    return etlQuery(
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
        vc_mental.codename as "mental",
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
       where vh.highbloodid=?`,
      [id]
    );
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
  diabetesDetail(id) {
    return etlQuery(
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
        vd.CheckTime as "checkTime",
        vd.MedicationAdherence as "medicationAdherence",
        vd.Blfy as "adverseReactions",
        vd.BlfyOther as "adverseReactionsExplain",
        vd.LowBlood as "lowBloodReaction",
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
        left join view_codedictionary vc_mental on vc_mental.categoryno='331' and vc_mental.code = vd.MentalSet  --TODO:字典数据里的code不带0, vd记录的带0
        left join view_codedictionary vc_doctor_s on vc_doctor_s.categoryno='332' and vc_doctor_s.code = vd.DoctorStatue
        left join view_codedictionary vc_ma on vc_ma.categoryno='181' and vc_ma.code = vd.MedicationAdherence
        left join view_codedictionary vc_vc on vc_vc.categoryno='7010106' and vc_vc.code = vd.VisitClass
        left join view_codedictionary vc_arterial on vc_arterial.categoryno='7152' and vc_arterial.code = vd.arterial
        where DiabetesFollowUpID=?`,
      [id]
    );
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
          vh.incrementno as "id",
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

  /**
   * 获取体检表详情
   * gender: 性别
   * checkupNo: 体检编号
   * IDCard: 身份证
   * stature: 身高
   * weight: 体重
   * temperature: 体温
   * symptom: 症状
   * bc_abnormal: B超说明
   * marrage: 婚姻状态
   * professionType: 职业种类
   * pulse:脉率
   * breathe:呼吸频率
   * leftDiastolicPressure: 左侧舒张压
   * leftSystolicPressure: 左侧收缩压
   * rightDiastolicPressure: 右侧舒张压
   * rightSystolicPressure: 右侧收缩压
   * waistline: 腰围
   * oldManHealthSelf: 老年人健康状态自我评估
   * oldManLifeSelf: 老年人生活自理能力自我评估
   * oldManCognitiveSelf: 老年人认知功能
   * oldManCognitiveSelf: 老年人认知功能
   * cognitiveScore: 简易智力状态检查
   * oldManEmotion: 老年人情感状态
   * EmotionalScore: 老年人抑郁评分检查
   * 锻炼评率
   * 每次锻炼时间
   * 坚持锻炼时间
   * 锻炼方式
   * 饮食习惯
   * 吸烟史
   * 吸烟量
   * 开始吸烟时间
   * 戒烟年龄
   * 饮酒频率
   * 日饮酒量
   * 开始饮酒时间
   * 是否戒酒
   * 开始戒酒时间
   * 近一年内是否曾醉酒
   * 主要饮酒品种
   * 职业暴露情况
   * 具体职业
   * 从业时间
   * 粉尘
   * 粉尘防护措施
   * 粉尘防护措施说明
   * 物理原因
   * 物理原因防护措施
   * 物理原因防护措施说明
   * 化学物质
   * 化学物质防护措施
   * 化学物质防护措施说明
   * 放射物质
   * 放射物质防护措施
   * 放射物质防护措施说明
   * 其他（健康辅助检查）
   * 其他防护措施
   * 其他防护措施说明
   * 口唇
   * 咽部
   * 齿列情况
   * 缺齿（上左）
   * 缺齿（上右）
   * 缺齿（下左）
   * 缺齿（下右）
   * 龋齿（上左）
   * 龋齿（上右）
   * 龋齿（下左）
   * 龋齿（下右）
   * 义齿（上左）
   * 义齿（上右）
   * 义齿（下左）
   * 义齿（下右）
   * 视力（左眼）
   * 视力（右眼）
   * 矫正视力（左眼）
   * 矫正视力（右眼）
   * 听力
   * 运动功能
   * 眼底状态
   * 眼底说明
   * 皮肤状态
   * 皮肤说明
   * 巩膜状态
   * 巩膜说明
   * 淋巴结状态
   * 淋巴结说明
   * 桶状胸
   * 呼吸音状态
   * 呼吸音说明
   * 罗音状态
   * 罗音说明
   * 心率
   * 心律
   * 杂音状态
   * 杂音说明
   * 腹部压痛状态
   * 腹部压痛说明
   * 腹部包块状态
   * 腹部包块说明
   * 腹部肝大状态
   * 腹部肝大说明
   * 腹部脾大状态
   * 腹部脾大说明
   * 腹部移动性浊音状态
   * 腹部移动性浊音说明
   * 下肢水肿
   * 肛门指诊状态
   * 足背动脉搏动
   * 乳腺
   * 外阴状态
   * 外阴说明
   * 阴道状态
   * 阴道说明
   * 宫颈状态
   * 宫颈说明
   * 宫体状态
   * 宫体说明
   * 附件状态
   * 附件说明
   * 查体其他
   * 血红蛋白
   * 白细胞
   * 血小板
   * 其他
   * 尿蛋白
   * 尿糖
   * 尿酮体
   * 尿潜血
   * 其他
   * 尿微量白蛋白
   * 尿白细胞
   * 大便潜血
   * 心电图状态
   * 心电图说明
   * HBsAg
   * 空腹血糖
   * 餐后血糖
   * 糖化血红蛋白
   * 血清谷丙转氨酶
   * 血清谷草转氨酶
   * 白蛋白
   * 总胆红素
   * 结合胆红素
   * 血清肌酐
   * 血尿素氮
   * 血钾浓度
   * 血钠浓度
   * 血尿酸
   * 总胆固醇
   * 甘油三酯
   * 血清低密度蛋白胆固醇
   * 血清高密度蛋白胆固醇
   * 胸片状态
   * 胸片说明
   * B超状态
   * B超说明
   * 宫颈涂片状态
   * 宫颈涂片说明
   * 其他
   * 脑血管疾病
   * 肾脏疾病
   * 心脏疾病
   * 血管疾病
   * 眼部疾病
   * 神经系统疾病状态
   * 神经系统疾病说明
   * 其他系统疾病状态
   * 其他系统疾病说明
   * 住院1住院时间
   * 住院1出院时间
   * 住院1原因
   * 住院1医疗结构名称
   * 住院1病案号
   * 住院2住院时间
   * 住院2出院时间
   * 住院2原因
   * 住院2医疗结构名称
   * 住院2病案号
   * 家族病床史1建床时间
   * 家族病床史1撤床时间
   * 家族病床史1原因
   * 家族病床史1医疗机构名称
   * 家族病床史1病案号
   * 家族病床史2建床时间
   * 家族病床史2撤床时间
   * 家族病床史2原因
   * 家族病床史2医疗机构名称
   * 家族病床史2病案号
   * 药物1名称
   * 药物1用法
   * 药物1用量
   * 药物1用药时间
   * 药物1服药依从性
   * 药物2名称
   * 药物2用法
   * 药物2用量
   * 药物2用药时间
   * 药物2服药依从性
   * 药物3名称
   * 药物3用法
   * 药物3用量
   * 药物3用药时间
   * 药物3服药依从性
   * 药物4名称
   * 药物4用法
   * 药物4用量
   * 药物4用药时间
   * 药物4服药依从性
   * 药物5名称
   * 药物5用法
   * 药物5用量
   * 药物5用药时间
   * 药物5服药依从性
   * 药物6名称
   * 药物6用法
   * 药物6用量
   * 药物6用药时间
   * 药物6服药依从性
   * 疫苗1名称
   * 疫苗1接种日期
   * 疫苗1接种机构
   * 疫苗2名称
   * 疫苗2接种日期
   * 疫苗2接种机构
   * 疫苗3名称
   * 疫苗3接种日期
   * 疫苗3接种机构
   * 健康评价状态
   * 健康评价异常1
   * 健康评价异常2
   * 健康评价异常3
   * 健康评价异常4
   * 健康指导
   * 危险因素控制
   * 录入机构
   *
   * updateAt: 更新时间
   * @param id 体检表id
   */
  async healthyDetail(id) {
    return etlQuery(
      `
        select
          vh.incrementno as "id",
          vh.checkupNo as "checkupNo",
          vh.IDCardNo as "IDCard",
          vh.sex as "gender",
          vh.stature as "stature",
          vh.weight as "weight",
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
          vh.sx as "radiogen",
          vh.sxfhcs as "radiogenProtection",
          vh.sxfhcs_other as "radiogenProtectionExplain",
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
          vh.pf_Other as "pf_Other", --TODO: 字段补充先写到这里, 太多了 下次再补
          vh.gm as "gm",
          vh.gm_Other as "gm_Other",
          vh.lbj as "lbj",
          vh.lbjOther as "lbjOther",
          vh.ftzx as "ftzx",
          vh.fhxy as "fhxy",
          vh.fhxyyc as "fhxyyc",
          vh.fly as "fly",
          vh.flyOther as "flyOther",
          vh.xzxn as "xzxn",
          vh.xzxl as "xzxl",
          vh.xzzy as "xzzy",
          vh.xzzyOther as "xzzyOther",
          vh.fbyt as "fbyt",
          vh.fbytOther as "fbytOther",
          vh.fbbk as "fbbk",
          vh.fbbkOther as "fbbkOther",
          vh.fbgd as "fbgd",
          vh.fbgdOther as "fbgdOther",
          vh.fbpd as "fbpd",
          vh.fbpdOther as "fbpdOther",
          vh.fbydxzy as "fbydxzy",
          vh.fbydxzyOther as "fbydxzyOther",
          vh.xzsz as "xzsz",
          vh.gmzz as "gmzz",
          vh.tnbzbdmbd as "tnbzbdmbd",
          vh.rx as "rx",
          vh.fk_wy as "fk_wy",
          vh.fk_wy_abnormal as "fk_wy_abnormal",
          vh.fk_yd as "fk_yd",
          vh.fk_yd_abnormal as "fk_yd_abnormal",
          vh.fk_gj as "fk_gj",
          vh.fk_gj_abnormal as "fk_gj_abnormal",
          vh.fk_gt as "fk_gt",
          vh.fk_gt_abnormal as "fk_gt_abnormal",
          vh.fk_fj as "fk_fj",
          vh.fk_fj_abnormal as "fk_fj_abnormal",
          vh.ctqt as "ctqt",
          vh.xcgHb as "xcgHb",
          vh.xcgWBC as "xcgWBC",
          vh.xcgPLT as "xcgPLT",
          vh.xcgqt as "xcgqt",
          vh.ncgndb as "ncgndb",
          vh.ncgnt as "ncgnt",
          vh.ncgntt as "ncgntt",
          vh.ncgnqx as "ncgnqx",
          vh.ncgOther as "ncgOther",
          vh.nwlbdb as "nwlbdb",
          vh.LEU as "LEU",
          vh.dbqx as "dbqx",
          vh.xdt as "xdt",
          vh.xdt_abnormal as "xdt_abnormal",
          vh.HBsAg as "HBsAg",
          vh.suijxt as "suijxt",
          vh.kfxt as "kfxt",
          vh.tnbthxhdb as "tnbthxhdb",
          vh.ggnALT as "ggnALT",
          vh.ggnAST as "ggnAST",
          vh.ggnALB as "ggnALB",
          vh.ggnTBIL as "ggnTBIL",
          vh.ggnDBIL as "ggnDBIL",
          vh.sgnScr as "sgnScr",
          vh.sgnBUN as "sgnBUN",
          vh.sgnxjnd as "sgnxjnd",
          vh.sgnxnnd as "sgnxnnd",
          vh.BUA as "BUA",
          vh.xzCHO as "xzCHO",
          vh.xzTG as "xzTG",
          vh.xzLDLC as "xzLDLC",
          vh.xzHDLC as "xzHDLC",
          vh.xp as "xp",
          vh.xp_abnormal as "xp_abnormal",
          vh.bc as "bc",
          vh.bc_abnormal as "bc_abnormal",
          vh.gjtp as "gjtp",
          vh.gjtp_abnormal as "gjtp_abnormal",
          vh.jkfzjcqt as "jkfzjcqt",
          vh.nxgjb as "nxgjb",
          vh.szjb as "szjb",
          vh.xzjb as "xzjb",
          vh.xgjb as "xgjb",
          vh.ybjb as "ybjb",
          vh.sjxt as "sjxt",
          vh.sjxt_other as "sjxt_other",
          vh.qtxt as "qtxt",
          vh.otherDisease1 as "otherDisease1",
          vh.ruyTime1 as "ruyTime1",
          vh.chuyTime1 as "chuyTime1",
          vh.zhuyReason1 as "zhuyReason1",
          vh.hospName1 as "hospName1",
          vh.bah1 as "bah1",
          vh.ruyTime2 as "ruyTime2",
          vh.chuyTime2 as "chuyTime2",
          vh.HospName2 as "HospName2",
          vh.bah2 as "bah2",
          vh.jcTime1 as "jcTime1",
          vh.ccTime1 as "ccTime1",
          vh.jcyy1 as "jcyy1",
          vh.jcyljgmc1 as "jcyljgmc1",
          vh.jcbah1 as "jcbah1",
          vh.jcTime2 as "jcTime2",
          vh.ccTime2 as "ccTime2",
          vh.jcyy2 as "jcyy2",
          vh.jcyljgmc2 as "jcyljgmc2",
          vh.jcbah2 as "jcbah2",
          vh.yaowu1 as "yaowu1",
          vh.yf1 as "yf1",
          vh.yl1 as "yl1",
          vh.yysj1 as "yysj1",
          vh.fyycx as "fyycx",
          vh.yaowu2 as "yaowu2",
          vh.yf2 as "yf2",
          vh.yl2 as "yl2",
          vh.yysj2 as "yysj2",
          vh.fyycx2 as "fyycx2",
          vh.yaowu3 as "yaowu3",
          vh.yf3 as "yf3",
          vh.yl3 as "yl3",
          vh.yysj3 as "yysj3",
          vh.fyycx3 as "fyycx3",
          vh.yaowu4 as "yaowu4",
          vh.yf4 as "yf4",
          vh.yl4 as "yl4",
          vh.yysj4 as "yysj4",
          vh.fyycx4 as "fyycx4",
          vh.yaowu5 as "yaowu5",
          vh.yf5 as "yf5",
          vh.yl5 as "yl5",
          vh.yysj5 as "yysj5",
          vh.fyycx5 as "fyycx5",
          vh.yaowu6 as "yaowu6",
          vh.yf6 as "yf6",
          vh.yl6 as "yl6",
          vh.yysj6 as "yysj6",
          vh.fyycx6 as "fyycx6",
          vh.fmy_mc1 as "fmy_mc1",
          vh.fmy_jzrq1 as "fmy_jzrq1",
          vh.fmy_jzjg1 as "fmy_jzjg1",
          vh.fmy_mc2 as "fmy_mc2",
          vh.fmy_jzrq2 as "fmy_jzrq2",
          vh.fmy_jzjg2 as "fmy_jzjg2",
          vh.fmy_mc3 as "fmy_mc3",
          vh.fmy_jzrq3 as "fmy_jzrq3",
          vh.fmy_jzjg3 as "fmy_jzjg3",
          vh.jkpjywyc as "jkpjywyc",
          vh.yichang1 as "yichang1",
          vh.yichang2 as "yichang2",
          vh.yichang3 as "yichang3",
          vh.yichang4 as "yichang4",
          vh.jkzd_dqsf as "jkzd_dqsf",
          vh.jkzd_wxyskz as "jkzd_wxyskz",
          vh.OperateOrganization as "OperateOrganization",
          vh.operatetime as "updateAt"
        from view_healthy vh
        where vh.incrementno = ?
        order by vh.operatetime desc
       `,
      [id]
    );
  }
}
