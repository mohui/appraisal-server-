import * as dayjs from 'dayjs';
import {KatoCommonError, should, validate} from 'kato-server';
import {
  AreaVoucherModel,
  CheckAreaModel,
  CheckRuleModel,
  CheckSystemModel,
  ReportAreaHistoryModel,
  ReportAreaModel,
  RuleProjectModel
} from '../../database/model';
import {Op} from 'sequelize';
import {sql as sqlRender} from '../../database/template';
import {appDB, originalDB, unifs} from '../../app';
import {Decimal} from 'decimal.js';
import {Projects} from '../../../common/project';
import {getAreaTree} from '../group';
import {RuleAreaBudget} from '../../database/model/group/rule-area-budget';
import {getWorkPoints} from './score';
import {Workbook} from 'exceljs';
import {Context} from '../context';
import {createBackJob} from '../../utils/back-job';
import {getChildrenArea, getHospitals} from './common';

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

/**
 * 获取年份
 */
export function getYear(year) {
  if (!year) year = dayjs().year();
  return year;
}

export default class SystemArea {
  // region 考核结果汇总, 排行, 历史记录
  /**
   * 质量系数,公分值
   *
   * @param code
   * @param year
   * @return {
   *   id: 地区id
   *   name: 地区名称
   *   parent: 上级id. 如果已经是用户权限级别, 则为null
   *   label: 地区类型. province: 省, city: 市, district: 区, centre: 中心层, hospital.center: 服务中心/卫生院, hospital.station: 卫生站/卫生室
   *   totalWorkPoint: 校正前总公分
   *   workPoint:参与校正工分
   *   correctWorkPoint: 矫正后的公分值
   *   score: 得分
   *   rate: 质量系数
   *   budget: 分配金额
   * }
   */
  @validate(should.string().required(), should.number().allow(null))
  async total(code, year) {
    // 查询本级权限
    const areaModel: {
      code: string;
      name: string;
      parent: string;
      label: string;
    } = (
      await originalDB.execute(
        `
          select code, name, parent, label
          from area
          where code = ?`,
        code
      )
    )[0];
    if (!areaModel) throw new KatoCommonError(`地区 ${code} 不合法`);

    // 获取树形结构
    const tree = await getAreaTree(Context.current.user.code);
    const parentIndex = tree.findIndex(it => it.code === areaModel.parent);

    // 如果没有传年份,获取年份
    year = getYear(year);

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
      id: areaModel.code,
      name: areaModel.name,
      parent: parentIndex > -1 ? areaModel.parent : null,
      label: areaModel?.label ?? null,
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
      .number()
      .allow(null)
      .description('年份')
  )
  async rank(code, year) {
    // 地区列表
    const areaList = await originalDB.execute(
      // language=PostgreSQL
      `
        select code, name
        from area
        where parent = ?
      `,
      code
    );
    // 如果没有传年份获取年份
    year = getYear(year);

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
    return await Promise.all(
      areaList.map(async it => {
        const item = reportAreas.find(report => report.areaCode === it.code);
        const areaVouchers: {
          money: 0;
          vouchers: [];
        } = await AreaVoucherModel.findOne({
          where: {area: it.code, year: year}
        });
        return {
          code: it.code,
          name: it.name,
          budget: item ? Number(item.budget) : 0,
          workPoint: item ? Number(item.workPoint) : 0,
          totalWorkPoint: item ? Number(item.totalWorkPoint) : 0,
          correctWorkPoint: item ? Number(item.correctWorkPoint) : 0,
          score: item ? Number(item.score) : 0,
          rate: item ? Number(item.rate) : 0,
          money: areaVouchers?.money ?? 0,
          vouchers: areaVouchers?.vouchers ?? []
        };
      })
    );
  }

