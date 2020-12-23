import * as dayjs from 'dayjs';
import {KatoCommonError, should, validate} from 'kato-server';
import {HospitalModel, RegionModel} from '../../database/model';
import {sql as sqlRender} from '../../database/template';
import {appDB, originalDB} from '../../app';
import {Decimal} from 'decimal.js';
import {Projects} from '../../../common/project';
import {getGroupTree} from '../group';
import {Context} from '../context';

/**
 * 获取机构id
 *
 * @param code
 */
async function getHospital(code) {
  // 先校验权限是否合法
  const area = await appDB.execute(
    `
            select "code"
            from "area"
            where code = ?`,
    code
  );
  if (area.length < 1) return [];

  // 根据权限查询所有机构
  let hospitalIds = await appDB.execute(
    `
        select mapping.hishospid as id
        from hospital
        left join hospital_mapping mapping on hospital.id = mapping.h_id
        where hospital.region like '${code}%'
        `,
    code
  );
  if (hospitalIds.length === 0) {
    hospitalIds = await appDB.execute(
      `
        select mapping.hishospid as id
        from hospital
        left join hospital_mapping mapping on hospital.id = mapping.h_id
        where hospital.id = '${code}'
        `,
      code
    );
  }
  return hospitalIds.map(it => it.id);
}
export default class SystemArea {
  /**
   * 质量系数,公分值
   * @param date
   * @param code
   * @param checkId
   *
   * return score: 校正后, originalScore:参与校正工分, originalWorkPoint: 校正前总公分 rate: 质量系数
   */
  async total(code, checkId) {
    // 获取权限下所有机构id
    // 根据地区id获取机构id列表
    const hisHospIds = await getHospital(code);
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    const regionModel: RegionModel = await RegionModel.findOne({where: {code}});
    let hospitalModel;
    if (!regionModel)
      hospitalModel = await HospitalModel.findOne({
        where: {id: code}
      });

    if (regionModel || hospitalModel) {
      if (
        hospitalModel &&
        Context.current.user.hospitals.filter(i => i.id === code).length < 1
      )
        throw new KatoCommonError('未经授权的机构不允许查看');

      let [sql, params] = sqlRender(
        `
        select
            COALESCE(sum("correctWorkPoint"),0) as "score",
            COALESCE(sum("workPoint"),0) as "originalScore",
            COALESCE(sum("ruleScore"),0) as "ruleScore",
            COALESCE(sum("ruleTotalScore"),0) as "total",
            COALESCE(sum(rhb.budget),0) as "budget"
            {{#if regionId}}{{else}},max(hm.hishospid) hishospid{{/if}}
        from rule_hospital_budget rhb
        {{#if regionId}}
            inner join hospital h on h.id=rhb.hospital
        {{else}}
            inner join hospital_mapping hm on hm.h_id=rhb.hospital
        {{/if}}
        inner join check_rule cr on cr.rule_id=rhb.rule and cr.parent_rule_id is null
        inner join check_system cs on cs.check_id=cr.check_id
        {{#if checkType}} and cs.check_type={{? checkType}}{{/if}}
        {{#if checkId}} and cs.check_id={{? checkId}}{{/if}}
        inner join check_hospital ch on ch.hospital=rhb.hospital and ch.check_system=cs.check_id
        where rhb.hospital in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        {{#if regionId}} and position({{? regionId}} in h.region)=1{{/if}}`,
        {
          hospitalIds: hospitalModel
            ? [code]
            : Context.current.user.hospitals.map(it => it.id),
          regionId: regionModel ? code : null,
          checkType: checkId ? null : 1,
          checkId
        }
      );
      // return await appDB.execute(sql, ...params);
      const resultObject = (await appDB.execute(sql, ...params))[0];

      [sql, params] = sqlRender(
        `
          select cast(sum(score) as int) as scores
          from view_workscoretotal
          where operateorganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
          and missiontime >= {{? startTime}}
          and missiontime < {{? endTime}}
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

      const originalWorkPoints =
        (await originalDB.execute(sql, ...params))[0]?.scores ?? 0;

      if (regionModel) {
        return {
          id: regionModel.code,
          name: regionModel.name,
          score: Number(resultObject.score),
          originalScore: Number(resultObject.originalScore),
          rate: new Decimal(Number(resultObject.ruleScore))
            .div(Number(resultObject.total))
            .toNumber(),
          originalWorkPoint: originalWorkPoints
        };
      }
      if (hospitalModel) {
        return {
          id: hospitalModel.id,
          name: hospitalModel.name,
          score: Number(resultObject.score),
          originalScore: Number(resultObject.originalScore),
          rate: new Decimal(Number(resultObject.ruleScore))
            .div(Number(resultObject.total))
            .toNumber(),
          budget: Number(resultObject.budget),
          originalWorkPoint: originalWorkPoints
        };
      }
    }

    throw new KatoCommonError(`${code} 不存在`);

    return {
      id: '3402',
      name: '芜湖市',
      score: 40075986.859490514,
      originalScore: 54104423,
      rate: 0.7599249148753182,
      budget: 0,
      originalWorkPoint: 1407334
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
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async signRegister(code) {
    // 根据地区id获取机构id列表
    const hisHospIds = await getHospital(code);
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

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

  /**
   * 监督协管报告
   *
   * @param hospitalId
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async supervisionReport(code) {
    // 根据地区id获取机构id列表
    const hisHospIds = await getHospital(code);
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');
    const sql = sqlRender(
      `
        select
            institutionname as "InstitutionName",
            address as "Address",
            Contents as "Contents",
            ReportTime as "Date"
        from view_SanitaryControlReport
        where OperateOrganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
        and ReportTime>={{? start}} and ReportTime<{{? end}}
        order by ReportTime desc
      `,
      {
        hisHospIds,
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
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async supervisionAssist(code) {
    // 根据地区id获取机构id列表
    const hisHospIds = await getHospital(code);
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    const [sql, params] = sqlRender(
      `
    select
        institutionname as "InstitutionName",
        address as "Address",
        checkDate as "Date"
    from view_SanitaryControlAssist
    where OperateOrganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
    and checkDate>={{? start}} and checkDate<{{? end}}
    order by checkDate desc
    `,
      {
        hisHospIds,
        start: dayjs()
          .startOf('y')
          .toDate(),
        end: dayjs()
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    return await originalDB.execute(sql, ...params);
  }

  // 健康教育
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async healthEducation(code) {
    // 根据地区id获取机构id列表
    const hisHospIds = await getHospital(code);
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    const [sql, params] = sqlRender(
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
        where vhe.OperateOrganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
          and vhe.ActivityTime >= {{? startTime}}
          and vhe.ActivityTime < {{? endTime}}
          and vhe.State = 1
        order by vhe.ActivityTime desc
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

    const data = await originalDB.execute(sql, ...params);
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
   * 公分列表[地区工分]
   *
   * 可能存在问题,自己就是最底层的时候
   * @param code
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async workpointsArea(code) {
    // 获取树形结构
    const tree = await getGroupTree(code);
    // 找到所有的子节点
    const hospitals = tree.filter(it => it.cycle === true);
    return tree;
    // 查找出所有的下级权限
    const treeChildren = tree.filter(it => it.parent === code);
    // if (treeChildren.length === 0)
    // return treeChildren;
    // 根据地区id获取机构id列表
    const hisHospIds = await getHospital(code);
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    const [sql, params] = sqlRender(
      `
            select
                cast(sum(vws.score) as int) as score,
                vws.operateorganization,
                vws.operatorid as doctorId,
                vws.doctor as doctorName,
                vws.projecttype as "projectId"
            from view_workscoretotal vws
            where vws.operateorganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
             and missiontime >= {{? startTime}}
             and missiontime < {{? endTime}}
             group by vws.operatorid, vws.doctor,vws.projecttype, vws.operateorganization
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

    // 执行SQL语句
    const workPoint = await originalDB.execute(sql, ...params);
    return workPoint;
  }

  // 公分列表[医生工分, 工分项目]
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async workpointsProject(code) {
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
}
