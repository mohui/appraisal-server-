import * as dayjs from 'dayjs';
import {Decimal} from 'decimal.js';
import {appDB, originalDB, unifs} from '../../app';
import {KatoCommonError, KatoRuntimeError} from 'kato-server';
import {
  BasicTagUsages,
  MarkTagUsages,
  TagAlgorithmUsages
} from '../../../common/rule-score';
import {
  AreaModel,
  BasicTagDataModel,
  CheckAreaModel,
  CheckRuleModel,
  CheckSystemModel,
  ManualScoreHistoryModel,
  ReportAreaModel,
  RuleAreaAttachModel,
  RuleAreaBudgetModel,
  RuleAreaScoreModel,
  sql as sqlRender,
  UserModel
} from '../../database';
import {Op} from 'sequelize';
import {Projects as ProjectMapping} from '../../../common/project';
import {Context} from '../context';
import {Permission} from '../../../common/permission';
import {createBackJob} from '../../utils/back-job';
import {v4 as uuid} from 'uuid';
import * as path from 'path';
import {getHospitals} from './common';

/**
 * 获取百分数字符串, 默认返回'0'
 *
 * @param numerator 分子
 * @param denominator 分母
 */
export function percentString(numerator: number, denominator: number): string {
  if (denominator) {
    const rate = numerator / denominator;
    if (rate > 1) return '100%';
    return ((numerator / denominator) * 100).toFixed(2) + '%';
  } else {
    return '0';
  }
}

/**
 * 查询考核对象的标记数据
 *
 * @param group 地区code
 * @param year 标记数据的年份
 */
export async function getMarks(
  group: string,
  year: number
): Promise<{
  id: string;
  S00: number;
  S23: number;
  S03: number;
  S30: number;
  O00: number;
  O01: number;
  O02: number;
  H00: number;
  H01: number;
  H02: number;
  D00: number;
  D01: number;
  D02: number;
  HE00: number;
  HE01: number;
  HE02: number;
  HE03: number;
  HE04: number;
  HE05: number;
  HE06: number;
  HE07: number;
  HE08: number;
  HE09: number;
  HE10: number;
  HE11: number;
  HE12: number;
  HE13: number;
  HE14: number;
  HE15: number;
  SC00: number;
  SC01: number;
  CH00: number;
  CH01: number;
  CO00: number;
  CO01: number;
  MCH00: number;
  MCH01: number;
  MCH02: number;
  MCH03: number;
  MCH04: number;
}> {
  // language=PostgreSQL
  const result = await originalDB.execute(
    `
      select *
      from mark_organization
      where id in (
        select code
        from area
        where label in ('hospital.center', 'hospital.station')
          and (code = ? or path like ?))
        and year = ?
    `,
    group,
    `%${group}%`,
    year
  );

  const obj = result.reduce(
    (prev, current) => {
      for (const key of Object.keys(prev)) {
        prev[key] += current[key] ?? 0;
      }
      return prev;
    },
    {
      S00: 0,
      S23: 0,
      S03: 0,
      S30: 0,
      O00: 0,
      O01: 0,
      O02: 0,
      H00: 0,
      H01: 0,
      H02: 0,
      D00: 0,
      D01: 0,
      D02: 0,
      HE00: 0,
      HE01: 0,
      HE02: 0,
      HE03: 0,
      HE04: 0,
      HE05: 0,
      HE06: 0,
      HE07: 0,
      HE08: 0,
      HE09: 0,
      HE10: 0,
      HE11: 0,
      HE12: 0,
      HE13: 0,
      HE14: 0,
      HE15: 0,
      SC00: 0,
      SC01: 0,
      CH00: 0,
      CH01: 0,
      CO00: 0,
      CO01: 0,
      MCH00: 0,
      MCH01: 0,
      MCH02: 0,
      MCH03: 0,
      MCH04: 0
    }
  );
  return {...obj, id: group};
}

/**
 * 获取机构工分数据
 *
 * @param organization 机构数组
 * @param projects 工分项数组
 * @param year 考核年份
 */
