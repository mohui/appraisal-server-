import {
  BasicTagDataModel,
  CheckHospitalModel,
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  MarkHospitalModel,
  RegionModel,
  ReportHospitalHistoryModel,
  ReportHospitalModel,
  RuleHospitalAttachModel,
  RuleHospitalBudgetModel,
  RuleHospitalModel,
  RuleHospitalScoreModel,
  RuleProjectModel,
  RuleTagModel,
  sql as sqlRender
} from '../database';
import {KatoCommonError, should, validate} from 'kato-server';
import {
  BasicTagUsages,
  MarkTagUsages,
  TagAlgorithmUsages
} from '../../common/rule-score';
import * as dayjs from 'dayjs';
import {v4 as uuid} from 'uuid';
import {appDB, originalDB} from '../app';
import {Op, QueryTypes} from 'sequelize';
import * as path from 'path';
import {ossClient} from '../../util/oss';
import {Context} from './context';
import {Decimal} from 'decimal.js';
import {Projects} from '../../common/project';

/**
 * 获取百分数字符串, 默认返回'0'
 *
 * @param numerator 分子
 * @param denominator 分母
 */
function percentString(numerator: number, denominator: number): string {
  if (denominator) {
    const rate = numerator / denominator;
    if (rate > 1) return '100%';
    return ((numerator / denominator) * 100).toFixed(0) + '%';
  } else {
    return '0';
  }
}

async function queryList(params) {
  let sql = sqlRender(
    `
            select
            vh.h_id as "hospitalId",
            vh.hishospid
            from hospital_mapping vh
            where vh.h_id in ({{#each ids}}{{? this}}{{#sep}},{{/sep}}{{/each}})
            group by vh.h_id,vh.hishospid
    `,
    params
  );
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const hospitals = await appQuery(sql[0], sql[1]);
  sql = sqlRender(
    `
            select
            vw.operateorganization,
            cast(sum(vw.score) as int) as "workPoint"
            from view_workscoretotal vw
            where 1 = 1
             {{#if projectIds}} and projecttype in ({{#each projectIds}}{{? this}}{{#sep}},{{/sep}}{{/each}}){{/if}}
             and missiontime >= {{? start}}
             and missiontime < {{? end}}
            group by vw.operateorganization
    `,
    params
  );
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const workPoints = await originalQuery(sql[0], sql[1]);
  return Array.from(
    new Set(
      hospitals
        .filter(
          h =>
            workPoints.filter(p => p.operateorganization === h.hishospid)
              .length > 0
        )
        .map(i => i.hospitalId)
    )
  ).map(hospitalId => ({
    hospitalId,
    workPoint: workPoints
      .filter(
        p =>
          hospitals.filter(
            h =>
              h.hospitalId === hospitalId &&
              h.hishospid === p.operateorganization
          ).length > 0
      )
      .reduce((result, current) => (result += current.workPoint), 0)
  }));
}

async function queryProjectWorkPoint(params) {
  let sql = sqlRender(
    `
            select
            vh.h_id as "hospitalId",
            vh.hishospid
            from hospital_mapping vh
            where vh.h_id = {{? hospitalId}}
            group by vh.h_id,vh.hishospid
    `,
    params
  );
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const hospitals = await appQuery(sql[0], sql[1]);
  sql = sqlRender(
    `
            select
            vw.projecttype as "projectId",
            vw.operateorganization,
            cast(sum(vw.score) as int) as "workPoint"
            from view_workscoretotal vw
            where projecttype in ({{#each projectIds}}{{? this}}{{#sep}},{{/sep}}{{/each}})
             and missiontime >= {{? start}}
             and missiontime < {{? end}}
            group by vw.projecttype,vw.operateorganization
    `,
    params
  );
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const workPoints = await originalQuery(sql[0], sql[1]);
  return Array.from(
    new Set(
      workPoints
        .filter(
          p =>
            hospitals.filter(h => p.operateorganization === h.hishospid)
              .length > 0
        )
        .map(i => i.projectId)
    )
  ).map(projectId => ({
    projectId,
    workPoint: workPoints
      .filter(
        p =>
          p.projectId === projectId &&
          hospitals.filter(h => p.operateorganization === h.hishospid).length >
            0
      )
      .reduce((result, current) => (result += current.workPoint), 0)
  }));
}

