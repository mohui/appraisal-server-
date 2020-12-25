import * as dayjs from 'dayjs';
import {appDB, originalDB} from '../../app';
import {KatoRuntimeError} from 'kato-server';
import {getLeaves, getOriginalArray} from '../group';
import {
  BasicTagUsages,
  MarkTagUsages,
  TagAlgorithmUsages
} from '../../../common/rule-score';
import {
  CheckAreaModel,
  BasicTagDataModel,
  RuleAreaBudgetModel,
  RuleAreaScoreModel,
  ReportAreaModel,
  sql as sqlRender
} from '../../database';
import {Op} from 'sequelize';
import {Projects as ProjectMapping} from '../../../common/project';

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
  const result = [];
  // 处理年份
  const date = dayjs(year, 'YYYY');
  const start = date.format('YYYY-MM-DD');
  const end = date.add(1, 'y').format('YYYY-MM-DD');

  // 处理工分项映射
  for (const o of organization) {
    // 查询his数据
    const his: string = o.region.startsWith('340222') ? '340222' : '340203';
    // 当前机构对应的原始工分项
    const originalProjectIds: string[] = ProjectMapping.filter(it =>
      projects.find(p => p === it.id)
    )
      .map(it => it.mappings.find(m => m.type === his)?.id)
      .filter(it => it);
    const [sql, params] = sqlRender(
      `
        select
          cast(sum(score) as float) as score
        from view_workScoreTotal
        where MissionTime >= {{? start}}
          and MissionTime < {{? end}}
          and OperateOrganization = {{? id}}
          {{#if projects.length}}
          and ProjectType in ({{#each projects}}{{? this}}{{#sep}},{{/sep}}{{/each}})
          {{/if}}
          `,
      {projects: originalProjectIds, start, end, id: o.id}
    );
    const scores: {score: number}[] = await originalDB.execute(sql, ...params);
    result.push(...scores);
  }
  return result;
}

