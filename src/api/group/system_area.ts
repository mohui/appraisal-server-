import * as dayjs from 'dayjs';
import {KatoCommonError, should, validate} from 'kato-server';
import {
  AreaModel,
  CheckAreaModel,
  CheckSystemModel,
  HospitalModel,
  RegionModel,
  ReportAreaHistoryModel,
  ReportAreaModel
} from '../../database/model';
import {Op} from 'sequelize';
import {sql as sqlRender} from '../../database/template';
import {appDB, originalDB} from '../../app';
import {Decimal} from 'decimal.js';
import {Projects} from '../../../common/project';
import {getAreaTree, getOriginalArray} from '../group';

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

/**
 * 通过地区编码和时间获取checkId
 *
 * @param code
 * @param year
 */
async function yearGetCheckId(code, year) {
  // 如果checkId为空,根据年份和地区获取checkId
  const check = await CheckAreaModel.findOne({
    where: {
      areaCode: code
    },
    attributes: ['checkId'],
    include: [
      {
        model: CheckSystemModel,
        where: {
          checkYear: year
        },
        attributes: []
      }
    ]
  });
  return check?.checkId;
}

export default class SystemArea {
  /**
   * 质量系数,公分值
   *
   * @param code
   * @param year
   *
   * return score: 校正后, originalScore:参与校正工分, originalWorkPoint: 校正前总公分 rate: 质量系数
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should.string().description('考核id'),
    should.string().description('年份')
  )
  async total(code, year) {
    // 查询本级权限
    const areas = await AreaModel.findOne({where: {code}});

    if (areas.length === 0) throw new KatoCommonError(`地区 ${code} 不合法`);

    if (!year) year = dayjs().format('YYYY');

    // 通过地区编码和时间获取checkId
    const checkId = await yearGetCheckId(code, year);

    let reportArea;
    if (checkId) {
      // 查询考核体系
      reportArea = await ReportAreaModel.findOne({
        where: {
          areaCode: code,
          checkId
        }
      });
    }

    return {
      id: areas.code,
      name: areas.name,
      score: reportArea ? Number(reportArea.score) : 0,
      workPoint: reportArea ? Number(reportArea.workPoint) : 0,
      rate: reportArea ? Number(reportArea.rate) : 0,
      totalWorkPoint: reportArea ? Number(reportArea.totalWorkPoint) : 0
    };
  }

  /**
   * 获取省市排行
   *
   * @param code group code
   * @param checkId 考核体系id
   * @param year
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should.string().description('考核id'),
    should.string().description('年份')
  )
  async rank(code, year) {
    // 地区列表
    const areaList = await AreaModel.findAll({
      where: {
        parent: code
      },
      attributes: ['code', 'name']
    });
    if (!year) year = dayjs().format('YYYY');

    // 根据地区和年份获取考核id
    const checkIdLists = await CheckAreaModel.findAll({
      where: {
        areaCode: {
          [Op.in]: areaList.map(it => it.code)
        }
      },
      attributes: ['checkId', 'areaCode'],
      include: [
        {
          model: CheckSystemModel,
          where: {
            checkYear: year
          },
          attributes: []
        }
      ]
    });

    // 查询考核体系
    const reportAreas = await ReportAreaModel.findAll({
      where: {
        areaCode: {
          [Op.in]: areaList.map(it => it.code)
        },
        checkId: {
          [Op.in]: checkIdLists.map(it => it.checkId)
        }
      }
    });
    return areaList.map(it => {
      const item = reportAreas.find(report => report.areaCode === it.code);

      return {
        code: it.code,
        name: it.name,
        budget: item ? item.budget : 0,
        workPoint: item ? item.workPoint : 0,
        totalWorkPoint: item ? item.totalWorkPoint : 0,
        score: item ? item.score : 0,
        rate: item ? item.rate : 0
      };
    });
  }

  /**
   * 历史记录
   *
   * @param code
   * @param checkId
   * @param year
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should.string().description('年份')
  )
  async history(code, year) {
    // 查询本级权限
    const areas = await AreaModel.findOne({where: {code}});

    if (areas.length === 0) throw new KatoCommonError(`地区 ${code} 不合法`);
    if (!year) year = dayjs().format('YYYY');

    // 通过地区编码和时间获取checkId
    const checkId = await yearGetCheckId(code, year);
    if (!checkId) return [];

    // 查询考核体系
    return ReportAreaHistoryModel.findAll({
      order: [['date', 'asc']],
      where: {
        areaCode: code,
        checkId,
        date: {
          [Op.gte]: dayjs(year)
            .startOf('y')
            .toDate(),
          [Op.lt]: dayjs(year)
            .startOf('y')
            .add(1, 'y')
            .toDate()
        }
      },
      attributes: ['date', 'workPoint', 'totalWorkPoint', 'rate', 'score']
    });
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
    const tree = await getAreaTree(code);

    // 权限的下级子节点
    let childrenTree = [];
    // 如果没有查到子节点,可能是机构节点,判断机构节点是否合法
    if (tree.length === 0)
      throw new KatoCommonError(`code 为 ${code} 的地区不存在`);
    else if (tree.length > 1) {
      // 非机构权限, 列表为下级权限 => 找到自己的子节点
      childrenTree = tree
        .map(it => {
          if (it.parent === code) return it;
        })
        .filter(item => item);
    }
    // 找到所有的叶子节点
    const hospitalIds = tree.filter(it => it.leaf === true);

    // 根据机构id获取对应的原始数据id
    const hisHospIdObjs = await getOriginalArray(
      hospitalIds.map(item => item.code)
    );

    const hisHospIds = hisHospIdObjs.map(it => it['id']);

    // 根据地区id获取机构id列表
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    const [sql, params] = sqlRender(
      `
            select
                cast(sum(vws.score) as int) as score,
                vws.operateorganization,
                vws.operatorid as "doctorId",
                vws.doctor as "doctorName"
            from view_workscoretotal vws
            where vws.operateorganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
             and missiontime >= {{? startTime}}
             and missiontime < {{? endTime}}
             group by vws.operatorid, vws.doctor, vws.operateorganization
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
    // 如果是机构级节点, 返回查询结果
    if (childrenTree.length === 0) {
      return workPoint.map(it => {
        return {
          code: it.doctorId,
          name: it.doctorName,
          score: it.score
        };
      });
    }

    // 如果是机构节点之前, 把机构id赋值给查询结果
    const hospitalWorkPoint = workPoint
      .map(it => {
        const hospitalIdObj = hisHospIdObjs.find(
          item => item.id === it.operateorganization
        );
        return {
          ...it,
          hospitalId: hospitalIdObj.code
        };
      })
      .map(it => {
        const index = hospitalIds.find(item => item.code === it.hospitalId);
        return {
          ...it,
          path: index.path
        };
      })
      .map(it => {
        const index = childrenTree.find(item =>
          it.path.find(p => p === item.code)
        );
        return {
          ...it,
          parentCode: index.code,
          parentName: index.name
        };
      });

    const returnPoint = [];
    for (const it of hospitalWorkPoint) {
      const index = returnPoint.find(item => item.code === it.parentCode);
      if (index) {
        index.score += it.score;
      } else {
        returnPoint.push({
          code: it.parentCode,
          name: it.parentName,
          score: it.score
        });
      }
    }

    return returnPoint;
  }

  // 公分列表[医生工分, 工分项目]
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async workpointsProject(code) {
    // 获取树形结构
    const tree = await getAreaTree(code);

    // 找到所有的叶子节点
    const hospitalIds = tree
      .filter(it => it.leaf === true)
      .map(item => item.code);

    // 根据机构id获取对应的原始数据id
    const hisHospIdObjs = await getOriginalArray(hospitalIds);

    const hisHospIds = hisHospIdObjs.map(it => it['id']);

    // 根据地区id获取机构id列表
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    const [sql, params] = sqlRender(
      `
            select
                cast(sum(vws.score) as int) as score,
                vws.operateorganization,
                vws.projecttype as "projectId"
            from view_workscoretotal vws
            where vws.operateorganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
                and missiontime >= {{? startTime}}
                and missiontime < {{? endTime}}
            group by vws.projecttype, vws.operateorganization
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

    const workPoint = await originalDB.execute(sql, ...params);
    return workPoint;

    const a = workPoint.map(it => ({
      ...it,
      name: Projects.find(p => {
        return p.mappings.find(
          mapping => mapping.id === it.projectId && mapping.type === '340222'
        );
      })?.name
    }));
    return workPoint;
  }
}
