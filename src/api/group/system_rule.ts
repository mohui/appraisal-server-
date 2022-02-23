import {
  RuleAreaScoreModel,
  CheckRuleModel,
  RuleTagModel,
  RuleAreaBudgetModel
} from '../../database/model';
import {KatoCommonError, should, validate} from 'kato-server';
import {appDB, originalDB} from '../../app';

import {MarkTagUsages} from '../../../common/rule-score';
import * as dayjs from 'dayjs';
import {Decimal} from 'decimal.js';
import {getYear} from './system_area';

export default class SystemRule {
  /**
   * 机构考核详情
   *
   * @param code 地区code或机构id
   * @param year 年份
   */
  @validate(should.string().required(), should.number().allow(null))
  async checks(code, year) {
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

    if (!areas) throw new KatoCommonError(`地区 ${code} 不合法`);

    // 如果没有传年份,获取年份
    year = getYear(year);

    // 通过地区编码和年份获取考核主信息
    const checkSystem = (
      await appDB.execute(
        // language=PostgreSQL
        `
          SELECT "checkSystem"."check_id"   AS "checkId",
                 "checkSystem"."check_name" AS "checkName",
                 "checkSystem"."create_by"  AS "create_by",
                 "checkSystem"."update_by"  AS "update_by",
                 "checkSystem"."check_year" AS "checkYear",
                 "checkSystem"."status"     AS "status",
                 "checkSystem"."remarks"    AS "remarks",
                 "checkSystem"."check_type" AS "checkType",
                 "checkSystem"."run_time"   AS "runTime",
                 "checkSystem"."created_at" AS "created_at",
                 "checkSystem"."updated_at" AS "updated_at"
          FROM "check_area" AS "CheckArea"
                 INNER JOIN "check_system" AS "checkSystem"
                            ON "CheckArea"."check_system" = "checkSystem"."check_id" AND "checkSystem"."check_year" = ?
          WHERE "CheckArea"."area" = ?
          LIMIT 1
        `,
        year,
        code
      )
    )[0];

    if (!checkSystem) throw new KatoCommonError(`该地区未绑定考核`);

    // 待看
    const children = await Promise.all(
      // 查询考核细则
      (
        await CheckRuleModel.findAll({
          where: {checkId: checkSystem.checkId, parentRuleId: null},
          order: [['created_at', 'ASC']],
          include: [RuleAreaBudgetModel]
        })
      ).map(async rule => {
        // 根据考核小项,查询考核细则
        const children = (
          await CheckRuleModel.findAll({
            attributes: {exclude: ['budget']},
            where: {parentRuleId: rule.ruleId},
            order: [['created_at', 'ASC']],
            include: [
              {
                model: RuleAreaScoreModel,
                where: {areaCode: code},
                required: false
              },
              RuleTagModel
            ]
          })
        ).map(it => {
          it = it.toJSON();
          // 指标解释数组, 默认为null, 即考核细则未配置关联关系
          it.details = null;
          // rul_area_score表有数据, 构造数组
          if (it?.ruleAreaScores?.length > 0) {
            it.details = it.ruleAreaScores.reduce(
              (prev, current) => [...prev, ...current.details],
              []
            );
          }
          it.score = it.ruleAreaScores.reduce(
            (result, current) => (result += current.score),
            0
          );
          it.auto =
            it.ruleAreaScores.find(area => area.areaCode === code)?.auto ??
            true;
          it.isUploadAttach = false;
          //含定性指标,并且判断是否在可上传时间范围内
          const ruleTagDateRange = it.ruleTags.find(
            tag =>
              tag.tag === MarkTagUsages.Attach.code &&
              tag.attachStartDate &&
              tag.attachEndDate
          );
          if (ruleTagDateRange) {
            it.isUploadAttach =
              dayjs().isAfter(ruleTagDateRange.attachStartDate) &&
              dayjs().isBefore(ruleTagDateRange.attachEndDate);
          }
          return it;
        });
        return {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          ruleScore: rule.ruleScore,
          budget:
            rule.ruleAreaBudgets
              .filter(it => it.areaCode === code)
              .reduce(
                (res, next) => new Decimal(res).add(next.budget),
                new Decimal(0)
              )
              .toNumber() ?? 0,
          children
        };
      })
    );
    const returnValue = checkSystem.toJSON();
    returnValue.children = children;
    return returnValue;
  }
}