  /**
   * 历史记录
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
      .number()
      .allow(null)
      .description('年份')
  )
  async history(code, year) {
    // 查询本级权限
    const areas = (
      await originalDB.execute(
        // language=PostgreSQL
        `
        select code, name
        from area
        where code = ?
      `,
        code
      )
    )[0];

    if (!areas) throw new KatoCommonError(`地区 ${code} 不合法`);
    // 如果没有传年份获取年份
    year = getYear(year);

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
          [Op.gte]: dayjs()
            .year(year)
            .startOf('y')
            .toDate(),
          [Op.lt]: dayjs()
            .year(year)
            .startOf('y')
            .add(1, 'y')
            .toDate()
        }
      },
      attributes: ['date', 'workPoint', 'totalWorkPoint', 'rate', 'score']
    });
  }

  // endregion

  // region lake库
  /**
   * 人脸采集信息
   *
   * @param code 地区code或机构id
   * @param year 年份
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .number()
      .allow(null)
      .description('年份')
  )
  async faceCollect(code, year) {
    // 根据地区id获取机构id
    const hospitals = await getHospitals(code);
    const hospitalIds = hospitals.map(it => it.code);

    let faceData = {face: 0, total: 0, rate: 0};

    // 查询人脸采集
    try {
      const sql = sqlRender(
        `
            select
              coalesce(sum("S00"),0)::integer as "total",
              coalesce(sum("S30"),0)::integer as "face"
            from mark_organization
            where id::varchar in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/each}})
              and year = {{? year}}`,
        {
          hospitalIds,
          year
        }
      );
      faceData = (await originalDB.execute(sql[0], ...sql[1]))[0];
    } catch (e) {
      throw new KatoCommonError('所传参数code,不是地区code或机构id');
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
      .number()
      .allow(null)
      .description('年份')
  )
  async signRegister(code, year) {
    // 根据code获取所有机构信息
    const hospitals = await getHospitals(code);
    if (hospitals.length === 0) throw new KatoCommonError('机构id不合法');
    // 获取所有机构id
    const hospitalIds = hospitals.map(it => it.code);

    // 如果没有传年份获取年份
    year = getYear(year);
    // 签约人数
    const signedSqlRenderResult = sqlRender(
      `
            select count(distinct vsr.personnum) as "Number"
            from ph_sign_register vsr
                   inner join ph_person vp on vp.id = vsr.PersonNum
            where vp.AdminOrganization in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
              and vp.WriteOff = false
              and vsr.YearDegree = {{? YearDegree}}
          `,
      {
        hospitalIds,
        YearDegree: year
      }
    );
    // 履约人数
    const exeSqlRenderResult = sqlRender(
      `
            select count(distinct vsr.PersonNum) as "Number"
            from ph_sign_check_main main
                   inner join ph_sign_register vsr on vsr.id = main.register
            where main.ExeOrganization in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
              and main.ExeTime >= {{? startTime}}
              and main.ExeTime < {{? endTime}}
          `,
      {
        hospitalIds,
        startTime: dayjs()
          .year(year)
          .startOf('y')
          .toDate(),
        endTime: dayjs()
          .year(year)
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    // 续约人数
    const renewSqlRenderResult = sqlRender(
      `
            select count(distinct vsr.PersonNum) as "Number"
            from ph_sign_register vsr
                   inner join ph_sign_register a on a.PersonNum = vsr.PersonNum and a.YearDegree = {{? YearDegree}}
                   inner join ph_Person vp on vp.id = vsr.PersonNum
            where vp.AdminOrganization in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
              and vp.WriteOff = false
              and vsr.YearDegree = {{? vsrYearDegree}}
          `,
      {
        YearDegree: dayjs()
          .year(year)
          .add(-1, 'y')
          .year(),
        hospitalIds,
        vsrYearDegree: year
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
      .number()
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
    // 根据code获取所有机构信息
    const hospitals = await getHospitals(code);
    // 获取所有机构id
    const hospitalIds = hospitals.map(it => it.code);

    if (hospitalIds.length < 1) throw new KatoCommonError('机构id不合法');

    // 如果没有传年份获取年份
    year = getYear(year);

    const [sql, params] = sqlRender(
      `
        select
            institutionname as "InstitutionName",
            address as "Address",
            Contents as "Contents",
            ReportTime as "Date"
        from ph_sanitary_control_report
        where OperateOrganization in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
        and ReportTime>={{? start}} and ReportTime<{{? end}}
        order by ReportTime desc
      `,
      {
        hospitalIds,
        start: dayjs()
          .year(year)
          .startOf('y')
          .toDate(),
        end: dayjs()
          .year(year)
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
      .number()
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

    // 根据code获取所有机构信息
    const hospitals = await getHospitals(code);
    // 获取所有机构id
    const hospitalIds = hospitals.map(it => it.code);

    if (hospitalIds.length < 1) throw new KatoCommonError('机构id不合法');

    // 如果没有传年份获取年份,默认当前年
    year = getYear(year);

    const [sql, params] = sqlRender(
      `
    select
        institutionname as "InstitutionName",
        address as "Address",
        checkDate as "Date"
    from ph_sanitary_control_assist
    where OperateOrganization in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
    and checkDate >= {{? start}} and checkDate < {{? end}}
    order by checkDate desc
    `,
      {
        hospitalIds,
        start: dayjs()
          .year(year)
          .startOf('y')
          .toDate(),
        end: dayjs()
          .year(year)
          .startOf('y')
          .add(1, 'y')
          .toDate()
      }
    );
    return await originalDB.page(sql, pageNo, pageSize, ...params);
  }

  /**
   * 健康教育
   *
   * @param code 地区编码
   * @param year 年份
   * @param type 健康教育编码
   * @param pageNo 当前页
   * @param pageSize 每页显示条数
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .number()
      .allow(null)
      .description('年份'),
    should
      .string()
      .allow(null)
      .description('健康教育编码'),
    should
      .number()
      .allow(null)
      .description('当前页'),
    should
      .number()
      .allow(null)
      .description('每页显示条数')
  )
  async healthEducation(code, year, type, pageNo, pageSize) {
    // 默认健康教育编码
    if (!type) type = '1';
    // 默认页数
    if (!pageNo) pageNo = 1;
    // 默认条数
    if (!pageSize) pageSize = 20;
    // 根据code获取所有机构信息
    const hospitals = await getHospitals(code);
    // 获取所有机构id
    const hospitalIds = hospitals.map(it => it.code);

    if (hospitalIds.length < 1) throw new KatoCommonError('机构id不合法');

    // 如果没有传年份获取年份,默认当前年
    year = getYear(year);

    /**
     * 发放印刷资料 ActivityFormCode = '1' PrintDataName 名称 ActivityTime 活动时间
     * 播放音像资料 ActivityFormCode = '2' VideotapeName 名称 ActivityTime 活动时间
     * 健康教育宣传栏 ActivityFormCode = '3' ActivityName 名称 ActivityTime 活动时间
     * 健康知识讲座 ActivityFormCode = '4' ActivityName 名称 ActivityTime 活动时间
     * 公众健康咨询 ActivityFormCode = '5' ActivityName 名称 ActivityTime 活动时间
     * 个体化健康教育 ActivityFormCode = '6' ActivityName 名称 ActivityTime 活动时间
     */
    const [sql, params] = sqlRender(
      `
        SELECT vhe.PrintDataName    as "PrintDataName",
               vhe.ActivityName     as "ActivityName",
               vhe.VideotapeName    as "VideotapeName",
               vhe.ActivityTime     as "ActivityTime"
        FROM ph_health_education vhe
        where  vhe.ActivityTime >= {{? startTime}}
          and vhe.ActivityTime < {{? endTime}}
          and vhe.ActivityFormCode = {{? activityFormCode}}
          and vhe.State = 1
          and vhe.OperateOrganization in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
        order by vhe.ActivityTime desc
      `,
      {
        startTime: dayjs()
          .year(year)
          .startOf('y')
          .toDate(),
        endTime: dayjs()
          .year(year)
          .startOf('y')
          .add(1, 'y')
          .toDate(),
        activityFormCode: type,
        hospitalIds
      }
    );

