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
   * @return {
   * "checkId": 考核体系id,
   * "checkName": 考核体系名称,
   * "create_by": 创建人,
   * "update_by": 修改人,
   * "checkYear": 考核年度,
   * "status": 状态,
   * "remarks": 备注,
   * "checkType": 考核类型: 默认为0; 1: 主考核; 0: 临时考核',
   * "runTime": 跑分时间,
   * "created_at": 创建时间,
   * "updated_at": 修改时间,
   * "children": [
   *  {
   *    "ruleId": 考核小项id,
   *    "ruleName": 考核小项名称,
   *    "ruleScore": 总分,
   *    "budget": 分配金额,
   *    "children": [
   *      {
   *        "ruleId": 考核细则id,
   *        "ruleName": 考核细则名称,
   *        "parentRuleId": 上级(考核小项)id,
   *        "checkId": 考核体系id,
   *        "ruleScore": 得分,
   *        "checkStandard": 考核标准,
   *        "checkMethod": 考核方法,
   *        "evaluateStandard": 评分标准,
   *        "create_by": 创建人,
   *        "update_by": 修改人,
   *        "status": 状态,
   *        "created_at": 创建时间,
   *        "updated_at": 修改时间,
   *        "ruleAreaScores": [
   *          {
   *            "ruleId": 细则id,
   *            "areaCode": 考核地区,
   *            "score": 得分,
   *            "auto": 是否自动打分, 默认是,
   *            "details": [指标解释数组],
   *            "created_at": 创建时间,
   *            "updated_at": 修改时间
   *          }
   *        ],
   *        "ruleTags": [
   *          {
   *            "id": 主键,
   *            "ruleId": 考核细则id,
   *            "tag": "考核指标",
   *            "algorithm": "计算方式",
   *            "baseline": 参考值; 个别计算方式, 需要参考值,
   *            "score": 分值,
   *            "attachStartDate": 定性指标上传附件的开始时间,
   *            "attachEndDate": 定性指标上传附件的结束时间,
   *            "created_at": 创建时间,
   *            "updated_at": 修改时间
   *          }
   *        ],
   *        "details": [指标解释数组],
   *        "score": 分值,
   *        "auto": 是否自动打分, 默认是,
   *        "isUploadAttach": 判断是否在可上传时间范围内
   *      }
   *    ]
   *  }]
   * }
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

    // 根据考核id查询考核小项
    const checkRuleParents = await appDB.execute(
      // language=PostgreSQL
      `
        SELECT "CheckRule"."rule_id"                AS "ruleId",
               "CheckRule"."rule_name"              AS "ruleName",
               "CheckRule"."parent_rule_id"         AS "parentRuleId",
               "CheckRule"."check_id"               AS "checkId",
               "CheckRule"."rule_score"             AS "ruleScore",
               "CheckRule"."check_standard"         AS "checkStandard",
               "CheckRule"."check_method"           AS "checkMethod",
               "CheckRule"."evaluate_standard"      AS "evaluateStandard",
               "CheckRule"."create_by",
               "CheckRule"."update_by",
               "CheckRule"."status",
               "CheckRule"."budget",
               "CheckRule"."created_at",
               "CheckRule"."updated_at",
               "ruleAreaBudgets"."rule"             AS "ruleAreaBudgetsRuleId",
               "ruleAreaBudgets"."area"             AS "ruleAreaBudgetsAreaCode",
               "ruleAreaBudgets"."budget"           AS "ruleAreaBudgetsBudget",
               "ruleAreaBudgets"."workPoint"        AS "ruleAreaBudgetsWorkPoint",
               "ruleAreaBudgets"."correctWorkPoint" AS "ruleAreaBudgetsCorrectWorkPoint",
               "ruleAreaBudgets"."rate"             AS "ruleAreaBudgetsRate",
               "ruleAreaBudgets"."score"            AS "ruleAreaBudgetsScore",
               "ruleAreaBudgets"."totalScore"       AS "ruleAreaBudgetsTotalScore",
               "ruleAreaBudgets"."created_at"       AS "ruleAreaBudgetsCreated_at",
               "ruleAreaBudgets"."updated_at"       AS "ruleAreaBudgetsUpdated_at"
        FROM "check_rule" AS "CheckRule"
               LEFT OUTER JOIN "rule_area_budget" AS "ruleAreaBudgets"
                               ON "CheckRule"."rule_id" = "ruleAreaBudgets"."rule"
        WHERE "CheckRule"."check_id" = ?
          AND "CheckRule"."parent_rule_id" IS NULL
        ORDER BY "CheckRule"."created_at"
      `,
      checkSystem.checkId
    );
    // 考核小项整理后结果
    const parentRules = [];
    // 整理考核小项
    for (const parentRule of checkRuleParents) {
      //  查找是否在数组中, 如果在,push进子集中,如果不在,push进数组中
      const find = parentRules.find(it => it?.ruleId === parentRule.ruleId);
      // 如果查找到
      if (find) {
        if (parentRule.ruleAreaBudgetsAreaCode === code) {
          find.budget =
            new Decimal(find.budget ?? 0)
              .add(parentRule.ruleAreaBudgetsBudget ?? 0)
              .toNumber() ?? 0;
        }
      } else {
        parentRules.push({
          ruleId: parentRule.ruleId,
          ruleName: parentRule.ruleName,
          ruleScore: parentRule.ruleScore,
          budget:
            parentRule.ruleAreaBudgetsAreaCode === code
              ? Number(parentRule.ruleAreaBudgetsBudget)
              : 0,
          children: []
        });
      }
    }
    // 查询所有的考核细则
    const ruleChildrenList = await appDB.execute(
      // language=PostgreSQL
      `
        SELECT "CheckRule"."rule_id"           AS "ruleId",
               "CheckRule"."rule_name"         AS "ruleName",
               "CheckRule"."parent_rule_id"    AS "parentRuleId",
               "CheckRule"."check_id"          AS "checkId",
               "CheckRule"."rule_score"        AS "ruleScore",
               "CheckRule"."check_standard"    AS "checkStandard",
               "CheckRule"."check_method"      AS "checkMethod",
               "CheckRule"."evaluate_standard" AS "evaluateStandard",
               "CheckRule"."create_by",
               "CheckRule"."update_by",
               "CheckRule"."status",
               "CheckRule"."created_at",
               "CheckRule"."updated_at",
               "ruleAreaScores"."rule"         AS "ruleAreaScoresRuleId",
               "ruleAreaScores"."area"         AS "ruleAreaScoresAreaCode",
               "ruleAreaScores"."score"        AS "ruleAreaScoresScore",
               "ruleAreaScores"."auto"         AS "ruleAreaScoresAuto",
               "ruleAreaScores"."details"      AS "ruleAreaScoresDetails",
               "ruleAreaScores"."created_at"   AS "ruleAreaScoresCreated_at",
               "ruleAreaScores"."updated_at"   AS "ruleAreaScoresUpdated_at",
               "ruleTags"."id"                 AS "ruleTagsId",
               "ruleTags"."rule"               AS "ruleTagsRuleId",
               "ruleTags"."tag"                AS "ruleTagsTag",
               "ruleTags"."algorithm"          AS "ruleTagsAlgorithm",
               "ruleTags"."baseline"           AS "ruleTagsBaseline",
               "ruleTags"."score"              AS "ruleTagsScore",
               "ruleTags"."attach_start_date"  AS "ruleTagsAttachStartDate",
               "ruleTags"."attach_end_date"    AS "ruleTagsAttachEndDate",
               "ruleTags"."created_at"         AS "ruleTagsCreated_at",
               "ruleTags"."updated_at"         AS "ruleTagsUpdated_at"
        FROM "check_rule" AS "CheckRule"
               LEFT OUTER JOIN "rule_area_score" AS "ruleAreaScores"
                               ON "CheckRule"."rule_id" = "ruleAreaScores"."rule" AND "ruleAreaScores"."area" = ?
               LEFT OUTER JOIN "rule_tag" AS "ruleTags" ON "CheckRule"."rule_id" = "ruleTags"."rule"
        WHERE "CheckRule".check_id = ?
          and "CheckRule"."parent_rule_id" is not null
        ORDER BY "CheckRule"."created_at"
      `,
      code,
      checkSystem.checkId
    );
    // 考核细则整理后的结果
    const childRules = [];
    // 整理考核细则
    for (const ruleIt of ruleChildrenList) {
      // 查找考核细则是否在数组中,在:把关联关系push进数组中,不在: push进数组中
      const find = childRules.find(it => it?.ruleId === ruleIt.ruleId);
      // 如果在
      if (find) {
        // 如果在, 并且ruleId,areaCode,details有一个不同,push进去
        const find1 = find.ruleAreaScores.find(
          scoreIt =>
            scoreIt.ruleId === ruleIt.ruleAreaScoresRuleId &&
            scoreIt.areaCode === ruleIt.ruleAreaScoresAreaCode
          // scoreIt.details === ruleIt.ruleAreaScoresDetails &&
        );
        if (!find1) {
          // 当ruleAreaScores表的ruleId存在时
          find.ruleAreaScores.push({
            ruleId: ruleIt.ruleAreaScoresRuleId,
            areaCode: ruleIt.ruleAreaScoresAreaCode,
            score: ruleIt.ruleAreaScoresScore,
            auto: ruleIt.ruleAreaScoresAuto,
            details: ruleIt.ruleAreaScoresDetails,
            // eslint-disable-next-line @typescript-eslint/camelcase
            created_at: ruleIt.ruleAreaScoresCreated_at,
            // eslint-disable-next-line @typescript-eslint/camelcase
            updated_at: ruleIt.ruleAreaScoresUpdated_at
          });
          if (ruleIt.ruleAreaScoresDetails)
            find.details.push(...ruleIt.ruleAreaScoresDetails);
          if (ruleIt.ruleAreaScoresScore)
            find.score = new Decimal(find?.score ?? 0).add(
              ruleIt?.ruleAreaScoresScore ?? 0
            );
        }
        // 当ruleTags表的id存在时
        if (ruleIt.ruleTagsId) {
          find.ruleTags.push({
            id: ruleIt.ruleTagsId,
            ruleId: ruleIt.ruleTagsRuleId,
            tag: ruleIt.ruleTagsTag,
            algorithm: ruleIt.ruleTagsAlgorithm,
            baseline: ruleIt.ruleTagsBaseline,
            score: ruleIt.ruleTagsScore,
            attachStartDate: ruleIt.ruleTagsAttachStartDate,
            attachEndDate: ruleIt.ruleTagsAttachEndDate,
            // eslint-disable-next-line @typescript-eslint/camelcase
            created_at: ruleIt.ruleTagsCreated_at,
            // eslint-disable-next-line @typescript-eslint/camelcase
            updated_at: ruleIt.ruleTagsUpdated_at
          });
        }
      } else {
        // 是否是定型指标
        let isUploadAttach = false;
        // 含定性指标,并且判断是否在可上传时间范围内
        const ruleTagDateRange =
          ruleIt.ruleTagsTag === MarkTagUsages.Attach.code &&
          ruleIt.ruleTagsAttachStartDate &&
          ruleIt.ruleTagsAttachEndDate;
        // 判断是否在可上传时间范围内
        if (ruleTagDateRange) {
          isUploadAttach =
            dayjs().isAfter(ruleTagDateRange.attachStartDate) &&
            dayjs().isBefore(ruleTagDateRange.attachEndDate);
        }
        // push进数组中
        childRules.push({
          ruleId: ruleIt.ruleId,
          ruleName: ruleIt.ruleName,
          parentRuleId: ruleIt.parentRuleId,
          checkId: ruleIt.checkId,
          ruleScore: ruleIt.ruleScore,
          checkStandard: ruleIt.checkStandard,
          checkMethod: ruleIt.checkMethod,
          evaluateStandard: ruleIt.evaluateStandard,
          // eslint-disable-next-line @typescript-eslint/camelcase
          create_by: ruleIt.create_by,
          // eslint-disable-next-line @typescript-eslint/camelcase
          update_by: ruleIt.update_by,
          status: ruleIt.status,
          // eslint-disable-next-line @typescript-eslint/camelcase
          created_at: ruleIt.created_at,
          // eslint-disable-next-line @typescript-eslint/camelcase
          updated_at: ruleIt.updated_at,
          ruleAreaScores: ruleIt.ruleAreaScoresRuleId
            ? [
                {
                  ruleId: ruleIt.ruleAreaScoresRuleId,
                  areaCode: ruleIt.ruleAreaScoresAreaCode,
                  score: ruleIt.ruleAreaScoresScore,
                  auto: ruleIt.ruleAreaScoresAuto,
                  details: ruleIt.ruleAreaScoresDetails,
                  // eslint-disable-next-line @typescript-eslint/camelcase
                  created_at: ruleIt.ruleAreaScoresCreated_at,
                  // eslint-disable-next-line @typescript-eslint/camelcase
                  updated_at: ruleIt.ruleAreaScoresUpdated_at
                }
              ]
            : [],
          ruleTags: ruleIt.ruleTagsId
            ? [
                {
                  id: ruleIt.ruleTagsId,
                  ruleId: ruleIt.ruleTagsRuleId,
                  tag: ruleIt.ruleTagsTag,
                  algorithm: ruleIt.ruleTagsAlgorithm,
                  baseline: ruleIt.ruleTagsBaseline,
                  score: ruleIt.ruleTagsScore,
                  attachStartDate: ruleIt.ruleTagsAttachStartDate,
                  attachEndDate: ruleIt.ruleTagsAttachEndDate,
                  // eslint-disable-next-line @typescript-eslint/camelcase
                  created_at: ruleIt.ruleTagsCreated_at,
                  // eslint-disable-next-line @typescript-eslint/camelcase
                  updated_at: ruleIt.ruleTagsUpdated_at
                }
              ]
            : [],
          details: ruleIt.ruleAreaScoresDetails,
          score: ruleIt.ruleAreaScoresScore,
          auto: ruleIt?.ruleAreaScoresAuto ?? true,
          isUploadAttach: isUploadAttach
        });
      }
    }

    // 把考核细则放到考核小项中
    for (const childIt of childRules) {
      // 查找子集是否在数组中
      const parentFind = parentRules.find(
        parentIt => parentIt.ruleId === childIt.parentRuleId
      );
      if (parentFind) {
        parentFind.children.push(childIt);
      }
    }
    checkSystem.children = parentRules;
    return checkSystem;
  }
}
