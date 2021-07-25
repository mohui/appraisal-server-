import {sql as sqlRender} from '../database';
import {KatoCommonError} from 'kato-server';
import {appDB, originalDB} from '../app';
import * as dayjs from 'dayjs';

export default class Hospital {
  async healthEducation(hospitalId) {
    const hisHospId =
      (
        await appDB.execute(
          `select hishospid as id
           from hospital_mapping
           where h_id = ?`,
          hospitalId
        )
      )[0]?.id ?? null;
    const data = await originalDB.execute(
      //language=MySQL
      `
        SELECT vhe.ActivityFormCode as "ActivityFormCode",
               vhe.PrintDataName    as "PrintDataName",
               vhe.ActivityName     as "ActivityName",
               vcd.CodeName         as "CodeName",
               vcd.CodeName         as "ActivityFormName",
               vhe.ActivityTime     as "ActivityTime"
        FROM view_HealthEducation vhe
               LEFT JOIN view_CodeDictionary vcd ON vcd.Code = vhe.ActivityFormCode
          AND vcd.CategoryNo = '270105'
        where vhe.OperateOrganization = ?
          and vhe.ActivityTime >= ?
          and vhe.ActivityTime < ?
          and vhe.State = 1
        order by vhe.ActivityTime desc
      `,
      hisHospId,
      dayjs()
        .startOf('y')
        .toDate(),
      dayjs()
        .startOf('y')
        .add(1, 'y')
        .toDate()
    );
    return data.map(i => ({
      ActivityName:
        i.ActivityFormCode === '1' || i.ActivityFormCode === '2'
          ? i.PrintDataName
          : i.ActivityFormCode === '3' ||
            i.ActivityFormCode === '4' ||
            i.ActivityFormCode === '5'
          ? i.ActivityName
          : i.ActivityName ?? i.PrintDataName ?? i.CodeName ?? null,
      ActivityFormName: i.ActivityFormName,
      ActivityTime: i.ActivityTime
    }));
  }

  /**
   * 监督协管报告
   *
   * @param hospitalId
   */
  async supervisionReport(hospitalId) {
    const hisHospId =
      (
        await appDB.execute(
          `
            select hishospid as id
            from hospital_mapping
            where h_id = ?`,
          hospitalId
        )
      )[0]?.id ?? null;
    const sql = sqlRender(
      `
    select
        institutionname as "InstitutionName",
        address as "Address",
        Contents as "Contents",
        ReportTime as "Date"
    from view_SanitaryControlReport
    where OperateOrganization={{? hisHospId}}
    and ReportTime>={{? start}} and ReportTime<{{? end}}
    order by ReportTime desc
    `,
      {
        hisHospId,
        start: dayjs()
          .startOf('y')
          .toDate(),
        end: dayjs()
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    return await originalDB.execute(sql[0], ...sql[1]);
  }

  /**
   * 监督协管巡查
   *
   * @param hospitalId
   */
  async supervisionAssist(hospitalId) {
    const hisHospId =
      (
        await appDB.execute(
          `
            select hishospid as id
            from hospital_mapping
            where h_id = ?`,
          hospitalId
        )
      )[0]?.id ?? null;
    const sql = sqlRender(
      `
    select
        institutionname as "InstitutionName",
        address as "Address",
        checkDate as "Date"
    from view_SanitaryControlAssist
    where OperateOrganization={{? hisHospId}}
    and checkDate>={{? start}} and checkDate<{{? end}}
    order by checkDate desc
    `,
      {
        hisHospId,
        start: dayjs()
          .startOf('y')
          .toDate(),
        end: dayjs()
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    return await originalDB.execute(sql[0], ...sql[1]);
  }

  /**
   * 家庭签约
   *
   * @param hospitalId
   * @return {
   * signedNumber: number, //签约人数
   * exeNumber: number, //履约人数
   * renewNumber: number //续约人数
   * }
   */
  async signRegister(hospitalId) {
    const hisHospId = (
      await appDB.execute(
        // language=PostgreSQL
        `
          select hishospid as id
          from hospital_mapping
          where h_id = ?`,
        hospitalId
      )
    )[0]?.id;
    if (!hisHospId) throw new KatoCommonError('机构id不合法');

    // 签约人数
    const signedNumber =
      (
        await originalDB.execute(
          //language=PostgreSQL
          `
            select count(distinct vsr.personnum) as "Number"
            from view_SignRegiste vsr
                   inner join view_PersonInfo vp on vp.PersonNum = vsr.PersonNum
            where vp.AdminOrganization = ?
              and vp.WriteOff = false
              and vsr.YearDegree = ?
          `,
          hisHospId,
          dayjs().year()
        )
      )[0]?.Number ?? 0;
    // 履约人数
    const exeNumber =
      (
        await originalDB.execute(
          //language=PostgreSQL
          `
            select count(distinct vsr.PersonNum) as "Number"
            from view_SignRegisteCheckMain vsrcm
                   inner join view_SignRegiste vsr on vsr.RegisterID = vsrcm.RegisterID
            where vsrcm.ExeOrganization = ?
              and vsrcm.ExeTime >= ?
              and vsrcm.ExeTime < ?
          `,
          hisHospId,
          dayjs()
            .startOf('y')
            .toDate(),
          dayjs()
            .startOf('y')
            .add(1, 'y')
            .toDate()
        )
      )[0]?.Number ?? 0;
    // 续约人数
    const renewNumber =
      (
        await originalDB.execute(
          //language=PostgreSQL
          `
            select count(distinct vsr.PersonNum) as "Number"
            from view_SignRegiste vsr
                   inner join view_SignRegiste a on a.PersonNum = vsr.PersonNum and a.YearDegree = ?
                   inner join view_PersonInfo vp on vp.PersonNum = vsr.PersonNum
            where vp.AdminOrganization = ?
              and vp.WriteOff = false
              and vsr.YearDegree = ?
          `,
          dayjs()
            .add(-1, 'y')
            .year(),
          hisHospId,
          dayjs().year()
        )
      )[0]?.Number ?? 0;
    return {
      signedNumber: Number(signedNumber),
      exeNumber: Number(exeNumber),
      renewNumber: Number(renewNumber)
    };
  }
}
