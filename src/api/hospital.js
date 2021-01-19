import {
  CheckRuleModel,
  HospitalModel,
  RegionModel,
  RuleHospitalModel,
  sql as sqlRender
} from '../database';
import {KatoCommonError, should, validate} from 'kato-server';
import {appDB, originalDB} from '../app';
import {Op} from 'sequelize';
import {Context} from './context';
import * as dayjs from 'dayjs';
import {Projects} from '../../common/project';

export default class Hospital {
  @validate(
    should
      .string()
      .required()
      .description('父级机构的id')
  )
  async list(parent) {
    return HospitalModel.findAll({
      attributes: {
        exclude: ['deleted_at']
      },
      where: {parent},
      paranoid: false,
      include: {
        model: RegionModel,
        paranoid: false,
        attributes: {
          exclude: ['deleted_at']
        }
      }
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('考核系统id'),
    should
      .boolean()
      .required()
      .description('是否自动打分,true false')
  )
  async setAllRuleAuto(checkId, isAuto) {
    //该考核系统下所有的细则
    const allRules = await CheckRuleModel.findAll({
      where: {checkId, parentRuleId: {[Op.not]: null}}
    });
    //当前用户所拥有的机构权限
    const hospitals = Context.current.user.hospitals.map(h => h.id);

    //用户拥有的机构和对应的规则关系
    const ruleHospital = (
      await Promise.all(
        allRules.map(
          async rule =>
            await RuleHospitalModel.findAll({
              where: {ruleId: rule.ruleId, hospitalId: {[Op.in]: hospitals}}
            })
        )
      )
    ).reduce((per, next) => per.concat(next), []);
    if (ruleHospital.length === 0)
      throw new KatoCommonError('该考核没有关联的机构可设置');
    //批量修改自动打分选项
    await Promise.all(
      ruleHospital.map(async item => {
        item.auto = isAuto;
        await item.save();
      })
    );
  }

  async workpoints(code) {
    const hospitalMapping = await appDB.execute(
      `select hishospid as id
            from hospital_mapping mapping
            where h_id = ?`,
      code
    );

    // 查询所属his
    const hospital = await HospitalModel.findOne({
      where: {id: code}
    });
    if (!hospital) throw new KatoCommonError(`code为 ${code} 的机构不存在`);

    const hisHospitalId = hospitalMapping[0]?.id;
    const type = hospital?.his;

    return (
      await originalDB.execute(
        `select cast(sum(vws.score) as int) as score,
              vws.operatorid as doctorId,
              vws.doctor as doctorName,
              vws.projecttype as "projectId"
           from view_workscoretotal vws
           where vws.operateorganization = ?
             and missiontime >= ?
             and missiontime < ?
         group by vws.operatorid, vws.doctor,vws.projecttype`,
        hisHospitalId,
        dayjs()
          .startOf('y')
          .toDate(),
        dayjs()
          .startOf('y')
          .add(1, 'y')
          .toDate()
      )
    ).map(it => ({
      ...it,
      name: Projects.find(p => {
        return p.mappings.find(
          mapping => mapping.id === it.projectId && mapping.type === type
        );
      })?.name
    }));
  }

  /***
   * 机构信息
   * @param id
   */
  async info(id) {
    return HospitalModel.findOne({where: {id}});
  }

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