    const data = await originalDB.page(sql, pageNo, pageSize, ...params);
    return {
      ...data,
      data: data.data.map(it => {
        return {
          name:
            type === '1'
              ? it.PrintDataName
              : type === '2'
              ? it.VideotapeName
              : it.ActivityName,
          time: it.ActivityTime
        };
      })
    };
  }

  /**
   * 工分列表[地区工分]
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
      .number()
      .allow(null)
      .description('年份')
  )
  async workPointsArea(code, year) {
    // 根据code获取所有机构信息
    const hospitals = await getHospitals(code);

    if (hospitals.length === 0)
      throw new KatoCommonError(`code 为 ${code} 的地区不存在`);

    // 获取所有机构id
    const hospitalIds = hospitals.map(it => it.code);
    // 获取下级菜单
    const childrenTree = await getChildrenArea(code);

    // 如果没有传年份获取年份,默认当前年
    year = getYear(year);

    const [sql, params] = sqlRender(
      `
            select
                cast(sum(score) as int) as score,
                operateorganization,
                operatorid as "doctorId",
                doctor as "doctorName"
            from mark_workpoint
            where operateorganization in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/each}})
             and year = {{? year}}
             group by operatorid, doctor, operateorganization
             `,
      {
        hospitalIds,
        year
      }
    );

    // 执行SQL语句
    const workPointModels = await originalDB.execute(sql, ...params);

    // 如果是机构级节点(根据id查子集, 查不到代表是机构节点), 返回查询结果
    if (childrenTree.length === 0) {
      return workPointModels.map(it => {
        return {
          code: it.doctorId,
          name: it.doctorName,
          score: it.score,
          isDoctor: true
        };
      });
    } else {
      // 先把所有的上级放到机构数组中
      const newHospitals = hospitals.map(it => {
        const index = childrenTree.find(child =>
          child.label === 'hospital.center' ||
          child.label === 'hospital.station'
            ? it.path.includes(`.${child.code}`)
            : it.path.includes(`.${child.code}.`)
        );
        return {
          ...it,
          parentCode: index.code,
          parentName: index.name
        };
      });

      // 如果是机构节点之前的节点, 把机构节点的上级路径放到公分项数组中
      const workPoints = workPointModels.map(it => {
        const index = newHospitals.find(
          hospital => hospital.code === it.operateorganization
        );
        if (index) {
          return {
            ...it,
            parentCode: index?.parentCode ?? null,
            parentName: index?.parentName ?? null
          };
        }
      });

      const returnPoint = [];
      for (const it of workPoints) {
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
  }

  // 工分列表[医生工分, 工分项目]
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .number()
      .allow(null)
      .description('年份')
  )
  async workPointsProject(code, year) {
    // 根据code获取所有机构信息
    const hospitals = await getHospitals(code);
    // 获取所有机构id
    const hospitalIds = hospitals.map(it => it.code);

    // 根据地区id获取机构id列表
    if (hospitalIds.length < 1) throw new KatoCommonError('机构id不合法');

    // 如果没有传年份获取年份,默认当前年
    year = getYear(year);

    const [sql, params] = sqlRender(
      `
        select
            cast(sum(score) as int) as score,
            projectname as "name",
            projecttype as "code"
        from mark_workpoint
        where operateorganization in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/ each}})
         and year = {{? year}}
         group by projecttype, projectname
         `,
      {
        hospitalIds,
        year
      }
    );

    return originalDB.execute(sql, ...params);
  }

  // endregion

  /**
   * 各个工分项的详情
   *
   * @param code 机构id
   * @param year 考核体系id
   */
  async projectDetail(code, year) {
    // 如果没有传年份获取年份,默认当前年
    year = getYear(year);

    // 根据地区和时间查找考核Id
    const [sql, params] = sqlRender(
      `
          SELECT
            checkArea.check_system AS "checkId"
          FROM check_area AS checkArea
          LEFT JOIN check_system checkSystem ON checkArea.check_system = checkSystem.check_id
          WHERE checkArea.area = {{? code}}
            AND checkSystem.check_year = {{? year}}
      `,
      {
        code,
        year
      }
    );
    const checkSystem = await appDB.execute(sql, ...params);

    if (checkSystem.length === 0) throw new KatoCommonError('该地区无考核.');

    // 根据code获取所有机构信息
    const hospitals = await getHospitals(code);
    // 取出考核id
    const checkId = checkSystem[0]?.checkId;

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
      // 获取此工分项下的所有工分
      const hospitalPoints = await getWorkPoints(hospitals, [it], year);

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
        correctWorkPoint: workPoint * (rate >= 0.85 ? 1 : rate)
      });
    }

    return returnList;
  }

  /**
   * 导出考核的后台任务
   *
   * @param code 地区/机构id
   * @param year 年份
   */
  async downloadCheck(code, year) {
    try {
      let fileName = '';
      const area = (
        await originalDB.execute(
          // language=PostgreSQL
          `
        select code, name
        from area
        where code = ?
      `,
          code
        )
      )[0];
      if (!area) throw new KatoCommonError('机构或地区id错误!');

      fileName = area.name;
      return createBackJob('reportCheck', `${fileName}考核结果导出`, {
        code,
        year,
        fileName
      });
    } catch (e) {
      throw new KatoCommonError(e.message);
    }
  }

  //机构付款凭证接口
  @validate(
    should.string(),
    should.number().description('年份'),
    should.number().description('金额'),
    should.description('凭证')
  )
  async vouchers(area, year, money, vouchers) {
    return appDB.transaction(async () => {
      await AreaVoucherModel.upsert({area, year, money});

      if (vouchers) {
        const areaVoucher = await AreaVoucherModel.findOne({
          where: {area, year},
          lock: true
        });
        if (!areaVoucher.vouchers) areaVoucher.vouchers = [];
        const fileName =
          '/vouchers/appraisal/vouchers/' +
          dayjs().format('YYYY-MM-DDTHH:mm:ss') +
          vouchers.originalname;
        await unifs.writeFile(fileName, vouchers.buffer);
        areaVoucher.vouchers.push(fileName);
        await AreaVoucherModel.upsert(areaVoucher.toJSON());
        return fileName;
      }
    });
  }

  //凭证查询
  @validate(
    should
      .string()
      .required()
      .allow(null),
    should
      .number()
      .required()
      .allow(null)
  )
  async getVouchers(area, year) {
    // 如果没有传年份获取年份,默认当前年
    year = getYear(year);
    return AreaVoucherModel.findOne({where: {area, year}});
  }

  @validate(
    should.string().required(),
    should.number().required(),
    should.string().allow(null)
  )
  async removeVoucher(area, year, imageKey) {
    return appDB.transaction(async () => {
      const areaVoucher = await AreaVoucherModel.findOne({
        where: {area, year}
      });
      if (!areaVoucher) throw new KatoCommonError('凭证还未上传');
      //删除一个图
      if (imageKey) {
        areaVoucher.vouchers = areaVoucher.vouchers.filter(
          it => it !== imageKey
        );
        await areaVoucher.save();
        await unifs.deleteFile(imageKey);
      }
      //删除整条数据
      if (!imageKey) await AreaVoucherModel.destroy({where: {area, year}});
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .number()
      .required()
      .description('年份')
  )
  async areaBudgetList(code, year) {
    // 先获取下级地区
    const areaModels = await appDB.execute(
      `SELECT "code", "name" FROM area WHERE parent = ?`,
      code
    );
    if (areaModels.length === 0) return [];
    // 取出地区所有的下级地区id
    const areaList = areaModels.map(it => it.code);

    // 查询要插入的地区是否已经在表中
    const areaBudgetModels = await appDB.execute(
      `
        select
          area,
          year,
          correct_work_point,
          rate,
          budget,
          updated_at
        from area_budget
        where year = ? and  area in (${areaList.map(() => '?')}) `,
      year,
      ...areaList
    );

    return await Promise.all(
      areaModels.map(async it => {
        const item = areaBudgetModels.find(it1 => it1.area === it.code);
        const areaVouchers: {
          money: 0;
          vouchers: [];
        } = await AreaVoucherModel.findOne({
          where: {area: it.code, year: year}
        });
        return {
          code: it.code,
          name: it.name,
          year: item?.year,
          correctWorkPoint: item?.correct_work_point,
          rate: item?.rate,
          budget: item?.budget,
          date: item?.updated_at,
          money: areaVouchers?.money,
          vouchers: areaVouchers?.vouchers
        };
      })
    );
  }
}

/**
 * 获取报表的buffer数据
 * @param code
 * @param year
 */
export async function getReportBuffer(code, year) {
  // 校验地区是否存在
  const areas = (
    await originalDB.execute(
      // language=PostgreSQL
      `
        select code, name
        from area
        where code = ?
      `,
      code
    )
  )[0];
  if (!areas) throw new KatoCommonError(`code为 [${code}] 不合法`);

  // 获取树形结构
  const tree = await getAreaTree(code);
  // 地区编码
  const codeList = tree.map(it => it.code);

  // 拼接查询sql
  let [sql, params] = sqlRender(
    `
        select
          checkArea.area
          ,checkSystem.check_id checkId
          ,checkSystem.check_name checkName
        from check_area checkArea
        left join check_system checkSystem on checkArea.check_system = checkSystem.check_id
        where checkSystem.check_year = {{? year}}
        and checkArea.area in ({{#each codeList}}{{? this}}{{#sep}},{{/sep}}{{/each}})
      `,
    {
      year,
      codeList
    }
  );

  // 查询当前权限节点下的所有[考核]和[考核地区]的列表
  const systemAreas = await appDB.execute(sql, ...params);

  const systemAreaList = codeList
    .map(code => {
      return systemAreas.find(it => code === it.area);
    })
    .filter(it => it);

  // 把考核地区放在其所属的考核项目下
  const systemList = [];
  for (const it of systemAreaList) {
    // 查找考核项目
    const index = systemList.find(item => item.checkId === it['checkid']);
    // 如果不存在 加考核项目, 如果存在 把此地区放到其所属的考核项目中
    if (!index) {
      systemList.push({
        checkId: it.checkid,
        checkName: it.checkname,
        area: [it.area]
      });
    } else {
      index.area.push(it.area);
    }
  }

  // 定义考核体系分组, 存放考核项目和此项目下的考核细则,地区得分
  const checkGroups = [];
  for (const current of systemList) {
    // 定义一个空对象存放数据
    const checkObj = {
      id: current.checkId,
      name: current.checkName,
      parentRule: [],
      ruleScore: []
    };

    // 拼接查询语句, 根据考核项目查询考核小项和考核细则
    [sql, params] = sqlRender(
      `
            select
              checkRule.parent_rule_id
              ,checkRule.rule_id
              ,checkRule.rule_name
              ,checkRule.rule_score
              ,checkRule.budget
            from check_rule checkRule
            where checkRule.check_id = {{? checkId}}
          `,
      {
        checkId: current.checkId,
        areaList: current.area
      }
    );
    // 执行查询语句
    const checkRules = await appDB.execute(sql, ...params);
    // 如果查询结果为空,说明此考核下无考核小项跳过
    if (checkRules.length === 0) continue;

    // 首先找到所有的考核小项
    for (const ruleItem of checkRules) {
      // 找到所有的考核小项
      if (ruleItem.parent_rule_id === null) {
        checkObj.parentRule.push({
          parentId: ruleItem.rule_id,
          parentName: ruleItem.rule_name,
          parentScore: 0,
          parentBudget: parseFloat(ruleItem.budget).toFixed(2),
          children: []
        });
      }
    }

    // 把所有的考核细则放到其考核小项中
    for (const ruleItem of checkRules) {
      const item = checkObj.parentRule.find(
        it => it.parentId === ruleItem.parent_rule_id
      );
      // 如果没有找到,放到子集数组中
      if (item) {
        item.children.push({
          ruleId: ruleItem.rule_id,
          ruleName: ruleItem.rule_name,
          ruleScore: ruleItem.rule_score
        });
        item.parentScore += ruleItem.rule_score;
      }
    }

    // 拼接查询考核细则得分
    [sql, params] = sqlRender(
      `
            select
              checkRule.parent_rule_id
              ,checkRule.rule_id
              ,checkRule.rule_name
              ,ruleScore.score
              ,ruleScore.area
              ,area.name area_name
            from check_rule checkRule
            left join rule_area_score ruleScore on checkRule.rule_id = ruleScore.rule
            left join area on ruleScore.area = area.code
            where checkRule.check_id = {{? checkId}}
            and ruleScore.area in ({{#each areaList}}{{? this}}{{#sep}},{{/sep}}{{/each}})
          `,
      {
        checkId: current.checkId,
        areaList: current.area
      }
    );
    const ruleScore = await appDB.execute(sql, ...params);

    // 拼接查询考核小项的金额
    [sql, params] = sqlRender(
      `
            select
              checkRule.parent_rule_id
              ,checkRule.rule_id
              ,checkRule.rule_name
              ,ruleBudget.budget score
              ,ruleBudget."workPoint" point
              ,ruleBudget."correctWorkPoint"
              ,ruleBudget.rate
              ,ruleBudget.area
              ,area.name area_name
            from check_rule checkRule
            left join rule_area_budget ruleBudget on checkRule.rule_id = ruleBudget.rule
            left join area on ruleBudget.area = area.code
            where checkRule.check_id = {{? checkId}}
            and checkRule.parent_rule_id is null
            and ruleBudget.area in ({{#each areaList}}{{? this}}{{#sep}},{{/sep}}{{/each}})
          `,
      {
        checkId: current.checkId,
        areaList: current.area
      }
    );
    const ruleMoney = await appDB.execute(sql, ...params);

    // 合并两个数组
    checkObj.ruleScore = ruleScore.concat(ruleMoney);

    // 把此考核放到考核分组中
    checkGroups.push(checkObj);
  }
  checkGroups.forEach(it => {
    it.parentRule.forEach(item => {
      if (item.children.length === 0) {
        item.children.push({
          ruleId: '',
          ruleName: '',
          ruleScore: 0
        });
      }
    });
  });

  // 实例化导出方法
  const workBook = new Workbook();
  // 把每一个考核结果导入到一个sheet中
  for (const checkDetail of checkGroups) {
    //开始创建Excel表格[设置sheet的名称]
    const workSheet = workBook.addWorksheet(`${checkDetail.name}考核结果`);

    // 定义第一行的内容数组[小项标题]
    const firstRow = [''];
    // 定义第二行的内容数组[细则标题]
    const secondRow = [''];
    // 计算每个rule组需要合并多少个单元格
    const cells = [];
    for (const parentIt of checkDetail.parentRule) {
      // 此小项下有多少个细则,就补充[n+2]个空字符串,因为后面多三个[金额,公分,质量系数]
      const childrenRule = Array(parentIt.children.length - 1).fill('');
      const parentRuleChildren = [
        `${parentIt.parentName}总金额(${parentIt.parentBudget}元)`,
        ``,
        ``,
        ``
      ];

      firstRow.push(
        `${parentIt.parentName}(${parentIt.parentScore}分)`,
        ...childrenRule,
        ...parentRuleChildren
      );
      cells.push(parentIt.children.length, 4);

      const parentRuleSecond = [
        `${parentIt.parentName}总工分`,
        `${parentIt.parentName}质量系数/校正系数`,
        `${parentIt.parentName}校正后工分`,
        `${parentIt.parentName}金额(元)`
      ];
      // 设置第二行的内容[细则标题]
      secondRow.push(
        ...parentIt.children.map(rule =>
          rule.ruleName ? `${rule.ruleName}(${rule.ruleScore}分)` : ' '
        ),
        ...parentRuleSecond
      );
    }

    // 构造data部分 按地区分组 {area: string, scores: []}
    const areaScores = checkDetail.ruleScore.reduce((prev, current) => {
      let areaObj = prev.find(it => it.area === current.area);
      if (areaObj) {
        (areaObj.scores = areaObj.scores || []).push({
          // eslint-disable-next-line @typescript-eslint/camelcase
          rule_id: current.rule_id,
          area: current.area,
          score: current.score,
          point: current?.point ?? 0,
          rate: current?.rate ?? 0,
          correctWorkPoint: current?.correctWorkPoint ?? 0
        });
      } else {
        areaObj = {
          area: current.area,
          name: current.area_name,
          scores: [
            {
              // eslint-disable-next-line @typescript-eslint/camelcase
              rule_id: current.rule_id,
              area: current.area,
              score: current.score,
              point: current?.point ?? 0,
              rate: current?.rate ?? 0,
              correctWorkPoint: current?.correctWorkPoint ?? 0
            }
          ]
        };
        prev.push(areaObj);
      }
      return prev;
    }, []);

    // 把数据按照顺序遍历进数组中
    const dataArray = areaScores.map(area => {
      // 先放机构名称
      const result = [area.name];
      // 循环小项
      for (const parentRule of checkDetail.parentRule) {
        // 循环小项下的细则,取出所有细则的金额
        const scores = parentRule.children.map(rule => {
          // 查找小项中的细则的数量
          const scoreObj = area.scores.find(
            ruleScore => ruleScore.rule_id === rule.ruleId
          );
          return scoreObj?.score ?? 0;
        });

        // 查找小项的金额
        const budgetObj = area.scores.find(
          ruleScore => ruleScore.rule_id === parentRule.parentId
        );
        // 总工分
        scores.push(`${budgetObj?.point ?? 0}`);
        // 质量系数
        const rate = budgetObj?.rate ?? 0;
        scores.push(
          `${(rate * 100).toFixed(2)}%/${
            rate >= 0.85 ? '100.00' : (rate * 100).toFixed(2)
          }%`
        );
        // 校正公分
        scores.push(
          `${parseFloat(budgetObj?.correctWorkPoint ?? 0).toFixed(2)}`
        );
        // 分配金额
        scores.push(`${budgetObj?.score ?? 0}`);
        result.push(...scores);
      }

      return result;
    });

    workSheet.addRows([firstRow, secondRow, ...dataArray]);

    //合并单元格
    let cellCount = 0;
    firstRow.forEach((row, index) => {
      if (firstRow[index] && !(firstRow[index] && !secondRow[index])) {
        workSheet.mergeCells(1, index + 1, 1, index + cells[cellCount++]);
      }
    });
    workSheet.mergeCells('A1', 'A2');
  }
  return workBook.xlsx.writeBuffer();
}
