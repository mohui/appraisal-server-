import * as dayjs from 'dayjs';
import {Decimal} from 'decimal.js';
import {appDB, originalDB} from '../../app';
import {KatoCommonError, KatoRuntimeError} from 'kato-server';
import {getLeaves, getOriginalArray} from '../group';
import {
  BasicTagUsages,
  MarkTagUsages,
  TagAlgorithmUsages
} from '../../../common/rule-score';
import {
  BasicTagDataModel,
  CheckAreaModel,
  CheckSystemModel,
  RuleAreaAttachModel,
  RuleAreaBudgetModel,
  RuleAreaScoreModel,
  ReportAreaModel,
  ReportAreaHistoryModel,
  sql as sqlRender
} from '../../database';
import {Op} from 'sequelize';
import {Projects as ProjectMapping} from '../../../common/project';
import {Context} from '../context';
import {Permission} from '../../../common/permission';

/**
 * 查询考核对象的标记数据
 *
 * @param group 地区code
 */
async function getMarks(
  group: string
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
  SC00: number;
  SC01: number;
}> {
  const leaves = await getLeaves(group);
  const viewHospitals = await getOriginalArray(leaves.map(it => it.code));
  const result = [];
  for (const id of viewHospitals.map(it => it.id)) {
    // language=PostgreSQL
    const marks = await originalDB.execute(
      `
        select *
        from mark_organization
        where id = ?
      `,
      id
    );
    if (marks[0]) result.push(marks[0]);
  }
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
      SC00: 0,
      SC01: 0
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
  organization: {id: string; code: string; region: string}[],
  projects: string[],
  year: string
) {
  // 处理年份
  const date = dayjs(year, 'YYYY');
  const start = date.format('YYYY-MM-DD');
  const end = date.add(1, 'y').format('YYYY-MM-DD');

  // 处理工分项映射
  const result = (
    await Promise.all(
      organization.map(async o => {
        // 查询his数据
        const his: string = o.region.startsWith('340222') ? '340222' : '340203';
        // 当前机构对应的原始工分项
        const originalProjectIds: string[] = ProjectMapping.filter(it =>
          projects.find(p => p === it.id)
        )
          .map(it => it.mappings.find(m => m.type === his)?.id)
          .filter(it => it);
        let sql = '';
        let params = [];
        if (projects?.length > 0) {
          const ret = sqlRender(
            `
{{#each projects}}
(select
  cast(sum(score) as float) as score
from view_workScoreTotal
where ProjectType = {{? project}}
  and OperateOrganization = {{? id}}
  and MissionTime >= {{? start}}
  and MissionTime < {{? end}}
)
{{#sep}} union {{/sep}}
{{/each}}
          `,
            {
              projects: originalProjectIds.map(it => ({
                start,
                end,
                id: o.id,
                project: it
              }))
            }
          );
          sql = ret[0];
          params = ret[1];
        } else {
          const ret = sqlRender(
            `
select
  cast(sum(score) as float) as score
from view_workScoreTotal
where OperateOrganization = {{? id}}
  and MissionTime >= {{? start}}
  and MissionTime < {{? end}}
          `,
            {start, end, id: o.id}
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

    // 补充绑定对象的字段
    // TODO: 暂无地区权限判断
    result.rows = await Promise.all(
      result.rows.map(async it => {
        const counts = await CheckAreaModel.count({
          where: {checkId: it.checkId}
        });
        return {
          ...it.toJSON(),
          hospitalCount: counts
        };
      })
    );

    return result;
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

      await this.checkBudget(id, isAuto);
    } catch (e) {
      console.error('autoScoreCheck: ', e);
      throw new KatoCommonError('当前考核体系打分失败');
    } finally {
      // 标记打分状态, 打分结束
      jobStatus[id] = false;
    }
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
    debug('获取marks开始');
    const mark = await getMarks(group);
    debug('获取marks结束');
    try {
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
      debug(`打分年度: ${year}; 考核年度: ${checkModel.checkYear}`);
      // 是否是考核年度; 是: 系统打分得计算关联关系, 否: 系统打分直接累加细则得分
      const isCheckYear = year === checkModel.checkYear;
      // 地区报告model
      const reportModel = {
        checkId: check,
        areaCode: group,
        workPoint: 0,
        totalWorkPoint: 0,
        score: 0,
        totalScore: 0,
        rate: 0
      };
      // 查询当前地区对应的叶子节点
      const leaves = await getLeaves(group);
      // 获取原始机构id数组
      const viewHospitals = await getOriginalArray(leaves.map(it => it.code));
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
              auto: true
            });
          }
          // 当前考核年份且考核细则是自动打分
          if (isCheckYear && ruleAreaScoreModel.auto) {
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
                       attach_start_date as attachStartDate,
                       attach_end_date   as attachEndDate
                from rule_tag
                where rule = ?`,
              rule.id
            );
            // 根据关联关系计算得分
            for (const tagModel of formulas) {
              // 健康档案建档率
              if (tagModel.tag === MarkTagUsages.S01.code) {
                // 查询服务总人口数
                const basicData = await BasicTagDataModel.findOne({
                  where: {
                    code: BasicTagUsages.DocPeople,
                    hospital: {
                      [Op.in]: leaves.map(it => it.code)
                    },
                    year: year
                  }
                });
                // 如果服务总人口数不存在, 直接跳过
                if (!basicData?.value) continue;

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
                  const rate = mark?.S00 / basicData.value / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 健康档案规范率
              if (tagModel.tag === MarkTagUsages.S23.code) {
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
                const basicData = await BasicTagDataModel.findOne({
                  where: {
                    code: BasicTagUsages.OldPeople,
                    hospital: {
                      [Op.in]: leaves.map(it => it.code)
                    },
                    year: year
                  }
                });
                // 如果老年人人数不存在, 直接跳过
                if (!basicData?.value) continue;
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
                  const rate = mark.O00 / basicData.value / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }
              // 老年人中医药健康管理率
              if (tagModel.tag === MarkTagUsages.O02.code) {
                // 查询老年人人数
                const basicData = await BasicTagDataModel.findOne({
                  where: {
                    code: BasicTagUsages.OldPeople,
                    hospital: {
                      [Op.in]: leaves.map(it => it.code)
                    },
                    year: year
                  }
                });
                // 如果查询老年人人数不存在, 直接跳过
                if (!basicData?.value) continue;
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
                  basicData?.value &&
                  mark?.O02
                ) {
                  const rate = mark.O02 / basicData.value / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 高血压健康管理
              if (tagModel.tag === MarkTagUsages.H00.code) {
                // 查询高血压人数
                const basicData = await BasicTagDataModel.findOne({
                  where: {
                    code: BasicTagUsages.HypertensionPeople,
                    hospital: {
                      [Op.in]: leaves.map(it => it.code)
                    },
                    year: year
                  }
                });
                // 如果查询高血压人数不存在, 直接跳过
                if (!basicData?.value) continue;
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
                  const rate = mark.H00 / basicData.value / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 高血压规范管理率
              if (tagModel.tag === MarkTagUsages.H01.code) {
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
                const basicData = await BasicTagDataModel.findOne({
                  where: {
                    code: BasicTagUsages.DiabetesPeople,
                    hospital: {
                      [Op.in]: leaves.map(it => it.code)
                    },
                    year: year
                  }
                });
                // 如果查询糖尿病人数不存在, 直接跳过
                if (!basicData?.value) continue;
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
                  const rate = mark.D00 / basicData.value / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              // 糖尿病规范管理率
              if (tagModel.tag === MarkTagUsages.D01.code) {
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

              //健康教育指标
              if (tagModel.tag.indexOf('HE') == 0) {
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
                const basicData = await BasicTagDataModel.findOne({
                  where: {
                    code: BasicTagUsages.Supervision,
                    hospital: {
                      [Op.in]: leaves.map(it => it.code)
                    },
                    year: year
                  }
                });
                if (!basicData?.value) continue;
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
                  const rate = mark.SC00 / basicData.value / tagModel.baseline;
                  ruleAreaScoreModel.score +=
                    tagModel.score * (rate > 1 ? 1 : rate);
                }
              }

              //协助开展的实地巡查次数
              if (tagModel.tag === MarkTagUsages.SC01.code) {
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
        // 计算考核小项的质量系数
        const rate =
          parentTotalScore === 0
            ? 0
            : new Decimal(parentScore)
                .div(new Decimal(parentTotalScore))
                .toNumber();

        // 根据考核小项查询绑定的工分项
        const projects = (
          await appDB.execute(
            `select "projectId" as id from rule_project where rule = ?`,
            parentRule.id
          )
        ).map(it => it.id);
        debug('考核小项获取总工分开始');
        // 获取工分数组
        const scoreArray: {score: number}[] = await getWorkPoints(
          viewHospitals,
          projects,
          year
        );
        // 累计工分, 即参与校正工分值
        const workPoint = scoreArray
          .reduce((prev, current) => {
            prev = prev.add(new Decimal(current.score));
            return prev;
          }, new Decimal(0))
          .toNumber();
        debug('考核小项获取总工分结束', workPoint);

        // 保存小项考核表
        await RuleAreaBudgetModel.upsert({
          ruleId: parentRule.id,
          areaCode: group,
          workPoint: workPoint,
          correctWorkPoint: new Decimal(workPoint)
            .mul(new Decimal(rate))
            .toNumber(),
          score: parentScore,
          totalScore: parentTotalScore,
          rate: rate
        });

        // 地区参与校正的工分
        reportModel.workPoint = new Decimal(workPoint)
          .add(new Decimal(reportModel.workPoint))
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
        viewHospitals,
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
      // 保存机构报告历史
      await ReportAreaHistoryModel.upsert({
        ...reportModel,
        // 是考核年份且是自动打分, 则日期减一天, 因为算的是前一天的数据
        date: dayjs()
          .subtract(isCheckYear && isAuto ? 0 : 1, 'd')
          .toDate()
      });
      debug(`${check} ${group} 系统打分结束`);
    } catch (e) {
      debug(`${check} ${group} 系统打分异常: ${e}`);
      throw new KatoRuntimeError(e);
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
    debug(`打分年度: ${year}; 考核年度: ${checkModel.checkYear}`);
    // 是否是考核年度; 是: 系统打分得计算关联关系, 否: 系统打分直接累加细则得分
    const isCheckYear = year === checkModel.checkYear;

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
          ruleAreaBudgetModel.budget = new Decimal(parentRuleModel.budget)
            .mul(new Decimal(ruleAreaBudgetModel.correctWorkPoint))
            .div(totalCorrectWorkPoints)
            .toNumber();
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
      // 3. 保存地区报告历史金额
      await ReportAreaHistoryModel.upsert({
        checkId: check,
        areaCode: checkAreaModel.areaCode,
        budget: budgetModel.budget,
        // 是考核年份且是自动打分, 则日期减一天, 因为算的是前一天的数据
        date: dayjs()
          .subtract(isCheckYear && isAuto ? 0 : 1, 'd')
          .toDate()
      });
    }
    debug(`${check} 金额分配结束`);
  }
}
