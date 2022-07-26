import {KatoCommonError, should, validate} from 'kato-server';
import {appDB} from '../../app';
import * as dayjs from 'dayjs';
import {MarkTagUsages} from '../../../common/rule-score';
import Decimal from 'decimal.js';
import {v4 as uuid} from 'uuid';

export default class RuleTag {
  /**
   * 指标修改
   *
   * @param params {
   *   ruleId: 规则id
   *   tags: 指标相关数据[
   *     {
   *        tag: 指标code,
   *        algorithm: 指标算法,
   *        baseline: 参考值,
   *        score: 得分,
   *        attachStartDate: 定性指标上传附件的开始时间,
   *        attachEndDate: 定性指标上传附件的结束时间
   *     }
   *   ]
   * }
   */
  @validate(
    should.object({
      ruleId: should.string().required(),
      tags: should
        .array()
        .items(
          should.object({
            tag: should.string().required(),
            algorithm: should.string().required(),
            baseline: should.number().allow(null),
            score: should.number().required(),
            attachStartDate: should.date().allow(null),
            attachEndDate: should.date().allow(null)
          })
        )
        .required()
        .allow([])
    })
  )
  async upsert(params) {
    return appDB.transaction(async () => {
      const {tags = [], ruleId} = params;
      /**
       * 1: 查询考核小项是否存在
       * 2: 判断指标分数不能大于规则总分数
       * 3: 先把所有的删除
       * 4: 判断是否是定性指标, 定型指标需要规定上传时间范围
       * 5: 汇总需要添加的数组
       * 6: 新增指标
       */
      const checkRules = await appDB.execute(
        // language=PostgreSQL
        `
          select rule_id    "ruleId",
                 rule_name  "ruleName",
                 rule_score "ruleScore"
          from check_rule
          where rule_id = ?
        `,
        ruleId
      );
      // 1: 查询考核小项是否存在
      if (checkRules.length === 0) throw new KatoCommonError('考核小项不存在');
      // 2: 判断指标分数不能大于规则总分数
      if (
        checkRules[0]?.ruleScore <
        tags.reduce(
          (result, current) =>
            new Decimal(result).add(current.score).toNumber(),
          new Decimal(0)
        )
      )
        throw new KatoCommonError('指标总分超过规则的得分');

      // 3: 先把所有的删除
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from rule_tag
          where rule = ?
        `,
        ruleId
      );
      const insertParams = [];
      for (const tag of tags) {
        // 4: 判断是否是定性指标, 定型指标需要规定上传时间范围
        if (
          tag.tag === MarkTagUsages.Attach.code &&
          (!tag.attachStartDate ||
            !tag.attachEndDate ||
            dayjs(tag.attachStartDate).isAfter(tag.attachEndDate))
        )
          throw new KatoCommonError('定性指标的附件上传起始时间有误');
        // 5: 汇总需要添加的数组
        insertParams.push([
          uuid(),
          ruleId,
          tag.tag,
          tag.algorithm,
          tag.baseline,
          tag.score,
          new Date(),
          new Date(),
          tag.attachStartDate,
          tag.attachEndDate
        ]);
      }
      // 如果添加的数组为空,只是删除指标,返回空数组
      if (insertParams.length === 0) return [];
      // 6: 新增指标
      return await appDB.execute(
        // language=PostgreSQL
        `
          insert into rule_tag(
                               id,
                               rule,
                               tag,
                               algorithm,
                               baseline,
                               score,
                               created_at,
                               updated_at,
                               attach_start_date,
                               attach_end_date
                               ) values ${insertParams
                                 .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                                 .join()}
        `,
        ...insertParams.reduce((prev, current) => {
          return [...prev, ...current];
        }, [])
      );
    });
  }
}