function debug(...args) {
  console.log(dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'), ...args);
}

export default class Score {
  /**
   * 考核体系自动打分
   *
   * @param id 考核体系id
   */
  async autoScore(id) {
    // 查询考核对象
    const checkAreaModels: CheckAreaModel[] = await CheckAreaModel.findAll({
      where: {
        checkId: id
      }
    });
    for (const ca of checkAreaModels) {
      debug(`${ca.areaCode} 系统打分开始`);
      await this.score(id, ca.areaCode, null);
      debug(`${ca.areaCode} 系统打分结束`);
    }
  }

  /**
   * 系统打分
   *
   * @param check 考核体系
   * @param group 考核对象
   * @param year 年份
   */
  async score(check, group, year) {
    debug('获取marks开始');
    const mark = await getMarks(group);
    debug('获取marks结束');
    try {
      // 默认年份为当前年, 如果是1月1日, 则为上一年
      if (!year) {
        const now = dayjs();
        if (now.day() === 1 && now.month() === 1) {
          year = now
            .subtract(1, 'y')
            .year()
            .toString();
        } else {
          year = dayjs()
            .year()
            .toString();
        }
      }
      // 地区报告model
      let reportModel: ReportAreaModel = await ReportAreaModel.findOne({
        where: {areaCode: group}
      });

      if (!reportModel)
        reportModel = new ReportAreaModel({
          checkId: check,
          areaCode: group,
          workPoint: 0,
          totalWorkPoint: 0,
          score: 0,
          totalScore: 0,
          rate: 0
        });
      // 查询当前地区对应的叶子节点
      const leaves = await getLeaves(group);
      // 获取原始机构id数组
      const viewHospitals = await getOriginalArray(leaves.map(it => it.code));
      // 查询考核对象对应的考核体系的考核小项
      // language=PostgreSQL
      const parentRules: {id: string}[] = await appDB.execute(
        `
          select cr.rule_id as id
          from check_area cg
                 inner join check_system cs on cs.check_id = cg.check_system -- 关联考核体系
                 inner join check_rule cr on cg.check_system = cr.check_id -- 关联考核细则
          where cr.parent_rule_id is null
            and cs.check_year = ?
            and cg.area = ?`,
        year,
        group
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
          let score = 0;
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
                score += tagModel.score;
              }
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.S00
              ) {
                score += tagModel.score;
              }
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.S00
              ) {
                const rate = mark?.S00 / basicData.value / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }

            // 健康档案规范率
            if (tagModel.tag === MarkTagUsages.S23.code) {
              if (
                tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                mark?.S23
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.S23
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.S23 &&
                mark?.S00
              ) {
                const rate = mark.S23 / mark.S00 / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }

            // 健康档案使用率
            if (tagModel.tag === MarkTagUsages.S03.code) {
              if (
                tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                mark?.S03
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.S03
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.S03 &&
                mark?.S00
              ) {
                const rate = mark.S03 / mark.S00 / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
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
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.O00
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.O00
              ) {
                const rate = mark.O00 / basicData.value / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
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
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.O02
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                basicData?.value &&
                mark?.O02
              ) {
                const rate = mark.O02 / basicData.value / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
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
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.H00
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.H00
              ) {
                const rate = mark.H00 / basicData.value / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }

            // 高血压规范管理率
            if (tagModel.tag === MarkTagUsages.H01.code) {
              if (
                tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                mark?.H01
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.H01
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.H00 &&
                mark?.H01
              ) {
                const rate = mark.H01 / mark.H00 / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }

            // 高血压控制率
            if (tagModel.tag === MarkTagUsages.H02.code) {
              if (
                tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                mark?.H02
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.H02
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.H00 &&
                mark?.H02
              ) {
                const rate = mark.H02 / mark.H00 / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
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
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.D00
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.D00
              ) {
                const rate = mark.D00 / basicData.value / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }

            // 糖尿病规范管理率
            if (tagModel.tag === MarkTagUsages.D01.code) {
              if (
                tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                mark?.D01
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.D01
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.D00 &&
                mark?.D01
              ) {
                const rate = mark.D01 / mark.D00 / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }

            // 糖尿病控制率
            if (tagModel.tag === MarkTagUsages.D02.code) {
              if (
                tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                mark?.D02
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.D02
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.D00 &&
                mark?.D02
              ) {
                const rate = mark.D02 / mark.D00 / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }
            //TODO: 定性指标得分
            // if (tagModel.tag === MarkTagUsages.Attach.code) {
            //   //查询定性指标和机构表
            //   const attach = await RuleHospitalAttachModel.findAll({
            //     where: {
            //       ruleId: tagModel.,
            //       hospitalId: hospitalId,
            //       updatedAt: {
            //         [Op.gt]: tagModel.attachStartDate,
            //         [Op.lt]: tagModel.attachEndDate
            //       }
            //     }
            //   });
            //   if (attach?.length) {
            //     if (!tagModel?.baseline) score += tagModel.score;
            //
            //     //有上传文件数量的要求
            //     if (tagModel?.baseline) {
            //       const rate = attach.length / tagModel.baseline;
            //       score += tagModel.score * (rate < 1 ? rate : 1);
            //     }
            //   }
            // }

            //健康教育指标
            if (tagModel.tag.indexOf('HE') == 0) {
              if (
                tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                mark?.[tagModel.tag]
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.[tagModel.tag]
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.[tagModel.tag]
              ) {
                const rate = mark?.[tagModel.tag] / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
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
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.SC00
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.SC00
              ) {
                const rate = mark.SC00 / basicData.value / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }

            //协助开展的实地巡查次数
            if (tagModel.tag === MarkTagUsages.SC01.code) {
              if (
                tagModel.algorithm === TagAlgorithmUsages.Y01.code &&
                mark?.SC01
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.N01.code &&
                !mark?.SC01
              )
                score += tagModel.score;
              if (
                tagModel.algorithm === TagAlgorithmUsages.egt.code &&
                mark?.SC01
              ) {
                const rate = mark?.SC01 / tagModel.baseline;
                score += tagModel.score * (rate > 1 ? 1 : rate);
              }
            }
          }
          // 保存机构得分
          await RuleAreaScoreModel.upsert({
            ruleId: rule.id,
            areaCode: group,
            score
          });
          // 考核小项得分
          parentScore += score;
          debug('考核细则', rule.id, '结束');
        }
        // 计算考核小项的质量系数
        const rate =
          parentTotalScore === 0 ? 0 : parentScore / parentTotalScore;

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
        const workPoint = scoreArray.reduce(
          (prev, current) => (prev += current.score),
          0
        );
        debug('考核小项获取总工分结束');

        // 保存小项考核表
        await RuleAreaBudgetModel.upsert({
          ruleId: parentRule.id,
          areaCode: group,
          workPoint: workPoint,
          correctWorkPoint: workPoint * rate,
          score: parentScore,
          totalScore: parentTotalScore,
          rate: rate
        });

        // 地区参与校正的工分
        reportModel.workPoint += workPoint;
        // 地区考核得分
        reportModel.score = parentScore;
        // 地区考核满分
        reportModel.totalScore = parentTotalScore;
        debug('考核小项', parentRule.id, '结束');
      }
      // 地区质量系数
      reportModel.rate =
        reportModel.totalScore === 0
          ? 0
          : reportModel.score / reportModel.totalScore;
      debug('考核地区获取总工分开始');
      // 获取总工分数组
      const scoreArray: {score: number}[] = await getWorkPoints(
        viewHospitals,
        [],
        year
      );
      // 地区总工分
      reportModel.totalWorkPoint = scoreArray.reduce(
        (prev, current) => (prev += current.score),
        0
      );
      debug('考核地区获取总工分结束');
      // 保存机构报告
      await reportModel.save();
    } catch (e) {
      throw new KatoRuntimeError(e);
    }
  }
}