async function appQuery(sql, params) {
  return appDB.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

async function originalQuery(sql, params) {
  return originalDB.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

async function getLevelRegion(
  regionCodeList,
  hospitalMinRegionLevel,
  currentLevel
) {
  let sql = `
select
        r.level,r.code,
        case r.level `;
  // eslint-disable-next-line for-direction
  for (let i = hospitalMinRegionLevel; i >= currentLevel; i--)
    sql +=
      ` when ` +
      i +
      ` then r` +
      (i == currentLevel ? `` : hospitalMinRegionLevel + currentLevel - i) +
      `.code`;
  sql += ` else null end as current_level_region
    from region r`;
  // eslint-disable-next-line for-direction
  for (let i = hospitalMinRegionLevel; i > currentLevel; i--)
    sql +=
      `
        left join region r` +
      (i - 1) +
      ` on r` +
      (i - 1) +
      `.code=r` +
      (i == hospitalMinRegionLevel ? `` : i) +
      `.parent`;
  //机构检索对应区域
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const sqlRender1 = sqlRender(
    sql +
      `
where r.code in({{#each code}}{{? this}}{{#sep}},{{/sep}}{{/each}})`,
    {
      code: regionCodeList
    }
  );
  return await appQuery(sqlRender1[0], sqlRender1[1]);
}

/**
 * 考核体系打分任务状态
 */
export const jobStatus = {};

export default class ScoreHospitalCheckRules {
  async autoScoreAllCheck(isAuto) {
    await Promise.all(
      (await CheckSystemModel.findAll()).map(it =>
        this.autoScoreCheck(it.checkId, isAuto === undefined ? true : isAuto)
      )
    );
  }

  /**
   * 考核体系打分
   *
   * @param id 考核体系id
   */
  async autoScoreCheck(id, isAuto) {
    if (jobStatus[id]) throw new KatoCommonError('当前考核体系正在打分');
    // 标记打分状态, 正在打分
    jobStatus[id] = true;
    try {
      for (const hospital of await CheckHospitalModel.findAll({
        where: {checkId: id}
      }))
        await this.autoScoreHospitalCheck(hospital.hospitalId, id, !!isAuto); // 考核体系-机构打分
      // 金额分配
      await this.checkBudget(id);
      // 更新打分时间
      await CheckSystemModel.update(
        {
          runTime: dayjs().toDate()
        },
        {where: {checkId: id}}
      );
    } catch (e) {
      console.error('autoScoreCheck: ', e);
      throw new KatoCommonError('当前考核体系打分失败');
    } finally {
      // 标记打分状态, 打分结束
      jobStatus[id] = false;
    }
  }

  /**
   * 机构考核细则
   * @param hospitalId
   * @param checkId
   */
  async autoScoreHospitalCheck(hospitalId, checkId, isAuto) {
    // 查机构
    const hospital = await HospitalModel.findOne({
      where: {id: hospitalId}
    });
    if (!hospital) throw new KatoCommonError(`id为 ${hospitalId} 的机构不存在`);
    // 查机构标记
    const mark = await MarkHospitalModel.findOne({
      where: {
        hospitalId: hospital.id
      }
    });
    // 查机构考核细则
    const ruleModels: [RuleHospitalModel] = await RuleHospitalModel.findAll({
      where: {
        auto: true,
        hospitalId: hospital.id
      },
      include: [{model: CheckRuleModel, where: {checkId}}]
    });
    // 循环所有考核细则
    for (const ruleModel of ruleModels) {
      // 查考核细则对应的指标算法
      const ruleTagModels = await RuleTagModel.findAll({
        where: {
          ruleId: ruleModel.ruleId
        }
      });
      // 默认打分 0分
      let score = 0;
      // 循环所有的指标算法, 计算得分
      for (const tagModel of ruleTagModels) {
        // 健康档案建档率
        if (tagModel.tag === MarkTagUsages.S01.code) {
          // 查询服务总人口数
          const basicData = await BasicTagDataModel.findOne({
            where: {
              code: BasicTagUsages.DocPeople,
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果服务总人口数不存在, 直接跳过
          if (!basicData?.value) continue;

          // 根据指标算法, 计算得分
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.S00) {
            score += tagModel.score;
          }
          if (
            tagModel.algorithm === TagAlgorithmUsages.N01.code &&
            !mark?.S00
          ) {
            score += tagModel.score;
          }
          if (tagModel.algorithm === TagAlgorithmUsages.egt.code && mark?.S00) {
            const rate = mark?.S00 / basicData.value / tagModel.baseline;
            score += tagModel.score * (rate > 1 ? 1 : rate);
          }
        }

        // 健康档案规范率
        if (tagModel.tag === MarkTagUsages.S23.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.S23)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.S23)
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
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.S03)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.S03)
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
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果老年人人数不存在, 直接跳过
          if (!basicData?.value) continue;
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.O00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.O00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.egt.code && mark?.O00) {
            const rate = mark.O00 / basicData.value / tagModel.baseline;
            score += tagModel.score * (rate > 1 ? 1 : rate);
          }
        }
        // 老年人中医药健康管理率
        if (tagModel.tag === MarkTagUsages.O02.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.O02)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.O02)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.O00 &&
            mark?.O02
          ) {
            const rate = mark.O02 / mark.O00 / tagModel.baseline;
            score += tagModel.score * (rate > 1 ? 1 : rate);
          }
        }

        // 高血压健康管理
        if (tagModel.tag === MarkTagUsages.H00.code) {
          // 查询高血压人数
          const basicData = await BasicTagDataModel.findOne({
            where: {
              code: BasicTagUsages.HypertensionPeople,
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果查询高血压人数不存在, 直接跳过
          if (!basicData?.value) continue;
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.H00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.H00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.egt.code && mark?.H00) {
            const rate = mark.H00 / basicData.value / tagModel.baseline;
            score += tagModel.score * (rate > 1 ? 1 : rate);
          }
        }

        // 高血压规范管理率
        if (tagModel.tag === MarkTagUsages.H01.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.H01)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.H01)
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
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.H02)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.H02)
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
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果查询糖尿病人数不存在, 直接跳过
          if (!basicData?.value) continue;
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.D00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.D00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.egt.code && mark?.D00) {
            const rate = mark.D00 / basicData.value / tagModel.baseline;
            score += tagModel.score * (rate > 1 ? 1 : rate);
          }
        }

        // 糖尿病规范管理率
        if (tagModel.tag === MarkTagUsages.D01.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.D01)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.D01)
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
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.D02)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.D02)
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
        // 定性指标得分
        if (tagModel.tag === MarkTagUsages.Attach.code) {
          //查询定性指标和机构表
          const attach = await RuleHospitalAttachModel.findAll({
            where: {
              ruleId: tagModel.ruleId,
              hospitalId: hospitalId,
              updatedAt: {
                [Op.gt]: tagModel.attachStartDate,
                [Op.lt]: tagModel.attachEndDate
              }
            }
          });
          if (attach?.length) {
            if (!tagModel?.baseline) score += tagModel.score;

            //有上传文件数量的要求
            if (tagModel?.baseline) {
              const rate = attach.length / tagModel.baseline;
              score += tagModel.score * (rate < 1 ? rate : 1);
            }
          }
        }
      }
      // 查询机构考核得分
      const ruleHospitalScoreObject = {
        ruleId: ruleModel.ruleId,
        hospitalId: ruleModel.hospitalId
      };
      let ruleHospitalScoreModel = await RuleHospitalScoreModel.findOne({
        where: ruleHospitalScoreObject
      });
      // 刷新最新得分
      if (!ruleHospitalScoreModel) {
        ruleHospitalScoreModel = new RuleHospitalScoreModel({
          ...ruleHospitalScoreObject,
          score,
          id: uuid()
        });
      } else {
        ruleHospitalScoreModel.score = score;
      }
      // 保存
      await ruleHospitalScoreModel.save();
    }

    // 考核满分
    const total = (
      await RuleHospitalModel.findAll({
        where: {hospitalId: hospitalId},
        include: [{model: CheckRuleModel, where: {checkId}}]
      })
    ).reduce((result, current) => (result += current?.rule?.ruleScore ?? 0), 0);
    // 机构总得分
    const scores = (
      await RuleHospitalScoreModel.findAll({
        where: {hospitalId: hospitalId},
        include: [{model: CheckRuleModel, where: {checkId}}]
      })
    ).reduce((result, current) => (result += current.score), 0);
    // 机构工分
    const params = {
      ids: [hospitalId],
      start: dayjs()
        .startOf('y')
        .toDate(),
      end: dayjs()
        .startOf('y')
        .add(1, 'y')
        .toDate()
    };
    const workpoints = (await queryList(params))?.[0]?.workPoint ?? 0;
    // 更新机构考核报告表
    await ReportHospitalModel.upsert({
      hospitalId: hospitalId,
      workpoints,
      scores,
      total,
      checkId
    });
    //更新历史得分
    await ReportHospitalHistoryModel.upsert({
      hospitalId: hospitalId,
      date: isAuto
        ? dayjs()
            .subtract(1, 'day') //当前日期减去一天,作为前一天的历史记录保存
            .toDate()
        : dayjs().toDate(),
      score: scores,
      totalScore: total,
      rate: new Decimal(scores).div(total).toNumber() || 0,
      checkId
    });
  }

  /***
   * 根据考核结果进行金额分配
   */
  async checkBudget(checkId) {
    //所有的考核组
    //考核组下绑定的工分项
    //质量系数: 得分/规则总分
    //机构在这些工分项所有的工分*质量系数
    //这个考核组下所有机构的所有矫正后工分
    const ruleGroup = (
      await CheckRuleModel.findAll({
        where: {parentRuleId: {[Op.eq]: null}, checkId},
        attributes: ['ruleId', 'ruleName', 'budget'],
        include: [
          {
            model: RuleProjectModel,
            attributes: ['projectId']
          }
        ]
      })
    ).map(r => r.toJSON());
    for (const group of ruleGroup) {
      const rules = (
        await CheckRuleModel.findAll({
          where: {parentRuleId: group.ruleId},
          attributes: ['ruleId', 'ruleScore', 'parentRuleId'],
          include: [RuleHospitalModel]
        })
      ).map(r => r.toJSON());
      //如果小项下面没有细则,则跳过不计算
      if (rules.length === 0) continue;

      const hospitals = rules[0].ruleHospitals;
      //规则满分
      const totalScore = rules.reduce(
        (result, next) => (result += next.ruleScore),
        0
      );
      //工分项
      const projectIds = group.ruleProject.map(p => p.projectId);
      const ids = hospitals.map(it => it.hospitalId);

      //没有分配机构则跳过不计算
      if (ids.length === 0) continue;

      let allHospitalWorkPoint = [];
      if (projectIds.length === 0) {
        //如果没有配置工分项, 则该规则组的所有机构的工分,矫正工分为0.
        allHospitalWorkPoint = ids.map(it => ({
          hospitalId: it,
          ruleId: group.ruleId,
          workPoint: 0,
          correctWorkPoint: 0
        }));
      } else {
        const params = {
          ids,
          projectIds,
          start: dayjs()
            .startOf('y')
            .toDate(),
          end: dayjs()
            .startOf('y')
            .add(1, 'y')
            .toDate()
        };
        //所有机构的在这个小项的工分情况
        allHospitalWorkPoint = await queryList(params);
        allHospitalWorkPoint = allHospitalWorkPoint.concat(
          //过滤出查询结果中工分为空的机构,给他们的工分值设置为0
          ids
            .filter(id => !allHospitalWorkPoint.some(h => h.hospitalId === id))
            .map(it => ({
              hospitalId: it,
              workPoint: 0
            }))
        );
      }

      //总的矫正后工分值
      let totalWorkPoint = 0;
      for (const hospital of allHospitalWorkPoint) {
        //机构在这个小项下的得分
        const hospitalScore = (
          await RuleHospitalScoreModel.findAll({
            where: {
              hospitalId: hospital.hospitalId,
              ruleId: {[Op.in]: rules.map(r => r.ruleId)}
            }
          })
        )
          .reduce(
            (result, next) => new Decimal(result).add(next?.score ?? 0),
            new Decimal(0)
          )
          .toNumber();
        //求机构的质量系数
        const rate = new Decimal(hospitalScore).div(totalScore).toNumber();
        hospital.correctWorkPoint = (hospital?.workPoint ?? 0) * rate;
        hospital.rate = rate;
        hospital.ruleScore = hospitalScore;
        hospital.ruleId = group.ruleId;
        hospital.ruleTotalScore = totalScore;
        //累加矫正后的总共分
        totalWorkPoint += hospital.correctWorkPoint;
      }
      //分钱
      allHospitalWorkPoint = allHospitalWorkPoint.map(h => ({
        ...h,
        budget:
          totalWorkPoint === 0
            ? 0
            : new Decimal(group.budget)
                .mul(new Decimal(h.correctWorkPoint).div(totalWorkPoint))
                .toNumber()
      }));
      await appDB.transaction(async () => {
        //存起来
        await Promise.all(
          allHospitalWorkPoint.map(
            async it => await RuleHospitalBudgetModel.upsert(it)
          )
        );
      });
    }
  }

  /**
   * 手动打分
   *
   * @param ruleId 细则id
   * @param hospitalId 机构id
   * @param score 分数
   */
  async score(ruleId, hospitalId, score) {
    const rule = await CheckRuleModel.findOne({where: {ruleId: ruleId}});
    if (!rule) throw new KatoCommonError('规则不存在');
    const hospital = await HospitalModel.findOne({where: {id: hospitalId}});
    if (!hospital) throw new KatoCommonError('机构不存在');
    if (score > rule.ruleScore)
      throw new KatoCommonError('分数不能高于细则的满分');
    let model = await RuleHospitalScoreModel.findOne({
      where: {ruleId, hospitalId}
    });
    if (!model) {
      model = new RuleHospitalScoreModel({
        ruleId: ruleId,
        hospitalId: hospitalId,
        score
      });
    } else {
      model.score = score;
    }
    await model.save();
    //机构总得分
    const scores = (
      await RuleHospitalScoreModel.findAll({
        where: {hospitalId},
        attributes: ['score'],
        include: [{model: CheckRuleModel, where: {checkId: rule.checkId}}]
      })
    )
      .reduce(
        (result, current) => new Decimal(result).add(current.score),
        new Decimal(0)
      )
      .toNumber();
    //保存该机构report_hospital表的数据
    await ReportHospitalModel.upsert({
      checkId: rule.checkId,
      hospitalId,
      scores
    });
    //重新进行金额分配
    this.checkBudget(rule.checkId);
  }

  /**
   * 获取考核地区/机构对应的考核总体情况
   *
   * @param code 地区或机构的code
   * @param checkId 考核体系 为空时默认查找主考核体系
   * @return { id: id, name: '名称', score: '考核得分', rate: '质量系数'}
   */
  async total(code, checkId) {
    const regionModel: RegionModel = await RegionModel.findOne({where: {code}});
    if (regionModel) {
      const reduceObject = await CheckHospitalModel.findAll({
        where: {},
        include: [
          {
            model: HospitalModel,
            where: {
              regionId: {
                [Op.like]: `${code}%`
              },
              id: {
                [Op.in]: Context.current.user.hospitals.map(it => it.id)
              }
            },
            include: [
              {
                model: RuleHospitalBudgetModel,
                required: true,
                include: [
                  {
                    model: CheckRuleModel,
                    required: true,
                    include: [
                      {
                        model: CheckSystemModel,
                        where: checkId ? {checkId: checkId} : {checkType: 1}
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            model: CheckSystemModel,
            where: checkId ? {checkId: checkId} : {checkType: 1}
          }
        ]
      }).map(i => {
        return {...i.hospital};
      });
      const resultObject = reduceObject.reduce(
        (res, next) => {
          res.originalScore = new Decimal(res?.originalScore ?? 0).add(
            next?.ruleHospitalBudget?.reduce(
              (r, n) => (r = new Decimal(r).add(n.workPoint)),
              new Decimal(0)
            ) ?? 0
          );
          res.ruleScore = new Decimal(res?.ruleScore ?? 0).add(
            next?.ruleHospitalBudget?.reduce(
              (r, n) => (r = new Decimal(r).add(n.ruleScore)),
              new Decimal(0)
            ) ?? 0
          );
          res.score = new Decimal(res?.score ?? 0).add(
            next?.ruleHospitalBudget?.reduce(
              (r, n) => (r = new Decimal(r).add(n.correctWorkPoint)),
              new Decimal(0)
            ) ?? 0
          );
          res.total = new Decimal(res?.total ?? 0).add(
            next?.ruleHospitalBudget?.reduce(
              (r, n) => (r = new Decimal(r).add(n.ruleTotalScore)),
              new Decimal(0)
            ) ?? 0
          );
          return res;
        },
        {
          originalScore: 0,
          ruleScore: 0,
          total: 0,
          score: 0
        }
      );
      return {
        id: regionModel.code,
        name: regionModel.name,
        score: Number(resultObject.score),
        originalScore: Number(resultObject.originalScore),
        rate: new Decimal(Number(resultObject.ruleScore))
          .div(Number(resultObject.total))
          .toNumber()
      };
    }

    const hospitalModel = await HospitalModel.findOne({
      where: {id: code},
      include: [
        {
          model: RuleHospitalBudgetModel,
          required: false,
          where: {
            hospitalId: {
              [Op.in]: Context.current.user.hospitals.map(it => it.id)
            }
          },
          include: [
            {
              model: CheckRuleModel,
              required: true,
              include: [
                {
                  model: CheckSystemModel,
                  where: checkId ? {checkId: checkId} : {checkType: 1}
                }
              ]
            }
          ]
        }
      ]
    });
    if (hospitalModel) {
      return {
        id: hospitalModel.id,
        name: hospitalModel.name,
        originalScore:
          hospitalModel?.ruleHospitalBudget
            ?.reduce(
              (res, next) => new Decimal(res).add(next.workPoint),
              new Decimal(0)
            )
            .toNumber() ?? 0,
        score:
          hospitalModel?.ruleHospitalBudget
            ?.reduce(
              (res, next) => new Decimal(res).add(next.correctWorkPoint),
              new Decimal(0)
            )
            .toNumber() ?? 0,
        rate:
          hospitalModel?.ruleHospitalBudget
            ?.reduce(
              (res, next) => new Decimal(res).add(next.ruleScore),
              new Decimal(0)
            )
            .div(
              hospitalModel?.ruleHospitalBudget?.reduce(
                (res, next) => new Decimal(res).add(next.ruleTotalScore),
                new Decimal(0)
              )
            )
            .toNumber() ?? 0,
        budget:
          hospitalModel?.ruleHospitalBudget
            ?.reduce(
              (res, next) => new Decimal(res).add(next?.budget ?? 0),
              new Decimal(0)
            )
            .toNumber() ?? 0
      };
    }

    throw new KatoCommonError(`${code} 不存在`);
  }

  /**
   * 获取当前地区机构排行
   *
   * @param code 地区code
   * @param checkId 考核体系 为空时默认查找主考核体系
   */
  async rank(code, checkId) {
    const regionModel = await RegionModel.findOne({where: {code}});
    if (!regionModel) throw new KatoCommonError(`地区 ${code} 不存在`);
    return await Promise.all(
      (
        await CheckHospitalModel.findAll({
          where: {
            hospitalId: {
              [Op.in]: Context.current.user.hospitals.map(it => it.id)
            }
          },
          include: [
            {
              model: HospitalModel,
              where: {region: {[Op.like]: `${regionModel.code}%`}}
            },
            {
              model: CheckSystemModel,
              where: checkId ? {checkId: checkId} : {checkType: 1}
            }
          ]
        })
      ).map(async checkHospital => {
        const item = await this.total(
          checkHospital.hospitalId,
          checkHospital.checkId
        );
        return {
          ...item,
          parent: checkHospital?.hospital?.parent
        };
      })
    );
  }

  /**
   * 获取省市排行
   *
   * @param code 省市code
   */
  async areaRank(code, checkId) {
    const regionModel = await RegionModel.findOne({
      where: {
        code,
        level: {
          [Op.lte]: 3
        }
      }
    });
    if (!regionModel) throw new KatoCommonError(`地区 ${code} 不合法`);
    const checkHospitals = await CheckHospitalModel.findAll({
      where: {hospitalId: Context.current.user.hospitals.map(h => h.id)},
      include: [
        {
          model: CheckSystemModel,
          required: true,
          where: checkId ? {checkId: checkId} : {checkType: 1}
        },
        {model: HospitalModel, include: [RegionModel]}
      ]
    });
    const hospitalCurrentRegions = await getLevelRegion(
      checkHospitals.map(i => i.hospital.region.code),
      Math.max(...checkHospitals.map(i => i.hospital.region.level)),
      regionModel.level + 1
    );
    // 获取所有子地区
    return await Promise.all(
      (
        await RegionModel.findAll({
          where: {
            parent: regionModel.code,
            code: {
              [Op.in]: hospitalCurrentRegions.map(i => i.current_level_region)
            }
          }
        })
      ).map(async region => {
        const result = await this.total(region.code, checkId);
        return {
          ...result,
          ...region.toJSON()
        };
      })
    );
  }

  async upload(ruleId, hospitalId, attachments) {
    const ossName = `/appraisal/attachment/${uuid()}${path.extname(
      attachments.originalname
    )}`;

    let attachURL;
    try {
      attachURL = await ossClient.save(ossName, attachments.buffer);
    } catch (e) {
      console.log(e);
      throw new KatoCommonError('文件上传失败');
    }

    const name = attachments.originalname;
    await new RuleHospitalAttachModel({
      ruleId,
      hospitalId,
      name,
      url: attachURL
    }).save();

    return attachURL;
  }

  async listAttachments(ruleId, hospitalId) {
    return RuleHospitalAttachModel.findAll({
      where: {
        ruleId,
        hospitalId
      }
    });
  }

  async delAttachment(id) {
    return RuleHospitalAttachModel.destroy({
      where: {
        id
      }
    });
  }

  /**
   * 指标解释
   *
   * @param hospitalId 医院id
   * @param ruleId 规则id
   */
  async detail(hospitalId, ruleId) {
    const result = [];
    // 查询规则绑定的关联关系
    const ruleTagModels = await RuleTagModel.findAll({where: {ruleId}});
    const markHospitalModel = await MarkHospitalModel.findOne({
      where: {hospitalId}
    });
    if (!ruleTagModels) throw new KatoCommonError(`当前考核项没有绑定关联关系`);
    for (const ruleTagModel of ruleTagModels) {
      // 建档率
      if (ruleTagModel.tag === MarkTagUsages.S01.code) {
        // 建档率
        // 查询服务总人口数
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.DocPeople,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        if (!basicData?.value) result.push('暂无"辖区内常住居民数"');
        else {
          result.push(
            `${
              MarkTagUsages.S01.name
            } = 建立电子健康档案人数 / 辖区内常住居民数 = ${
              markHospitalModel.S00
            } / ${basicData.value} = ${percentString(
              markHospitalModel.S00,
              basicData.value
            )}`
          );
        }
      }
      // 电子档案规范率
      if (ruleTagModel.tag === MarkTagUsages.S23.code) {
        result.push(
          `${
            MarkTagUsages.S23.name
          } = 规范的电子档案数 / 建立电子健康档案人数 = ${
            markHospitalModel.S23
          } / ${markHospitalModel.S00} = ${percentString(
            markHospitalModel.S23,
            markHospitalModel.S00
          )}`
        );
      }
      // 健康档案使用率
      if (ruleTagModel.tag === MarkTagUsages.S03.code) {
        result.push(
          `${
            MarkTagUsages.S03.name
          } = 档案中有动态记录的档案份数 / 建立电子健康档案人数 = ${
            markHospitalModel.S03
          } / ${markHospitalModel.S00} = ${percentString(
            markHospitalModel.S03,
            markHospitalModel.S00
          )}`
        );
      }

      // 老年人健康管理率
      if (ruleTagModel.tag === MarkTagUsages.O00.code) {
        // 查询老年人人数
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.OldPeople,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        if (!basicData?.value) result.push('暂无"辖区内65岁及以上常住居民数"');
        else {
          result.push(
            `${
              MarkTagUsages.O00.name
            } = 年内接受老年人健康管理人数 / 辖区内65岁及以上常住居民数 = ${
              markHospitalModel.O00
            } / ${basicData.value} = ${percentString(
              markHospitalModel.O00,
              basicData.value
            )}`
          );
        }
      }
      // 老年人中医药健康管理率
      if (ruleTagModel.tag === MarkTagUsages.O02.code) {
        result.push(
          `${
            MarkTagUsages.O02.name
          } = 年内接受中医药健康管理服务的65岁及以上居民数 / 年内接受健康管理的65岁及以上常住居民数 = ${
            markHospitalModel.O02
          } / ${markHospitalModel.O00} = ${percentString(
            markHospitalModel.O02,
            markHospitalModel.O00
          )}`
        );
      }

      // 高血压患者管理率
      if (ruleTagModel.tag === MarkTagUsages.H00.code) {
        // 查询高血压患者人数
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.HypertensionPeople,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        if (!basicData?.value)
          result.push('暂无"年内辖区应管理高血压患者总数"');
        else {
          result.push(
            `${
              MarkTagUsages.H00.name
            } = 一年内已管理的高血压患者数 / 年内辖区应管理高血压患者总数 = ${
              markHospitalModel.H00
            } / ${basicData.value} = ${percentString(
              markHospitalModel.H00,
              basicData.value
            )}`
          );
        }
      }
      // 高血压患者规范管理率
      if (ruleTagModel.tag === MarkTagUsages.H01.code) {
        result.push(
          `${
            MarkTagUsages.H01.name
          } = 按照规范要求进行高血压患者健康管理的人数 / 一年内已管理的高血压患者人数 = ${
            markHospitalModel.H01
          } / ${markHospitalModel.H00} = ${percentString(
            markHospitalModel.H01,
            markHospitalModel.H00
          )}`
        );
      }
      // 高血压患者血压控制率
      if (ruleTagModel.tag === MarkTagUsages.H02.code) {
        result.push(
          `${
            MarkTagUsages.H02.name
          } = 一年内最近一次随访血压达标人数 / 一年内已管理的高血压患者人数 = ${
            markHospitalModel.H02
          } / ${markHospitalModel.H00} = ${percentString(
            markHospitalModel.H02,
            markHospitalModel.H00
          )}`
        );
      }

      // 糖尿病患者管理率
      if (ruleTagModel.tag === MarkTagUsages.D00.code) {
        // 查询糖尿病患者人数
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.DiabetesPeople,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        if (!basicData?.value) result.push('暂无"年内辖区2型糖尿病患者总数"');
        else {
          result.push(
            `${
              MarkTagUsages.D00.name
            } = 一年内已管理的2型糖尿病患者数 / 年内辖区2型糖尿病患者总数 x 100% = ${
              markHospitalModel.D00
            } / ${basicData.value} = ${percentString(
              markHospitalModel.D00,
              basicData.value
            )}`
          );
        }
      }
      // 糖尿病患者规范管理率
      if (ruleTagModel.tag === MarkTagUsages.D01.code) {
        result.push(
          `${
            MarkTagUsages.D01.name
          } = 按照规范要求进行2型糖尿病患者健康管理的人数 / 一年内已管理的2型糖尿病患者人数 x 100% = ${
            markHospitalModel.D01
          } / ${markHospitalModel.D00} = ${percentString(
            markHospitalModel.D01,
            markHospitalModel.D00
          )}`
        );
      }
      // 糖尿病患者血压控制率
      if (ruleTagModel.tag === MarkTagUsages.D02.code) {
        result.push(
          `${
            MarkTagUsages.D02.name
          } = 一年内最近一次随访空腹血糖达标人数 / 一年内已管理的2型糖尿病患者人数 x 100% = ${
            markHospitalModel.D02
          } / ${markHospitalModel.D00} = ${percentString(
            markHospitalModel.D02,
            markHospitalModel.D00
          )}`
        );
      }
    }

    return result;
  }

  /**
   * 各个工分项的详情
   * @param code
   */
  async projectDetail(code, checkId) {
    const hospitalModel = await HospitalModel.findOne({
      where: {id: code},
      include: [
        {
          model: RuleHospitalBudgetModel,
          required: false,
          include: [
            {
              model: CheckRuleModel,
              required: true,
              include: [
                {
                  model: CheckSystemModel,
                  where: checkId ? {checkId: checkId} : {checkType: 1}
                }
              ]
            }
          ]
        }
      ]
    });
    if (hospitalModel) {
      //机构所绑定的小项下的工分项
      const projects = (
        await RuleProjectModel.findAll({
          attributes: ['projectId'],
          where: {
            ruleId: {
              [Op.in]: hospitalModel.ruleHospitalBudget.map(it => it.ruleId)
            }
          },
          include: [
            {
              model: CheckRuleModel,
              required: false,
              include: [
                {
                  model: CheckSystemModel,
                  where: checkId ? {checkId: checkId} : {checkType: 1}
                }
              ]
            }
          ]
        })
      ).map(it => it.toJSON());
      if (projects.length > 0) {
        //按工分项分类查询工分值
        const params = {
          hospitalId: code,
          projectIds: projects.map(it => it.projectId),
          start: dayjs()
            .startOf('y')
            .toDate(),
          end: dayjs()
            .startOf('y')
            .add(1, 'y')
            .toDate()
        };
        let projectWorkPointList = await queryProjectWorkPoint(params);
        projectWorkPointList = projectWorkPointList.concat(
          //过滤查询结果中,工分值为null的工分项,将他们的工分值设为0
          projects
            .filter(
              pro =>
                !projectWorkPointList.some(p => p.projectId === pro.projectId)
            )
            .map(it => ({
              projectId: it.projectId,
              workpoint: 0
            }))
        );
        return projectWorkPointList.map(current => {
          const ruleGroup = projects.find(
            p => p.projectId === current.projectId
          )?.rule;
          current['projectName'] = Projects.find(
            p => p.id === current.projectId
          )?.name;
          //小项名称
          current['ruleName'] = ruleGroup?.ruleName;
          //小项质量系数
          const ruleRate =
            hospitalModel?.ruleHospitalBudget.find(
              rhb => rhb.ruleId === ruleGroup?.ruleId
            )?.rate ?? 0;
          //校正工分
          current['correctWorkpoint'] = current['workpoint'] * ruleRate;
          current['rate'] = ruleRate;
          return current;
        });
      }
      return [];
    }
    throw new KatoCommonError('该机构不存在.');
  }

  /***
   * 质量系数历史趋势
   * @param code:地区code或者机构的id
   */
  async history(code, checkId) {
    const region: RegionModel = await RegionModel.findOne({where: {code}});
    if (region) {
      //查询该地区的机构的历史记录
      const hospitalInRegion = await HospitalModel.findAll({
        where: {
          regionId: {
            [Op.like]: `${code}%`
          },
          id: {
            [Op.in]: Context.current.user.hospitals.map(it => it.id)
          }
        },
        include: [
          {
            model: ReportHospitalHistoryModel,
            separate: true,
            order: [['date', 'asc']],
            include: [
              {
                model: CheckSystemModel,
                where: checkId ? {checkId: checkId} : {checkType: 1}
              }
            ]
          }
        ]
      });
      return hospitalInRegion
        .map(it => it.toJSON())
        .reduce((res, next) => [...res, ...next.reportHospitalHistory], [])
        .reduce((per, next) => {
          //按日期分组
          const current = per.find(it => it.date === next.date);
          if (current) {
            current.score = new Decimal(current.score).add(next.score);
            current.totalScore = new Decimal(current.totalScore).add(
              next.totalScore
            );
          } else
            per.push({
              date: next.date,
              score: new Decimal(next.score),
              totalScore: new Decimal(next.totalScore),
              rate: new Decimal(next.rate)
            });
          return per;
        }, [])
        .map(it => ({
          date: it.date,
          totalScore: it.totalScore.toNumber(),
          score: it.score.toNumber(),
          //地区下所有机构的(总得分/总满分)作为地区的质量系数
          rate: new Decimal(it.score).div(it.totalScore).toNumber() || 0
        }));
    }

    try {
      //授权范围外的数据不允许查看
      if (Context.current.user.hospitals.filter(i => i.id === code).length < 1)
        return [];
      const hospital = await HospitalModel.findOne({
        where: {
          id: code
        },
        include: [
          {
            model: ReportHospitalHistoryModel,
            separate: true,
            order: [['date', 'asc']],
            attributes: ['date', 'score', 'totalScore', 'rate'],
            include: [
              {
                model: CheckSystemModel,
                where: checkId ? {checkId: checkId} : {checkType: 1}
              }
            ]
          }
        ]
      });
      if (hospital) return hospital?.reportHospitalHistory ?? [];
      return [];
    } catch (e) {
      throw new KatoCommonError('所传参数code,不是地区code或机构id');
    }
  }

  /**
   * 人脸采集信息
   * @param code
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
      faceData = (
        await appDB.execute(
          `select
            coalesce(sum(mk."S00"),0)::integer as "total",
            coalesce(sum(mk."S30"),0)::integer as "face" from mark_hospital mk
            inner join hospital h
            on h.region like ? where h.id=mk.hospital`,
          [`${code}%`]
        )
      )[0];
    } else {
      try {
        const hospital = await HospitalModel.findOne({where: {id: code}});
        //如果是一家机构
        if (hospital)
          faceData = (
            await appDB.execute(
              `select
                coalesce(sum(mk."S00"),0)::integer as "total",
                coalesce(sum(mk."S30"),0)::integer as "face" from mark_hospital mk
                where hospital=?`,
              [code]
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
}