export async function getWorkPoints(
  organization: {
    code: string;
    path: string;
    name: string;
    parent: string;
    label: string;
  }[],
  projects: string[],
  year: number
) {
  // 处理年份
  const date = dayjs(year.toString(), 'YYYY');
  const start = date.format('YYYY-MM-DD');
  const end = date.add(1, 'y').format('YYYY-MM-DD');

  // 处理工分项映射
  const result = (
    await Promise.all(
      organization.map(async o => {
        // 查询his数据
        const his: string = o.path.startsWith('34.3402.340222')
          ? '340222'
          : '340203';
        // 当前机构对应的原始工分项
        const originalProjectIds: string[] = ProjectMapping.filter(it =>
          projects.find(p => p === it.id)
        )
          .map(it => it.mappings.find(m => m.type === his)?.id)
          .filter(it => it);
        let sql = '';
        let params = [];
        if (originalProjectIds?.length > 0) {
          const ret = sqlRender(
            `
              select cast(sum(score) as float) as score
              from ph_work_score_total
              where ProjectType in ({{#each projects}}{{? this}}{{#sep}}, {{/sep}}{{/each}})
                and OperateOrganization = {{? id}}
                and MissionTime >= {{? start}}
                and MissionTime < {{? end}}
          `,
            {
              start,
              end,
              id: o.code,
              projects: originalProjectIds
            }
          );
          sql = ret[0];
          params = ret[1];
        } else {
          const ret = sqlRender(
            `
              select
                cast(sum(score) as float) as score
              from ph_work_score_total
              where OperateOrganization = {{? id}}
                and MissionTime >= {{? start}}
                and MissionTime < {{? end}}
          `,
            {start, end, id: o.code}
          );
          sql = ret[0];
          params = ret[1];
        }
        const scores: {score: number}[] = await originalDB.execute(
          sql,
          ...params
        );

        return scores.map(s => ({
          score: s?.score ?? 0
        }));
      })
    )
  ).reduce((prev, current) => [...prev, ...current]);
  return result;
}

/**
 * 获取基础数据
 *
 * @param hospital code对应的所有叶子节点
 * @param tag 基础数据的tag
 * @param year 年份
 */
export async function getBasicData(
  hospital: string[],
  tag: string,
  year: number
): Promise<number> {
  const data: number = await BasicTagDataModel.sum('value', {
    where: {
      hospital: {
        [Op.in]: hospital
      },
      code: tag,
      year
    }
  });
  return data;
}

