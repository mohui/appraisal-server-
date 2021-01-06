import {
  AreaModel,
  RuleAreaScoreModel,
  CheckRuleModel,
  CheckSystemModel,
  CheckAreaModel,
  RuleTagModel,
  RuleAreaBudgetModel
} from '../../database/model';
import {KatoCommonError} from 'kato-server';
import {MarkTagUsages} from '../../../common/rule-score';
import * as dayjs from 'dayjs';
import {Decimal} from 'decimal.js';

export default class SystemRule {
  /**
   * 机构考核详情
   *
   * @param code 机构id
   * @param year 年份
   */
  async checks(code, year) {
    // 校验地区是否存在
    const areas = await AreaModel.findOne({where: {code}});

    if (areas.length === 0) throw new KatoCommonError(`地区 ${code} 不合法`);

    if (!year) year = dayjs().format('YYYY');

    // 通过地区编码和年份获取考核主信息
    const areaSystem = await CheckAreaModel.findOne({
      where: {
        areaCode: code
      },
      attributes: [],
      include: [
        {
          model: CheckSystemModel,
          where: {checkYear: year},
          required: true
        }
      ]
    });

    if (!areaSystem) throw new KatoCommonError(`该机构未绑定考核`);

    // 取出考核主信息
    const checkSystem = areaSystem.checkSystem;

    // 待看
    const children = await Promise.all(
      // 查询考核细则
      (
        await CheckRuleModel.findAll({
          where: {checkId: checkSystem.checkId, parentRuleId: null},
          include: [RuleAreaBudgetModel]
        })
      ).map(async rule => {
        // 根据考核小项,查询考核细则
        const children = (
          await CheckRuleModel.findAll({
            attributes: {exclude: ['budget']},
            where: {parentRuleId: rule.ruleId},
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
