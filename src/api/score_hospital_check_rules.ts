import {
  BasicTagDataModel,
  CheckHospitalModel,
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  RegionModel,
  ReportHospitalHistoryModel,
  ReportHospitalModel,
  RuleHospitalAttachModel,
  RuleHospitalBudgetModel,
  RuleHospitalModel,
  RuleHospitalScoreModel,
  RuleProjectModel,
  RuleTagModel,
  sql as sqlRender,
  ScoreRemarkHistoryModel,
  UserModel
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
export function percentString(numerator: number, denominator: number): string {
  if (denominator) {
    const rate = numerator / denominator;
    if (rate > 1) return '100%';
    return ((numerator / denominator) * 100).toFixed(0) + '%';
  } else {
    return '0';
  }
}

/**
 * 根据机构id,公分id,时间范围 查询机构下的工分值
 *
 * @param params object
 * param.ids 机构id
 * param.projectIds 公分id,可不传,
 *  没传: 查询机构下的所有id,
 *  传: 需要找公分里面的 mappings 里的id, 因为繁昌的需要公分id和芜湖的存在区别
 * param.start 工分开始时间
 * param.end 工分结束时间
 */
async function queryList(params) {
  // 查询机构之间的对应关系和所属his
  let [sql, paramters] = sqlRender(
    `select hishospid as id,
                        h_id as "hospitalId"
                from hospital_mapping mapping
                where h_id in ({{#each ids}}{{? this}}{{#sep}},{{/sep}}{{/each}})`,
    params
  );
  const hospitalMappings = await appDB.execute(sql, ...paramters);

  // 查询所属his
  const hospitals = await HospitalModel.findAll({
    where: {
      id: {
        [Op.in]: params.ids
      }
    }
  });

  const hisHospitals = hospitalMappings.map(it => ({
    ...it,
    his: hospitals.find(item => item.id === it.hospitalId)?.his
  }));

  // 根据his归纳数组,所属his相同的机构放到一起
  const hospitalHisIds = [];
  for (const it of hisHospitals) {
    const hospital = hospitalHisIds.find(item => item.his === it.his);
    if (!hospital) {
      hospitalHisIds.push({
        id: [it.id],
        hospitalId: [it.hospitalId],
        his: it.his
      });
    } else {
      hospital.id.push(it.id);
      hospital.hospitalId.push(it.hospitalId);
    }
  }

  // 最后的返回值数组
  const returnList = [];
  // 根据机构找到其对应的公分id(芜湖和繁昌的公分值id存在差异,所以需要区分是否是繁昌的)
  for (const hospital of hospitalHisIds) {
    const proParam = {
      operateorganization: hospital.id,
      start: params.start,
      end: params.end
    };
    // 如果传了公分id,需要根据机构his筛选出mapping里的公分id
    if (params.projectIds) {
      // 需要判断机构属于芜湖还是繁昌 筛选公分id
      proParam['projectIds'] = params.projectIds
        .map(item => {
          return Projects.find(p => p.id === item)?.mappings?.find(
            mapping => mapping.type === hospital.his
          )?.id;
        })
        .filter(it => it);
      // 如果经过筛选后没有公分id,赋值所有机构公分为0分
      if (proParam['projectIds'].length === 0) {
        // 给机构复制为0;
        const hospitalZeroScoreList = proParam.operateorganization.map(it => {
          return {
            operateorganization: it,
            workPoint: 0
          };
        });
        returnList.push(...hospitalZeroScoreList);
      } else {
        // 如果经过筛选后有公分id,根据公分id查询此机构下公分值
        [sql, paramters] = sqlRender(
          `select
            operateorganization,
            cast(sum(vw.score) as int) as "workPoint"
            from view_workscoretotal vw
            where 1 = 1
             {{#if projectIds}} and projecttype in ({{#each projectIds}}{{? this}}{{#sep}},{{/sep}}{{/each}}){{/if}}
             and missiontime >= {{? start}}
             and missiontime < {{? end}}
             and operateorganization in ({{#each operateorganization}}{{? this}}{{#sep}},{{/sep}}{{/each}})
             group by operateorganization
          `,
          proParam
        );
        returnList.push(...(await originalDB.execute(sql, ...paramters)));
      }
    } else {
      [sql, paramters] = sqlRender(
        `select
            operateorganization,
            cast(sum(vw.score) as int) as "workPoint"
            from view_workscoretotal vw
            where 1 = 1
             {{#if projectIds}} and projecttype in ({{#each projectIds}}{{? this}}{{#sep}},{{/sep}}{{/each}}){{/if}}
             and missiontime >= {{? start}}
             and missiontime < {{? end}}
             and operateorganization in ({{#each operateorganization}}{{? this}}{{#sep}},{{/sep}}{{/each}})
             group by operateorganization
          `,
        proParam
      );
      returnList.push(...(await originalDB.execute(sql, ...paramters)));
    }
  }
  return returnList.map(i => ({
    workPoint: i.workPoint,
    hospitalId: hisHospitals.filter(h => h.id === i.operateorganization)?.[0]
      ?.hospitalId
  }));
}

async function queryProjectWorkPoint(params) {
  const hisHospitalId = (
    await appDB.execute(
      `select hishospid as id from hospital_mapping where h_id = ?`,
      params.hospitalId
    )
  )?.[0]?.id;
  params.operateorganization = hisHospitalId;
  const [sql, paramters] = sqlRender(
    `select
        projecttype as "projectId",
        cast(sum(vw.score) as int) as workPoint
        from view_workscoretotal vw
        where projecttype in ({{#each projectIds}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        and missiontime >= {{? start}}
        and missiontime < {{? end}}
        and operateorganization = {{? operateorganization}}
        group by projecttype`,
    params
  );
  return await originalDB.execute(sql, ...paramters);
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
   * @param isAuto 是否自动跑分
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
   *
   * @param hospitalId 机构id
   * @param checkId 考核体系id
   * @param isAuto 是否自动跑分
   */
  async autoScoreHospitalCheck(hospitalId, checkId, isAuto) {
    // 查机构
    const hospital = await HospitalModel.findOne({
      where: {id: hospitalId}
    });
    if (!hospital) throw new KatoCommonError(`id为 ${hospitalId} 的机构不存在`);
    // 查机构标记
    const mark = (
      await originalDB.execute(
        `select * from mark_organization
                where id=?`,
        (
          await appDB.execute(
            `select hishospid from hospital_mapping where h_id=?`,
            hospital.id
          )
        )?.[0]?.hishospid
      )
    )[0];
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
      if (ruleTagModels.length < 1) score = ruleModel.rule.ruleScore;
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
          // 如果查询老年人人数不存在, 直接跳过
          if (!basicData?.value) continue;
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.O02)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.O02)
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
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          if (!basicData?.value) continue;
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.SC00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.SC00)
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
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.SC01)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.SC01)
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
      // 保存机构考核得分
      await RuleHospitalScoreModel.upsert({
        ruleId: ruleModel.ruleId,
        hospitalId: ruleModel.hospitalId,
        score
      });
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
    /** 所有的考核组
     *
     * 考核组下绑定的工分项
     * 质量系数: 得分/规则总分
     * 机构在这些工分项所有的工分*质量系数
     * 这个考核组下所有机构的所有矫正后工分
     */

    // 查询考核小项
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
    //循环考核小项
    for (const group of ruleGroup) {
      // 查询此考核小项下的所有考核细则及其所有机构
      const rules = (
        await CheckRuleModel.findAll({
          where: {parentRuleId: group.ruleId},
          attributes: ['ruleId', 'ruleScore', 'parentRuleId'],
          include: [RuleHospitalModel]
        })
      ).map(r => r.toJSON());
      //如果小项下面没有细则,则跳过不计算
      if (rules.length === 0) continue;

      // 取出所有的机构id
      const hospitals = rules[0].ruleHospitals;

      //规则满分(所有细则总分和)
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
   * @param remark 备注
   */
  async score(ruleId, hospitalId, score, remark) {
    const rule = await CheckRuleModel.findOne({where: {ruleId: ruleId}});
    if (!rule) throw new KatoCommonError('规则不存在');
    const hospital = await HospitalModel.findOne({where: {id: hospitalId}});
    if (!hospital) throw new KatoCommonError('机构不存在');
    const hospitalRule = await RuleHospitalModel.findOne({
      where: {ruleId, hospitalId}
    });
    if (!hospitalRule)
      throw new KatoCommonError('机构与细则并未绑定，不允许打分');
    if (score > rule.ruleScore)
      throw new KatoCommonError('分数不能高于细则的满分');
    await RuleHospitalScoreModel.upsert({
      ruleId,
      hospitalId,
      score
    });
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
    //保存打分备注和历史
    await ScoreRemarkHistoryModel.upsert({
      ruleId: ruleId,
      hospitalId: hospitalId,
      creatorId: Context.current.user.id,
      score: score,
      remark: remark
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
      const sql = sqlRender(
        `select
COALESCE(sum("correctWorkPoint"),0) as "score",
COALESCE(sum("workPoint"),0) as "originalScore",
COALESCE(sum("ruleScore"),0) as "ruleScore",
COALESCE(sum("ruleTotalScore"),0) as "total",
COALESCE(sum(rhb.budget),0) as "budget"
{{#if regionId}}{{else}},max(hm.hishospid) hishospid{{/if}}
from rule_hospital_budget rhb
{{#if regionId}}inner join hospital h on h.id=rhb.hospital{{else}}inner join hospital_mapping hm on hm.h_id=rhb.hospital{{/if}}
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
      const resultObject = (await appDB.execute(sql[0], ...sql[1]))[0];
      if (regionModel) {
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
      if (hospitalModel) {
        const originalWorkPoints =
          (
            await originalDB.execute(
              `select cast(sum(score) as int) as scores from view_workscoretotal where operateorganization = ? and missiontime >= ? and missiontime < ?`,
              resultObject.hishospid,
              dayjs()
                .startOf('y')
                .toDate(),
              dayjs()
                .startOf('y')
                .add(1, 'y')
                .toDate()
            )
          )[0]?.scores ?? 0;

        return {
          id: hospitalModel.id,
          name: hospitalModel.name,
          originalScore: Number(resultObject.originalScore),
          score: Number(resultObject.score),
          rate: new Decimal(Number(resultObject.ruleScore))
            .div(Number(resultObject.total))
            .toNumber(),
          budget: Number(resultObject.budget),
          originalWorkPoint: originalWorkPoints
        };
      }
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
    const checkHospitals = await CheckHospitalModel.findAll({
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
    });
    const sql = sqlRender(
      `select
rhb.hospital as id,
h.name,
h.parent,
COALESCE(sum("workPoint"),0) as "originalScore",
COALESCE(sum("correctWorkPoint"),0) as "score",
COALESCE(sum("ruleScore"),0) as "ruleScore",
COALESCE(sum("ruleTotalScore"),0) as "total",
COALESCE(sum(rhb.budget),0) as "budget"
from rule_hospital_budget rhb
inner join hospital h on h.id=rhb.hospital
inner join check_rule cr on cr.rule_id=rhb.rule
inner join check_system cs on cs.check_id=cr.check_id and cr.parent_rule_id is null
{{#if checkType}} and cs.check_type={{? checkType}}{{/if}}
{{#if checkId}} and cs.check_id={{? checkId}}{{/if}}
    where rhb.hospital in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        group by rhb.hospital,h.name,h.parent`,
      {
        hospitalIds: checkHospitals.map(it => it.hospitalId),
        checkType: checkId ? null : 1,
        checkId
      }
    );
    const data = (await appDB.execute(sql[0], ...sql[1])).map(i => ({
      id: i.id,
      name: i.name,
      originalScore: new Decimal(i.originalScore).toNumber(),
      score: new Decimal(i.score).toNumber(),
      rate: new Decimal(i.ruleScore).div(i.total).toNumber() ?? 0,
      budget: new Decimal(i.budget).toNumber(),
      parent: i.parent
    }));
    return data.concat(
      checkHospitals
        .filter(i => data.filter(d => d.id === i.hospital.id).length === 0)
        .map(i => ({
          id: i.hospital.id,
          name: i.hospital.name,
          originalScore: 0,
          score: 0,
          rate: 0,
          budget: 0,
          parent: i.hospital.parent
        }))
    );
  }

  /**
   * 获取省市排行
   *
   * @param code 省市code
   * @param checkId 考核体系id
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
    // 获取所有授权子地区
    let authorizedRegions = await RegionModel.findAll({
      where: {
        parent: regionModel.code
      }
    });
    const hospitalCurrentRegions = checkHospitals
      .map(ch => ({
        code: ch.hospital.region.code,
        // eslint-disable-next-line @typescript-eslint/camelcase
        current_level_region:
          authorizedRegions.filter(
            r => ch.hospital.region.code.indexOf(r.code) === 0
          )?.[0]?.code ?? null
      }))
      .filter(i => i.current_level_region !== null);
    authorizedRegions = authorizedRegions.filter(
      i =>
        hospitalCurrentRegions.filter(j => i.code === j.current_level_region)
          .length > 0
    );
    const sql = sqlRender(
      `select
h.region,
COALESCE(sum("correctWorkPoint"),0) as "score",
COALESCE(sum("workPoint"),0) as "originalScore",
COALESCE(sum("ruleScore"),0) as "ruleScore",
COALESCE(sum("ruleTotalScore"),0) as "total"
from rule_hospital_budget rhb
inner join hospital h on h.id=rhb.hospital
inner join check_rule cr on cr.rule_id=rhb.rule and cr.parent_rule_id is null
inner join check_system cs on cs.check_id=cr.check_id
{{#if checkType}} and cs.check_type={{? checkType}}{{/if}}
{{#if checkId}} and cs.check_id={{? checkId}}{{/if}}
inner join check_hospital ch on ch.hospital=rhb.hospital and ch.check_system=cs.check_id
    where rhb.hospital in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        and ({{#each regionIds}}position({{? this}} in h.region)=1{{#sep}} or {{/sep}}{{/each}})
group by h.region`,
      {
        hospitalIds: Context.current.user.hospitals.map(it => it.id),
        regionId: code,
        checkType: checkId ? null : 1,
        checkId,
        regionIds: authorizedRegions.map(r => r.code)
      }
    );
    const data = await appDB.execute(sql[0], ...sql[1]);
    const result = authorizedRegions.map(region => ({
      result: {...region.toJSON(), id: region.code, name: region.name},
      data: data.filter(
        i =>
          hospitalCurrentRegions.filter(
            j => j.current_level_region === region.code && j.code === i.region
          ).length > 0
      )
    }));
    return result.map(i => ({
      ...i.result,
      score:
        i.data
          .reduce(
            (res, next) => new Decimal(res).add(next.score),
            new Decimal(0)
          )
          .toNumber() ?? 0,
      originalScore:
        i.data
          .reduce(
            (res, next) => new Decimal(res).add(next.originalScore),
            new Decimal(0)
          )
          .toNumber() ?? 0,
      rate:
        new Decimal(
          Number(
            i.data
              .reduce(
                (res, next) => new Decimal(res).add(next.ruleScore),
                new Decimal(0)
              )
              .toNumber()
          )
        )
          .div(
            Number(
              i.data
                .reduce(
                  (res, next) => new Decimal(res).add(next.total),
                  new Decimal(0)
                )
                .toNumber()
            )
          )
          .toNumber() ?? 0
    }));
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
    const markHospitalModel = (
      await originalDB.execute(
        `select * from mark_organization
                where id::varchar =?`,
        (
          await appDB.execute(
            `select hishospid from hospital_mapping where h_id=?`,
            hospitalId
          )
        )?.[0]?.hishospid
      )
    )[0];
    if (ruleTagModels.length < 1)
      throw new KatoCommonError(`当前考核项没有绑定关联关系`);
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
              markHospitalModel?.S00
            } / ${basicData.value} = ${percentString(
              markHospitalModel?.S00,
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
            markHospitalModel?.S23
          } / ${markHospitalModel.S00} = ${percentString(
            markHospitalModel?.S23,
            markHospitalModel?.S00
          )}`
        );
      }
      // 健康档案使用率
      if (ruleTagModel.tag === MarkTagUsages.S03.code) {
        result.push(
          `${
            MarkTagUsages.S03.name
          } = 档案中有动态记录的档案份数 / 建立电子健康档案人数 = ${
            markHospitalModel?.S03
          } / ${markHospitalModel?.S00} = ${percentString(
            markHospitalModel?.S03,
            markHospitalModel?.S00
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
              markHospitalModel?.O00
            } / ${basicData.value} = ${percentString(
              markHospitalModel?.O00,
              basicData.value
            )}`
          );
        }
      }
      // 老年人中医药健康管理率
      if (ruleTagModel.tag === MarkTagUsages.O02.code) {
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
        if (!basicData?.value) {
          result.push('暂无"辖区内65岁及以上常住居民数"');
          continue;
        }
        result.push(
          `${
            MarkTagUsages.O02.name
          } = 年内接受中医药健康管理服务的65岁及以上居民数 / 年内接受健康管理的65岁及以上常住居民数 = ${
            markHospitalModel?.O02
          } / ${basicData.value} = ${percentString(
            markHospitalModel?.O02,
            basicData.value
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
              markHospitalModel?.H00
            } / ${basicData.value} = ${percentString(
              markHospitalModel?.H00,
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
            markHospitalModel?.H01
          } / ${markHospitalModel?.H00} = ${percentString(
            markHospitalModel?.H01,
            markHospitalModel?.H00
          )}`
        );
      }
      // 高血压患者血压控制率
      if (ruleTagModel.tag === MarkTagUsages.H02.code) {
        result.push(
          `${
            MarkTagUsages.H02.name
          } = 一年内最近一次随访血压达标人数 / 一年内已管理的高血压患者人数 = ${
            markHospitalModel?.H02
          } / ${markHospitalModel?.H00} = ${percentString(
            markHospitalModel?.H02,
            markHospitalModel?.H00
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
              markHospitalModel?.D00
            } / ${basicData.value} = ${percentString(
              markHospitalModel?.D00,
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
            markHospitalModel?.D01
          } / ${markHospitalModel?.D00} = ${percentString(
            markHospitalModel?.D01,
            markHospitalModel?.D00
          )}`
        );
      }
      // 糖尿病患者血压控制率
      if (ruleTagModel.tag === MarkTagUsages.D02.code) {
        result.push(
          `${
            MarkTagUsages.D02.name
          } = 一年内最近一次随访空腹血糖达标人数 / 一年内已管理的2型糖尿病患者人数 x 100% = ${
            markHospitalModel?.D02
          } / ${markHospitalModel?.D00} = ${percentString(
            markHospitalModel?.D02,
            markHospitalModel?.D00
          )}`
        );
      }
      //健康教育
      if (ruleTagModel.tag.indexOf('HE') == 0) {
        result.push(
          `${MarkTagUsages[ruleTagModel.tag].name} = ${
            markHospitalModel?.[ruleTagModel.tag]
          }`
        );
      }
      //卫生计生监督协管信息报告率
      if (ruleTagModel.tag === MarkTagUsages.SC00.code) {
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.Supervision,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        if (!basicData?.value) result.push('暂无"发现的事件或线索次数"');
        else {
          result.push(
            `${
              MarkTagUsages.SC00.name
            } = 报告的事件或线索次数 / 发现的事件或线索次数 x 100% = ${
              markHospitalModel?.SC00
            } / ${basicData.value} = ${percentString(
              markHospitalModel?.SC00,
              basicData.value
            )}`
          );
        }
      }
      //协助开展的实地巡查次数
      if (ruleTagModel.tag === MarkTagUsages.SC01.code) {
        result.push(`${MarkTagUsages.SC01.name} = ${markHospitalModel?.SC01}`);
      }
    }
    return result;
  }

  /**
   * 各个工分项的详情
   *
   * @param code 机构id
   * @param checkId 考核体系id
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

      // 取出机构所属的区级权限
      const type = hospitalModel.his;

      if (projects.length > 0) {
        // 取出权限下的工分项id(繁昌的和其他区的有区别)
        const newProject = projects.map(it => ({
          ...(Projects.find(item => item.id === it.projectId)?.mappings?.find(
            mapping => mapping.type === type
          ) ?? {}),
          parent: it.projectId
        }));

        let projectWorkPointChildrenList = [];
        // 筛选以后,可能存在没有公分项的
        if (newProject.length > 0) {
          //按工分项分类查询工分值
          const params = {
            hospitalId: code,
            projectIds: newProject.map(it => it.id),
            start: dayjs()
              .startOf('y')
              .toDate(),
            end: dayjs()
              .startOf('y')
              .add(1, 'y')
              .toDate()
          };
          projectWorkPointChildrenList = await queryProjectWorkPoint(params);
        }
        let projectWorkPointList = projectWorkPointChildrenList.map(it => {
          const itemObj = newProject.find(item => item.id === it.projectId);
          return {workpoint: it.workpoint, projectId: itemObj.parent};
        });
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
   *
   * @param code:地区code或者机构的id
   * @param checkId
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
              `select hm.hishospid from hospital_mapping hm
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

  /***
   * 获取手动打分历史
   * @param ruleId
   * @param hospitalId
   */
  async scoreHistory(ruleId, hospitalId) {
    return ScoreRemarkHistoryModel.findAll({
      where: {ruleId, hospitalId},
      include: [UserModel],
      order: [['created_at', 'DESC']]
    });
  }
}