function debug(...args) {
  console.log(dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'), ...args);
}

/**
 * 考核体系打分任务状态
 */
const jobStatus = {};

export default class Score {
  /**
   * 考核体系列表
   *
   * @param params {
   *   pageSize: '分页大小',
   *   pageNo: '分页页码',
   *   checkId: '考核体系id',
   * }
   */
  async checks(params) {
    const {pageSize = 20, pageNo = 1, checkId} = params || {};
    const whereOptions = {};
    // 如果没有"管理所有考核"或者"超级管理员"的权限,则仅能看当前用户创建的
    if (
      !Context.current.user.permissions.some(
        p => p === Permission.ALL_CHECK || p === Permission.SUPER_ADMIN
      )
    ) {
      whereOptions['create_by'] = Context.current.user.id;
    }
    // 考核体系id
    if (checkId) whereOptions['checkId'] = checkId;
    const result = await CheckSystemModel.findAndCountAll({
      where: whereOptions,
      order: [['created_at', 'DESC']],
      offset: (pageNo - 1) * pageSize,
      limit: pageSize
    });

    // TODO: 暂无地区权限判断
    result.rows = await Promise.all(
      result.rows.map(async it => {
        // 补充绑定对象的字段
        const counts = await CheckAreaModel.count({
          where: {checkId: it.checkId}
        });
        return {
          ...it.toJSON(),
          hospitalCount: counts,
          // 实时打分状态
          running: jobStatus[it.checkId] || false
        };
      })
    );

    return result;
  }

  async autoScoreAllChecks(isAuto) {
    const checkModel = await CheckSystemModel.findAll({
      where: {
        status: true
      }
    });
    for (const it of checkModel) {
      await this.autoScore(it.checkId, true);
    }
  }

  /**
   * 考核体系自动打分
   *
   * @param id 考核体系id
   * @param isAuto 定时打分/实时打分
   */
  async autoScore(id, isAuto) {
    if (jobStatus[id]) throw new KatoCommonError('当前考核体系正在打分');
    // 标记打分状态, 正在打分
    jobStatus[id] = true;
    try {
      // 查询考核体系
      const checkModel: CheckSystemModel = await CheckSystemModel.findOne({
        where: {checkId: id}
      });
      if (!checkModel) throw new KatoRuntimeError(`考核体系 [${id}] 不合法`);
      // 判断考核体系的启停状态
      if (!checkModel.status)
        throw new KatoRuntimeError(`当前考核体系 [${id}]已经停用`);
      // 查询考核对象
      const checkAreaModels: CheckAreaModel[] = await CheckAreaModel.findAll({
        where: {
          checkId: id
        }
      });
      for (const ca of checkAreaModels) {
        await this.scoreArea(id, ca.areaCode, isAuto);
      }
      // 金额分配
      await this.checkBudget(id, isAuto);
      // 更新打分时间
      checkModel.runTime = new Date();
      await checkModel.save();
    } catch (e) {
      console.error('autoScoreCheck: ', e);
      throw new KatoCommonError('当前考核体系打分失败');
    } finally {
      // 标记打分状态, 打分结束
      jobStatus[id] = false;
    }
  }

  /***
   * 后台任务打分
   * @param checkId
   * @param isAuto
   */
  async autoScoreBackJob(checkId, isAuto) {
    const checkModel = await CheckSystemModel.findOne({
      where: {checkId: checkId}
    });
    return createBackJob('scoreCheck', `${checkModel.checkName}考核打分`, {
      checkId: checkId,
      isAuto: isAuto
    });
  }

  /**
   * 地区打分
   *
   * @param check 考核体系
   * @param group 考核对象
   * @param isAuto 是否是自动打分
   */
  async scoreArea(check, group, isAuto) {
    debug(`${check} ${group} 系统打分开始`);
    // 查询考核体系
    const checkModel: CheckSystemModel = await CheckSystemModel.findOne({
      where: {checkId: check}
    });
    if (!checkModel) throw new KatoRuntimeError(`考核体系 [${check}] 不合法`);
    // 考核年度
    const year = Number(checkModel.checkYear);
    // 年度开始时间
    const start = dayjs()
      .year(year)
      .startOf('y')
      .toDate();
    // 年度结束时间
    const end = dayjs()
      .year(year)
      .startOf('y')
      .add(1, 'y')
      .toDate();
    debug('获取marks开始');
    const mark = await getMarks(group, year);
    debug('获取marks结束');
    const t = await appDB.transaction();
    try {
      debug(`打分年度: ${dayjs().year()}; 考核年度: ${year}`);
      await CheckAreaModel.findOne({
        where: {
          areaCode: group,
          checkId: check
        },
        transaction: t,
        lock: true
      });
      // 地区报告model
      const reportModel = {
        checkId: check,
        areaCode: group,
        workPoint: 0,
        totalWorkPoint: 0,
        correctWorkPoint: 0,
        score: 0,
        totalScore: 0,
        rate: 0
      };
      // 获取所有机构信息
      const hospitals = await getHospitals(group);
      // 获取机构id
      const hospitalIds = hospitals.map(it => it.code);
      // 查询考核对象对应的考核体系的考核小项
      // language=PostgreSQL
      const parentRules: {id: string}[] = await appDB.execute(
        `
          select cr.rule_id as id
          from check_rule cr
          where cr.parent_rule_id is null
            and cr.check_id = ?`,
        check
      );
      // 根据考核小项, 进行打分
      for (const parentRule of parentRules) {
        debug('考核小项', parentRule.id, '开始');
        // 考核小项得分
        let parentScore = 0;
        // 考核小项满分
        let parentTotalScore = 0;
        // 根据考核小项查询考核细则
        // language=PostgreSQL
        const rules: {id: string; score: number}[] = await appDB.execute(
          `
            select rule_id as id, rule_score as score
            from check_rule
            where parent_rule_id = ?`,
          parentRule.id
        );
        for (const rule of rules) {
          debug('考核细则', rule.id, '开始');
          // 考核小项满分
          parentTotalScore += rule?.score ?? 0;
          // 考核细则得分
          // 查询rule_area_score
          let ruleAreaScoreModel: RuleAreaScoreModel = await RuleAreaScoreModel.findOne(
            {
              where: {ruleId: rule.id, areaCode: group}
            }
          );
          if (!ruleAreaScoreModel) {
            ruleAreaScoreModel = new RuleAreaScoreModel({
              ruleId: rule.id,
              areaCode: group,
              score: 0,
              auto: true,
              details: []
            });
          }
          // 考核细则是自动打分
          if (ruleAreaScoreModel.auto) {
            // 指标解释数组清空
            ruleAreaScoreModel.details = [];
            // 考核细则得分默认0, 重新计算
            ruleAreaScoreModel.score = 0;
            // 根据考核细则查询关联关系
            // language=PostgreSQL
            const formulas: {
              tag: string;
              algorithm: string;
              baseline: number;
              score: number;
              attachStartDate?: Date;
              attachEndDate?: Date;
            }[] = await appDB.execute(
              `
                select tag,
                       algorithm,
                       baseline,
                       score,
                       attach_start_date as "attachStartDate",
                       attach_end_date   as "attachEndDate"
                from rule_tag
                where rule = ?`,
              rule.id
            );
            // 根据关联关系计算得分
            for (const tagModel of formulas) {
              // 健康档案建档率
              if (tagModel.tag === MarkTagUsages.S01.code) {
                // 查询服务总人口数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.DocPeople,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.S01.name
                  } = 建立电子健康档案人数 / 辖区内常住居民数 = ${
                    mark?.S00
                  } / ${basicData} = ${percentString(mark?.S00, basicData)}`
                );
                // 根据指标算法, 计算得分
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.S00
                ) {
                  ruleAreaScoreModel.score += tagModel.score;
                }
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.S00
                ) {
                  ruleAreaScoreModel.score += tagModel.score;
                }
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.S00
                ) {
                  const rate = mark?.S00 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 健康档案规范率
              if (tagModel.tag === MarkTagUsages.S23.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.S23.name
                  } = 规范的电子档案数 / 建立电子健康档案人数 = ${
                    mark?.S23
                  } / ${mark?.S00} = ${percentString(mark?.S23, mark?.S00)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.S23
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.S23
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.S23 &&
                  mark?.S00
                ) {
                  const rate = mark.S23 / mark.S00 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 健康档案使用率
              if (tagModel.tag === MarkTagUsages.S03.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.S03.name
                  } = 档案中有动态记录的档案份数 / 建立电子健康档案人数 = ${
                    mark?.S03
                  } / ${mark?.S00} = ${percentString(mark?.S03, mark?.S00)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.S03
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.S03
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.S03 &&
                  mark?.S00
                ) {
                  const rate = mark.S03 / mark.S00 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 老年人健康管理率
              if (tagModel.tag === MarkTagUsages.O00.code) {
                // 查询老年人人数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.OldPeople,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.O00.name
                  } = 年内接受老年人健康管理人数 / 辖区内65岁及以上常住居民数 = ${
                    mark?.O00
                  } / ${basicData} = ${percentString(mark?.O00, basicData)}`
                );
                if (!basicData) continue;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.O00
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.O00
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.O00
                ) {
                  const rate = mark.O00 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 老年人中医药健康管理率
              if (tagModel.tag === MarkTagUsages.O02.code) {
                // 查询老年人人数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.OldPeople,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.O02.name
                  } = 年内接受中医药健康管理服务的65岁及以上居民数 / 年内接受健康管理的65岁及以上常住居民数 = ${
                    mark?.O02
                  } / ${basicData} = ${percentString(mark?.O02, basicData)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.O02
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.O02
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  basicData &&
                  mark?.O02
                ) {
                  const rate = mark.O02 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 高血压健康管理
              if (tagModel.tag === MarkTagUsages.H00.code) {
                // 查询高血压人数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.HypertensionPeople,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.H00.name
                  } = 一年内已管理的高血压患者数 / 年内辖区应管理高血压患者总数 = ${
                    mark?.H00
                  } / ${basicData} = ${percentString(mark?.H00, basicData)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.H00
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.H00
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.H00
                ) {
                  const rate = mark.H00 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 高血压规范管理率
              if (tagModel.tag === MarkTagUsages.H01.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.H01.name
                  } = 按照规范要求进行高血压患者健康管理的人数 / 一年内已管理的高血压患者人数 = ${
                    mark?.H01
                  } / ${mark?.H00} = ${percentString(mark?.H01, mark?.H00)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.H01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.H01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.H00 &&
                  mark?.H01
                ) {
                  const rate = mark.H01 / mark.H00 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 高血压控制率
              if (tagModel.tag === MarkTagUsages.H02.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.H02.name
                  } = 一年内最近一次随访血压达标人数 / 一年内已管理的高血压患者人数 = ${
                    mark?.H02
                  } / ${mark?.H00} = ${percentString(mark?.H02, mark?.H00)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.H02
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.H02
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.H00 &&
                  mark?.H02
                ) {
                  const rate = mark.H02 / mark.H00 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 糖尿病健康管理
              if (tagModel.tag === MarkTagUsages.D00.code) {
                // 查询糖尿病人数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.DiabetesPeople,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.D00.name
                  } = 一年内已管理的2型糖尿病患者数 / 年内辖区2型糖尿病患者总数 x 100% = ${
                    mark?.D00
                  } / ${basicData} = ${percentString(mark?.D00, basicData)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.D00
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.D00
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.D00
                ) {
                  const rate = mark.D00 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 糖尿病规范管理率
              if (tagModel.tag === MarkTagUsages.D01.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.D01.name
                  } = 按照规范要求进行2型糖尿病患者健康管理的人数 / 一年内已管理的2型糖尿病患者人数 x 100% = ${
                    mark?.D01
                  } / ${mark?.D00} = ${percentString(mark?.D01, mark?.D00)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.D01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.D01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.D00 &&
                  mark?.D01
                ) {
                  const rate = mark.D01 / mark.D00 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 糖尿病控制率
              if (tagModel.tag === MarkTagUsages.D02.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.D02.name
                  } = 一年内最近一次随访空腹血糖达标人数 / 一年内已管理的2型糖尿病患者人数 x 100% = ${
                    mark?.D02
                  } / ${mark?.D00} = ${percentString(mark?.D02, mark?.D00)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.D02
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.D02
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.D00 &&
                  mark?.D02
                ) {
                  const rate = mark.D02 / mark.D00 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 定性指标得分
              if (tagModel.tag === MarkTagUsages.Attach.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push('请查看机构上传的资料');
                // 查询定性指标和机构表
                const attachModels = await RuleAreaAttachModel.findAll({
                  where: {
                    ruleId: rule.id,
                    areaCode: group,
                    updatedAt: {
                      [Op.gt]: tagModel.attachStartDate,
                      [Op.lt]: tagModel.attachEndDate
                    }
                  }
                });
                if (attachModels?.length > 0) {
                  if (!tagModel?.baseline)
                    ruleAreaScoreModel.score += tagModel.score;

                  // 有上传文件数量的要求
                  if (tagModel?.baseline) {
                    const rate = attachModels.length / tagModel.baseline;
                    ruleAreaScoreModel.score +=
                      tagModel.score * (rate < 1 ? rate : 1);
                  }
                }
              }

              // 健康教育指标 - 健康教育咨询次数合格率
              if (tagModel.tag === MarkTagUsages.HE09.code) {
                // 查询健康教育咨询的次数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.HE09,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.HE09.name
                  } = 一年内举办健康教育咨询的次数 / 一年内应举办健康教育咨询的次数 x 100% = ${
                    mark?.HE09
                  } / ${basicData} =  ${percentString(mark?.HE09, basicData)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.HE09
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.HE09
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.HE09
                ) {
                  const rate = mark.HE09 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 健康教育指标 - 健康教育讲座次数合格率
              else if (tagModel.tag === MarkTagUsages.HE07.code) {
                // 查询健康知识讲座的次数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.HE07,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.HE07.name
                  } = 一年内举办健康知识讲座的次数 / 一年内应举办健康知识讲座的次数 x 100% = ${
                    mark?.[tagModel.tag]
                  } / ${basicData} =  ${percentString(mark?.HE07, basicData)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.HE07
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.HE07
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.HE07
                ) {
                  const rate = mark.HE07 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 剩余健康教育指标
              else if (tagModel.tag.indexOf('HE') == 0) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${MarkTagUsages[tagModel.tag].name} = ${
                    mark?.[tagModel.tag]
                  }`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.[tagModel.tag]
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.[tagModel.tag]
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.[tagModel.tag]
                ) {
                  const rate = mark?.[tagModel.tag] / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              //卫生计生监督协管信息报告率
              if (tagModel.tag === MarkTagUsages.SC00.code) {
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.Supervision,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.SC00.name
                  } = 报告的事件或线索次数 / 发现的事件或线索次数 x 100% = ${
                    mark?.SC00
                  } / ${basicData} = ${percentString(mark?.SC00, basicData)}`
                );

                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.SC00
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.SC00
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.SC00
                ) {
                  const rate = mark.SC00 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              //协助开展的实地巡查次数
              if (tagModel.tag === MarkTagUsages.SC01.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${MarkTagUsages.SC01.name} = ${mark?.SC01}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.SC01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.SC01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.SC01
                ) {
                  const rate = mark?.SC01 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 其他慢病规范管理率
              if (tagModel.tag === MarkTagUsages.CO01.code) {
                // 查询老年人人数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.OCD00,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.CO01.name
                  } = 规范管理的其他慢性病档案 / 其他慢病管理人数档案数 = ${
                    mark?.CO01
                  } / ${basicData} = ${percentString(mark?.CO01, basicData)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.CO01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.CO01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  basicData &&
                  mark?.CO01
                ) {
                  const rate = mark.CO01 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 高危人群规范管理率
              if (tagModel.tag === MarkTagUsages.CH01.code) {
                // 查询老年人人数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.HR00,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.CH01.name
                  } = 规范管理的高危人群数 / 高危人群档案数 = ${
                    mark?.CH01
                  } / ${basicData} = ${percentString(mark?.CH01, basicData)}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.CH01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.CH01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  basicData &&
                  mark?.CH01
                ) {
                  const rate = mark.CH01 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 早孕建册率
              if (tagModel.tag === MarkTagUsages.MCH01.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.MCH01.name
                  } = 辖区内孕13周之前建册并进行第1次产前检查的产妇人数 / 该地该时间内活产数 = ${
                    mark?.MCH01
                  } / ${mark?.MCH00} = ${percentString(
                    mark?.MCH01,
                    mark?.MCH00
                  )}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.MCH01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.MCH01
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.MCH01 &&
                  mark?.MCH00
                ) {
                  const rate = mark.MCH01 / mark.MCH00 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 产后访视率
              if (tagModel.tag === MarkTagUsages.MCH02.code) {
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.MCH02.name
                  } = 辖区内产妇出院后7天内接受过产后访视的产妇人数 / 该地该时间内活产数 = ${
                    mark?.MCH02
                  } / ${mark?.MCH00} = ${percentString(
                    mark?.MCH02,
                    mark?.MCH00
                  )}`
                );
                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.MCH02
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.MCH02
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.MCH02 &&
                  mark?.MCH00
                ) {
                  const rate = mark.MCH02 / mark.MCH00 / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 新生儿访视率(2021-10-30)
              if (tagModel.tag === MarkTagUsages.MCH03.code) {
                // 查询孕册数
                const basicData =
                  // language=PostgreSQL
                  (
                    await originalDB.execute(
                      `
                  select count(1) count
                  from mch_pregnancy_books
                  where operateorganization in (${hospitalIds.map(() => '?')})
                  and operatetime >= ?
                  and operatetime < ?
                  `,
                      ...hospitalIds,
                      start,
                      end
                    )
                  )[0]?.count ?? 0;
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.MCH03.name
                  } = 年度辖区内按照规范要求接受1次及以上访视的新生儿人数 / 孕产妇建册数 x 100% = ${
                    mark?.MCH03
                  } / ${basicData} = ${percentString(mark?.MCH03, basicData)}`
                );

                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.MCH03
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.MCH03
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.SC00
                ) {
                  const rate = mark.MCH03 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 儿童健康管理率(2021-10-30)
              if (tagModel.tag === MarkTagUsages.MCH04.code) {
                // 查询 年度辖区内0-6岁儿童数
                const basicData = await getBasicData(
                  hospitalIds,
                  BasicTagUsages.Children01,
                  year
                );
                // 添加指标解释数组
                ruleAreaScoreModel.details.push(
                  `${
                    MarkTagUsages.MCH04.name
                  } = (年度辖区内接受1次及以上随访的0-3岁儿童数 或 年度辖区内接受1次及以上随访的0-6岁儿童数)/ 年度辖区内0-6岁儿童数 x 100% = ${
                    mark?.MCH04
                  } / ${basicData} = ${percentString(mark?.MCH04, basicData)}`
                );

                if (
                  tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                  mark?.MCH04
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                  !mark?.MCH04
                )
                  ruleAreaScoreModel.score += tagModel.score;
                if (
                  tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                  mark?.SC00
                ) {
                  const rate = mark.MCH04 / basicData / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
            }
            // 如果未设置关联关系, 则得满分
            if (formulas?.length === 0) ruleAreaScoreModel.score = rule.score;
          }
          // 保存机构得分
          await ruleAreaScoreModel.save();
          // 考核小项得分
          parentScore += ruleAreaScoreModel.score;
          debug('考核细则', rule.id, '结束');
        }
        // 根据考核小项查询绑定的工分项
        const projects = (
          await appDB.execute(
            `select "projectId" as id from rule_project where rule = ?`,
            parentRule.id
          )
        ).map(it => it.id);
        let workPoint = 0;
        if (projects.length) {
          debug('考核小项获取参与校正工分开始');
          // 获取工分数组
          const scoreArray: {score: number}[] = await getWorkPoints(
            hospitals,
            projects,
            year
          );
          // 累计工分, 即参与校正工分值
          workPoint = scoreArray
            .reduce((prev, current) => {
              prev = prev.add(new Decimal(current.score));
              return prev;
            }, new Decimal(0))
            .toNumber();
          debug('考核小项获取参与校正工分结束', workPoint);
        } else {
          debug('考核小项未绑定工分项');
        }
        // 计算考核小项的质量系数
        let rate = 0;
        if (parentTotalScore != 0) {
          // 质量系数保留4位小数
          rate = Number(
            new Decimal(parentScore)
              .div(new Decimal(parentTotalScore))
              .toNumber()
              .toFixed(4)
          );
        }
        // 校正后的工分值, 默认为参与校正工分值
        let correctWorkPoint = workPoint;
        // 质量系数小于85%, 则使用质量系数校正
        if (rate < 0.85) {
          correctWorkPoint = new Decimal(workPoint)
            .mul(new Decimal(rate))
            .toNumber();
        }
        // 保存小项考核表
        await RuleAreaBudgetModel.upsert({
          ruleId: parentRule.id,
          areaCode: group,
          workPoint: workPoint,
          correctWorkPoint: correctWorkPoint,
          score: parentScore,
          totalScore: parentTotalScore,
          rate: rate
        });

        // 地区参与校正的工分
        reportModel.workPoint = new Decimal(workPoint)
          .add(new Decimal(reportModel.workPoint))
          .toNumber();
        // 地区校正后的工分
        reportModel.correctWorkPoint = new Decimal(reportModel.correctWorkPoint)
          .add(correctWorkPoint)
          .toNumber();
        // 地区考核得分
        reportModel.score = new Decimal(parentScore)
          .add(new Decimal(reportModel.score))
          .toNumber();
        // 地区考核满分
        reportModel.totalScore = new Decimal(parentTotalScore)
          .add(new Decimal(reportModel.totalScore))
          .toNumber();
        debug('考核小项', parentRule.id, '结束');
      }
      // 地区质量系数
      reportModel.rate =
        reportModel.totalScore === 0
          ? 0
          : new Decimal(reportModel.score)
              .div(new Decimal(reportModel.totalScore))
              .toNumber();
      debug('考核地区获取总工分开始');
      // 获取总工分数组
      const scoreArray: {score: number}[] = await getWorkPoints(
        hospitals,
        [],
        year
      );
      // 地区总工分
      reportModel.totalWorkPoint = scoreArray
        .reduce((prev, current) => {
          prev = prev.add(new Decimal(current.score));
          return prev;
        }, new Decimal(0))
        .toNumber();
      debug('考核地区获取总工分结束', reportModel);
      // 保存机构报告
      await ReportAreaModel.upsert(reportModel);
      // TODO: 历史功能暂时禁用 保存机构报告历史
      // await ReportAreaHistoryModel.upsert({
      //   ...reportModel,
      //   // 是考核年份且是自动打分, 则日期减一天, 因为算的是前一天的数据
      //   date: dayjs()
      //     .subtract(isCheckYear && isAuto ? 0 : 1, 'd')
      //     .toDate()
      // });
      await t.commit();
      debug(`${check} ${group} 系统打分结束`);
    } catch (e) {
      await t.rollback();
      debug(`${check} ${group} 系统打分异常: ${e}`);
    }
  }

  /**
   * 根据考核结果进行金额分配
   *
   * 1. 分配各个地区考核小项(rule_area_budget)的金额
   *    算法为: 地区考核小项的金额 = 地区考核小项校正后的工分 / 所有地区考核小项校正后的工分 * 考核小项的金额
   * 2. 更新report_area的金额
   * 3. 更新report_area_history的金额
   *
   * @param check 考核体系id
   * @param isAuto 是否是自动打分
   */
  async checkBudget(check, isAuto) {
    debug(`${check} 金额分配开始`);
    // 查询考核体系
    const checkModel: CheckSystemModel = await CheckSystemModel.findOne({
      where: {checkId: check}
    });
    if (!checkModel) throw new KatoRuntimeError(`考核体系 [${check}] 不合法`);

    // 默认年份为当前年, 如果是1月1日, 则为上一年
    const now = dayjs();
    let year = dayjs()
      .year()
      .toString();
    if (now.day() === 1 && now.month() === 1) {
      year = now
        .subtract(1, 'y')
        .year()
        .toString();
    }
    debug(`打分年度: ${year}; 考核年度: ${year}`);
    // 1. 分配rule_area_budget的金额
    // 查询考核小项的金额
    const parentRuleModels: {
      id: string;
      budget: number;
    }[] = await appDB.execute(
      `select rule_id as id, budget from check_rule where check_id = ? and parent_rule_id is null`,
      check
    );
    // 循环分配
    for (const parentRuleModel of parentRuleModels) {
      debug('考核小项分配金额', parentRuleModel.budget);
      // 查询考核小项结果
      const ruleAreaBudgetModels: RuleAreaBudgetModel[] = await RuleAreaBudgetModel.findAll(
        {
          where: {ruleId: parentRuleModel.id}
        }
      );
      // 考核小项校正后的总工分
      const totalCorrectWorkPoints: Decimal = ruleAreaBudgetModels.reduce(
        (prev, cur) => {
          prev = prev.add(new Decimal(cur.correctWorkPoint));
          return prev;
        },
        new Decimal(0)
      );
      debug('考核小项校正后总工分', totalCorrectWorkPoints);
      // 分配考核小项金额
      for (const ruleAreaBudgetModel of ruleAreaBudgetModels) {
        if (totalCorrectWorkPoints.toNumber() === 0) {
          ruleAreaBudgetModel.budget = 0;
        } else {
          // 金额取整
          ruleAreaBudgetModel.budget = Math.round(
            new Decimal(parentRuleModel.budget)
              .mul(new Decimal(ruleAreaBudgetModel.correctWorkPoint))
              .div(totalCorrectWorkPoints)
              .toNumber()
          );
        }
        debug(
          `${ruleAreaBudgetModel.areaCode} 获取金额 ${ruleAreaBudgetModel.budget}`
        );
        await ruleAreaBudgetModel.save();
      }
    }

    // 2. 分配report_area的金额
    //  累计report表的金额
    const checkAreaModels: CheckAreaModel[] = await CheckAreaModel.findAll({
      where: {checkId: check}
    });
    for (const checkAreaModel of checkAreaModels) {
      // language=PostgreSQL
      const budgetModel: {budget: number} = (
        await appDB.execute(
          `
            select sum(rab.budget) as budget
            from rule_area_budget rab
                   inner join check_rule cr on rab.rule = cr.rule_id
            where cr.check_id = ?
              and rab.area = ?`,
          check,
          checkAreaModel.areaCode
        )
      )[0];
      // 保存地区报告金额
      await ReportAreaModel.upsert({
        checkId: check,
        areaCode: checkAreaModel.areaCode,
        budget: budgetModel.budget
      });
      // TODO: 历史功能暂时禁用 3. 保存地区报告历史金额
      // await ReportAreaHistoryModel.upsert({
      //   checkId: check,
      //   areaCode: checkAreaModel.areaCode,
      //   budget: budgetModel.budget,
      //   // 是考核年份且是自动打分, 则日期减一天, 因为算的是前一天的数据
      //   date: dayjs()
      //     .subtract(isCheckYear && isAuto ? 0 : 1, 'd')
      //     .toDate()
      // });
    }
    debug(`${check} 金额分配结束`);
  }

  /**
   * 手动打分
   * @param ruleId 细则id
   * @param code 地区code或机构id
   * @param score 分数
   * @param remark 备注
   */
  async manualScore(ruleId, code, score, remark) {
    const rule = await CheckRuleModel.findOne({where: {ruleId: ruleId}});
    if (!rule) throw new KatoCommonError('规则不存在');
    const area = await AreaModel.findOne({where: {code}});
    if (!area) {
      throw new KatoCommonError('打分对象不存在');
    }
    const areaRule = await RuleAreaScoreModel.findOne({
      where: {ruleId, areaCode: code}
    });
    if (!areaRule)
      throw new KatoCommonError('打分对象与细则并未绑定，不允许打分');
    if (score > rule.ruleScore)
      throw new KatoCommonError('分数不能高于细则的满分');
    //保存打分结果
    await RuleAreaScoreModel.upsert({
      ruleId,
      areaCode: code,
      score
    });
    //保存打分备注和历史
    await ManualScoreHistoryModel.upsert({
      ruleId: ruleId,
      code: code,
      creatorId: Context.current.user.id,
      score: score,
      remark: remark
    });
  }

  /***
   * 获取手动打分历史
   * @param ruleId 细则id
   * @param code  地区code或者机构id
   */
  async manualScoreHistory(ruleId, code) {
    return ManualScoreHistoryModel.findAll({
      where: {ruleId, code},
      include: [UserModel],
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * 上传定性考核附件
   *
   * @param rule 细则id
   * @param area 地区code
   * @param attachments 附件文件对象
   */
  async upload(rule, area, attachments) {
    return await appDB.joinTx(async () => {
      // 判断当前考核细则, 拥有定性指标关联关系
      const ruleTags = await appDB.execute(
        `select * from rule_tag where rule = ? and tag = ?`,
        rule,
        MarkTagUsages.Attach.code
      );
      if (ruleTags.length === 0)
        throw new KatoRuntimeError(`当前考核细则未绑定定性指标`);

      // 设置oss的key
      const ossName = `/attach/appraisal/attachment/${uuid()}${path.extname(
        attachments.originalname
      )}`;
      // 插入数据
      await appDB.execute(
        `insert into rule_area_attach(id, rule, area, name, url) values (?, ?, ?, ?, ?)`,
        uuid(),
        rule,
        area,
        attachments.originalname,
        ossName
      );
      // 写入oss
      await unifs.writeFile(ossName, attachments.buffer);
      // 返回URL
      return await unifs.getExternalUrl(ossName);
    });
  }

  /**
   * 获取指定考核细则和地区的附件列表
   *
   * @param rule 考核细则id
   * @param area 地区code
   */
  async listAttachments(rule, area) {
    // 判断当前考核细则, 拥有定性指标关联关系
    const ruleTags = await appDB.execute(
      `select * from rule_tag where rule = ? and tag = ?`,
      rule,
      MarkTagUsages.Attach.code
    );
    if (ruleTags.length === 0)
      throw new KatoRuntimeError(`当前考核细则未绑定定性指标`);

    // 查询附件表
    return await Promise.all(
      (
        await appDB.execute(
          `select * from rule_area_attach where rule = ? and area = ?`,
          rule,
          area
        )
      ).map(async it => ({...it, url: await unifs.getExternalUrl(it.url)}))
    );
  }

  /**
   * 删除定性指标附件
   *
   * @param rule 考核细则id
   * @param id 定性指标附件id
   */
  async delAttachment(rule, id) {
    // 获取当前时间;
    const now = dayjs();
    return await appDB.joinTx(async () => {
      const attachDate = await appDB.execute(
        `select attach_start_date, attach_end_date from rule_tag where rule = ?`,
        rule
      );
      const attachStart = attachDate[0]?.attach_start_date;
      const attachEnd = attachDate[0]?.attach_end_date;

      if (now.diff(attachStart, 'day') < 0 || now.diff(attachEnd, 'day') > 0)
        throw new KatoCommonError('请在有效上传时间内删除');
      const url = (
        await appDB.execute(`select url from rule_area_attach where id = ?`, id)
      )[0]?.url;
      if (url) await unifs.deleteFile(url);

      return await appDB.execute(
        `delete from rule_area_attach where id = ?`,
        id
      );
    });
  }
}
