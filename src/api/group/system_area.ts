import * as dayjs from 'dayjs';
import {KatoCommonError, should, validate} from 'kato-server';
import {
  AreaModel,
  CheckAreaModel,
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  RegionModel,
  ReportAreaHistoryModel,
  ReportAreaModel,
  RuleAreaScoreModel,
  RuleProjectModel
} from '../../database/model';
import {Op} from 'sequelize';
import {sql as sqlRender} from '../../database/template';
import {appDB, originalDB} from '../../app';
import {Decimal} from 'decimal.js';
import {Projects} from '../../../common/project';
import {getAreaTree, getOriginalArray} from '../group';
import {RuleAreaBudget} from '../../database/model/group/rule-area-budget';
import {getWorkPoints} from './score';
import {Workbook} from 'exceljs';
import {Context} from '../context';
import * as ContentDisposition from 'content-disposition';

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
   * return score: 得分, workPoint:参与校正工分, totalWorkPoint: 校正前总公分, rate: 质量系数, correctWorkPoint: 矫正后的公分值, budget: 分配金额
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份')
  )
  async total(code, year) {
    // 查询本级权限
    const areas = await AreaModel.findOne({where: {code}});

    // 获取树形结构
    const tree = await getAreaTree(Context.current.user.code);
    const parentIndex = tree.findIndex(it => it.code === areas.parent);

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
      parent: parentIndex > -1 ? areas.parent : null,
      score: reportArea ? Number(reportArea.score) : 0,
      workPoint: reportArea ? Number(reportArea.workPoint) : 0,
      rate: reportArea ? Number(reportArea.rate) : 0,
      totalWorkPoint: reportArea ? Number(reportArea.totalWorkPoint) : 0,
      budget: reportArea ? Number(reportArea.budget) : 0,
      correctWorkPoint: reportArea ? Number(reportArea.correctWorkPoint) : 0
    };
  }

  /**
   * 获取省市排行
   *
   * @param code group code
   * @param year
   *
   * return score: 得分, workPoint:参与校正工分, totalWorkPoint: 校正前总公分, rate: 质量系数, correctWorkPoint: 矫正后的公分值, budget: 分配金额
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份')
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
        budget: item ? Number(item.budget) : 0,
        workPoint: item ? Number(item.workPoint) : 0,
        totalWorkPoint: item ? Number(item.totalWorkPoint) : 0,
        correctWorkPoint: item ? Number(item.correctWorkPoint) : 0,
        score: item ? Number(item.score) : 0,
        rate: item ? Number(item.rate) : 0
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
    should
      .string()
      .allow(null)
      .description('年份')
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
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份')
  )
  async faceCollect(code, year) {
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
   * @param year 年份
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
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份')
  )
  async signRegister(code, year) {
    // 获取树形结构
    const tree = await getAreaTree(code);

    // 找到所有的叶子节点
    const hospitalIds = tree
      .filter(it => it.leaf === true)
      .map(item => item.code);

    // 根据机构id获取对应的原始数据id
    const hisHospIdObjs = await getOriginalArray(hospitalIds);
    const hisHospIds = hisHospIdObjs.map(it => it.id);

    // 如果没传时间,默认当前年
    if (!year) year = dayjs().format('YYYY');
    // 签约人数
    const signedSqlRenderResult = sqlRender(
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
        YearDegree: dayjs(year).year()
      }
    );
    // 履约人数
    const exeSqlRenderResult = sqlRender(
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
        startTime: dayjs(year)
          .startOf('y')
          .toDate(),
        endTime: dayjs(year)
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    // 续约人数
    const renewSqlRenderResult = sqlRender(
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
        YearDegree: dayjs(year)
          .add(-1, 'y')
          .year(),
        hisHospIds,
        vsrYearDegree: dayjs(year).year()
      }
    );
    const sqlResults = await Promise.all(
      [
        signedSqlRenderResult,
        exeSqlRenderResult,
        renewSqlRenderResult
      ].map(it => originalDB.execute(it[0], ...it[1]))
    );
    const signedNumber = sqlResults[0][0]?.Number ?? 0;
    const exeNumber = sqlResults[1][0]?.Number ?? 0;
    const renewNumber = sqlResults[2][0]?.Number ?? 0;
    return {
      signedNumber: Number(signedNumber),
      exeNumber: Number(exeNumber),
      renewNumber: Number(renewNumber)
    };
  }

  /**
   * 监督协管报告
   *
   * @param code
   * @param year
   * @param pageNo
   * @param pageSize
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份'),
    should
      .number()
      .allow(null)
      .description('当前页'),
    should
      .number()
      .allow(null)
      .description('每页显示条数')
  )
  async supervisionReport(code, year, pageNo, pageSize) {
    // 赋值默认值
    if (!pageNo) pageNo = 1;
    if (!pageSize) pageSize = 20;
    // 获取树形结构
    const tree = await getAreaTree(code);

    // 找到所有的叶子节点
    const hospitalIds = tree
      .filter(it => it.leaf === true)
      .map(item => item.code);

    // 根据机构id获取对应的原始数据id
    const hisHospIdObjs = await getOriginalArray(hospitalIds);
    const hisHospIds = hisHospIdObjs.map(it => it.id);

    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    // 如果没传时间,默认当前年
    if (!year) year = dayjs().format('YYYY');

    const [sql, params] = sqlRender(
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
        start: dayjs(year)
          .startOf('y')
          .toDate(),
        end: dayjs(year)
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    return await originalDB.page(sql, pageNo, pageSize, ...params);
  }

  /**
   * 监督协管巡查
   *
   * @param code
   * @param year
   * @param pageNo 当前页
   * @param pageSize 每页显示条数
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份'),
    should
      .number()
      .allow(null)
      .description('当前页'),
    should
      .number()
      .allow(null)
      .description('每页显示条数')
  )
  async supervisionAssist(code, year, pageNo, pageSize) {
    // 赋值默认值
    if (!pageNo) pageNo = 1;
    if (!pageSize) pageSize = 20;

    // 获取树形结构
    const tree = await getAreaTree(code);

    // 找到所有的叶子节点
    const hospitalIds = tree
      .filter(it => it.leaf === true)
      .map(item => item.code);

    // 根据机构id获取对应的原始数据id
    const hisHospIdObjs = await getOriginalArray(hospitalIds);
    const hisHospIds = hisHospIdObjs.map(it => it.id);
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    // 如果没传时间,默认当前年
    if (!year) year = dayjs().format('YYYY');

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
        start: dayjs(year)
          .startOf('y')
          .toDate(),
        end: dayjs(year)
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    return await originalDB.page(sql, pageNo, pageSize, ...params);
  }

  // 健康教育
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份')
  )
  async healthEducation(code, year) {
    // 获取树形结构
    const tree = await getAreaTree(code);

    // 找到所有的叶子节点
    const hospitalIds = tree
      .filter(it => it.leaf === true)
      .map(item => item.code);

    // 根据机构id获取对应的原始数据id
    const hisHospIdObjs = await getOriginalArray(hospitalIds);
    const hisHospIds = hisHospIdObjs.map(it => it.id);
    if (hisHospIds.length < 1) throw new KatoCommonError('机构id不合法');

    // 如果没传时间,默认当前年
    if (!year) year = dayjs().format('YYYY');

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
        startTime: dayjs(year)
          .startOf('y')
          .toDate(),
        endTime: dayjs(year)
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
   * @param code
   * @param year
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份')
  )
  async workPointsArea(code, year) {
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

    // 如果没传时间,默认当前年
    if (!year) year = dayjs().format('YYYY');

    const [sql, params] = sqlRender(
      `
            select
                cast(sum(score) as int) as score,
                operateorganization,
                operatorid as "doctorId",
                doctor as "doctorName"
            from view_workscoretotal
            where operateorganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
             and missiontime >= {{? startTime}}
             and missiontime < {{? endTime}}
             group by operatorid, doctor, operateorganization
             `,
      {
        hisHospIds,
        startTime: dayjs(year)
          .startOf('y')
          .toDate(),
        endTime: dayjs(year)
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
      .description('地区code或机构id'),
    should
      .string()
      .allow(null)
      .description('年份')
  )
  async workPointsProject(code, year) {
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

    // 如果没传时间,默认当前年
    if (!year) year = dayjs().format('YYYY');

    const [sql, params] = sqlRender(
      `
        select
            cast(sum(score) as int) as score,
            projectname as "name",
            projecttype as "code"
        from view_workscoretotal
        where operateorganization in ({{#each hisHospIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
         and missiontime >= {{? startTime}}
         and missiontime < {{? endTime}}
         group by projecttype, projectname
         `,
      {
        hisHospIds,
        startTime: dayjs(year)
          .startOf('y')
          .toDate(),
        endTime: dayjs(year)
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );

    return originalDB.execute(sql, ...params);
  }

  /**
   * 各个工分项的详情
   *
   * @param code 机构id
   * @param year 考核体系id
   */
  async projectDetail(code, year) {
    // 如果没传时间,默认当前年
    if (!year) year = dayjs().format('YYYY');

    // 根据地区和时间查找考核Id
    const checkSystem = await CheckAreaModel.findOne({
      where: {areaCode: code},
      attributes: ['checkId'],
      include: [
        {
          model: CheckSystemModel,
          attributes: [],
          required: false,
          where: {checkYear: year}
        }
      ]
    });

    if (!checkSystem) throw new KatoCommonError('该地区无考核.');

    // 获取树形结构
    const tree = await getAreaTree(code);

    // 找到所有的叶子节点
    const hospitalIds = tree
      .filter(it => it.leaf === true)
      .map(item => item.code);

    // 根据机构id获取对应的原始数据id
    const hisHospIdObjs = await getOriginalArray(hospitalIds);

    // 取出考核id
    const checkId = checkSystem.checkId;

    // 根据checkId找到所有的考核小项,工分项
    const checkRule = await CheckRuleModel.findAll({
      where: {
        checkId,
        parentRuleId: null
      },
      attributes: ['ruleId', 'ruleName'],
      include: [
        {
          model: RuleProjectModel,
          required: false
        },
        {
          model: RuleAreaBudget,
          where: {
            areaCode: code
          },
          required: false
        }
      ]
    });

    // 取出所有的公分项
    const checkRuleList = checkRule.map(it => ({
      ruleId: it.ruleId,
      ruleName: it.ruleName,
      rate: it?.ruleAreaBudgets[0]?.rate,
      project: it?.ruleProject.map(item => item.projectId)
    }));

    // 取出公分id
    const workTypes = [];
    checkRuleList.forEach(it => {
      workTypes.push(...it?.project);
    });

    const returnList = [];
    // 循环工分项
    for (const it of workTypes) {
      // 获取此工分项下的所有公分
      const hospitalPoints = await getWorkPoints(hisHospIdObjs, [it], year);

      // 把工分值累加一起
      const workPoint = hospitalPoints.reduce(
        (prev, curr) => Number(prev) + Number(curr.score),
        0
      );

      // 查找
      const index = checkRuleList.find(rule =>
        rule?.project.some(p => p === it)
      );

      const rate = index?.rate ?? 0;
      returnList.push({
        projectId: it,
        projectName: Projects.find(p => p.id === it)?.name,
        ruleId: index ? index.ruleId : '',
        ruleName: index ? index.ruleName : '',
        workPoint,
        rate,
        correctWorkPoint: workPoint * rate
      });
    }

    return returnList;
  }

  /**
   * 导出考核
   *
   * @param code 地区/机构id
   * @param year 年份
   */
  async downloadCheck(code, year) {
    // 校验地区是否存在
    const areas = await AreaModel.findOne({where: {code}});
    if (areas.length === 0)
      throw new KatoCommonError(`code为 [${code}] 不合法`);

    // 获取checkId
    if (!year) year = dayjs().format('YYYY');

    // 通过地区编码和年份获取考核主信息
    const areaSystem = await CheckAreaModel.findOne({
      where: {
        areaCode: code
      },
      attributes: ['checkId'],
      include: [
        {
          model: CheckSystemModel,
          attributes: [],
          where: {checkYear: year}
        }
      ]
    });
    if (!areaSystem) throw new KatoCommonError(`该地区未绑定考核`);

    // 取出考核主信息
    const checkId = areaSystem.checkId;

    // 查询考核细则和小项
    const rules = await CheckRuleModel.findAll({
      where: {
        checkId,
        parentRuleId: {[Op.not]: null}
      },
      attributes: ['ruleId', 'ruleName']
    });

    // 查询机构考核细则得分
    const ruleScores = await RuleAreaScoreModel.findAll({
      where: {
        areaCode: code,
        ruleId: {
          [Op.in]: rules.map(rule => rule.ruleId)
        }
      },
      attributes: ['score', 'ruleId']
    });
    // 把得分放到数组中
    const checkRules = rules.map(it => {
      const index = ruleScores.find(item => item.ruleId === it.ruleId);
      return {
        ruleId: it.ruleId,
        ruleName: it.ruleName,
        score: index?.score ?? 0
      };
    });

    // 导出方法
    const workBook = new Workbook();
    //开始创建Excel表格
    const workSheet = workBook.addWorksheet(`${areas.name}考核结果`);

    //添加标题内容
    const firstRow = checkRules.map(item => `${item.ruleName}`);

    // 填充每行数据
    const childrenHospitalCheckResult = checkRules.map(item =>
      Number(item?.score?.toFixed(2) ?? 0)
    );

    workSheet.addRows([firstRow, childrenHospitalCheckResult]);

    Context.current.bypassing = true;
    const res = Context.current.res;

    //设置请求头信息，设置下载文件名称,同时处理中文乱码问题
    res.setHeader(
      'Content-Disposition',
      ContentDisposition(`${areas.name}考核结果.xls`)
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');

    const buffer = await workBook.xlsx.writeBuffer();
    res.send(buffer);
    //导出结束
  }
}
