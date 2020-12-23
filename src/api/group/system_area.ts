import * as dayjs from 'dayjs';
import {KatoCommonError, should, validate} from 'kato-server';
import {HospitalModel, RegionModel} from '../../database/model';
import {sql as sqlRender} from '../../database/template';
import {appDB, originalDB} from '../../app';
import {Decimal} from 'decimal.js';

/**
 * 获取机构id
 *
 * @param code
 */
async function getHospital(code) {
  const hospitalIds = await appDB.execute(
    `
        select mapping.hishospid as id
        from hospital
        left join hospital_mapping mapping on hospital.id = mapping.h_id
        where hospital.region like '${code}%'
        or hospital.id = '${code}'
        `,
    code
  );
  return hospitalIds.map(it => it.id);
}
export default class SystemArea {
  /**
   * 质量系数,公分值
   * @param date
   * @param code
   * @param checkId
   */
  async total(date, code, checkId) {
    return {
      id: '3402',
      name: '芜湖市',
      score: 40075986.859490514,
      originalScore: 54104423,
      rate: 0.7599249148753182
    };
  }

  /**
   * 获取省市排行
   *
   * @param code group code
   * @param checkId 考核体系id
   */
  async rank(date, code, checkId) {
    if (!date) date = dayjs().format('YYYY');
    return [
      {
        code: '3402',
        name: '芜湖市',
        level: 2,
        parent: '34',
        budget: '0.0000',
        id: '3402',
        score: 40075986.8594905,
        originalScore: 54104423,
        rate: 0.7599249148753187
      }
    ];
  }

  /**
   * 历史记录
   *
   * @param code
   * @param checkId
   */
  async history(code, checkId) {
    return [
      {
        date: '2020-11-16',
        totalScore: 124915,
        score: 52363.202326572726,
        rate: 0.41919066826700335
      },
      {
        date: '2020-11-17',
        totalScore: 124915,
        score: 52363.202326572726,
        rate: 0.41919066826700335
      }
    ];
  }

  /**
   * 人脸采集信息
   *
   * @param code 地区code或机构id
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async faceCollect(code) {
    let faceData = {face: 0, total: 0, rate: 0};
    //如果是一个地区
    const region = await RegionModel.findOne({where: {code}});
    if (region) {
      const sql = sqlRender(
        `select
            coalesce(sum("S00"),0)::integer as "total",
            coalesce(sum("S30"),0)::integer as "face" from mark_organization
            where id::varchar in ({{#each hishospid}}{{? this}}{{#sep}},{{/sep}}{{/each}})`,
        {
          hishospid: (
            await appDB.execute(
              `
                    select hm.hishospid
                    from hospital_mapping hm
                    inner join hospital h on h.id=hm.h_id
                    where h.region like ?`,
              `${code}%`
            )
          ).map(i => i.hishospid)
        }
      );
      faceData = (await originalDB.execute(sql[0], ...sql[1]))[0];
    } else {
      try {
        const hospital = await HospitalModel.findOne({where: {id: code}});
        //如果是一家机构
        if (hospital)
          faceData = (
            await originalDB.execute(
              `select
                coalesce(sum("S00"),0)::integer as "total",
                coalesce(sum("S30"),0)::integer as "face" from mark_organization
                where id=?`,
              (
                await appDB.execute(
                  `select hishospid from hospital_mapping where h_id=?`,
                  code
                )
              )?.[0]?.hishospid
            )
          )[0];
      } catch (e) {
        throw new KatoCommonError('所传参数code,不是地区code或机构id');
      }
    }
    faceData.rate =
      new Decimal(faceData.face).div(faceData.total).toNumber() || 0;
    return faceData;
  }

  /**
   * 家庭签约
   *
   * @param code 地区编码
   * @return {
   * signedNumber: number, //签约人数
   * exeNumber: number, //履约人数
   * renewNumber: number //续约人数
   * }
   */
  async signRegister(code) {
    const group = await appDB.execute(
      `
            select "code"
            from "area"
            where code = ?`,
      code
    );
    if (group.length < 1) throw new KatoCommonError('地区编码不合法');

    const hisHospIds = await getHospital(code);

    if (!hisHospIds) throw new KatoCommonError('机构id不合法');

    let [sql, paramters] = sqlRender(
      `
            select count(distinct vsr.personnum) as "Number"
            from view_SignRegiste vsr
                   inner join view_PersonInfo vp on vp.PersonNum = vsr.PersonNum
            where vp.AdminOrganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
              and vp.WriteOff = false
              and vsr.YearDegree = {{? YearDegree}}
          `,
      {
        hisHospIds,
        YearDegree: dayjs().year()
      }
    );
    // 签约人数
    const signedNumber =
      (await originalDB.execute(sql, ...paramters))[0]?.Number ?? 0;

    // 履约人数
    [sql, paramters] = sqlRender(
      `
            select count(distinct vsr.PersonNum) as "Number"
            from view_SignRegisteCheckMain vsrcm
                   inner join view_SignRegiste vsr on vsr.RegisterID = vsrcm.RegisterID
            where vsrcm.ExeOrganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
              and vsrcm.ExeTime >= {{? startTime}}
              and vsrcm.ExeTime < {{? endTime}}
          `,
      {
        hisHospIds,
        startTime: dayjs()
          .startOf('y')
          .toDate(),
        endTime: dayjs()
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    const exeNumber =
      (await originalDB.execute(sql, ...paramters))[0]?.Number ?? 0;

    // 续约人数
    [sql, paramters] = sqlRender(
      `
            select count(distinct vsr.PersonNum) as "Number"
            from view_SignRegiste vsr
                   inner join view_SignRegiste a on a.PersonNum = vsr.PersonNum and a.YearDegree = {{? YearDegree}}
                   inner join view_PersonInfo vp on vp.PersonNum = vsr.PersonNum
            where vp.AdminOrganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
              and vp.WriteOff = false
              and vsr.YearDegree = {{? vsrYearDegree}}
          `,
      {
        YearDegree: dayjs()
          .add(-1, 'y')
          .year(),
        hisHospIds,
        vsrYearDegree: dayjs().year()
      }
    );
    const renewNumber =
      (await originalDB.execute(sql, ...paramters))[0]?.Number ?? 0;
    return {
      signedNumber: Number(signedNumber),
      exeNumber: Number(exeNumber),
      renewNumber: Number(renewNumber)
    };
  }
}
