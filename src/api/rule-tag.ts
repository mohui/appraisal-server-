import {KatoCommonError, should, validate} from 'kato-server';
import {appDB} from '../app';
import * as dayjs from 'dayjs';
import {MarkTagUsages} from '../../common/rule-score';
import Decimal from 'decimal.js';
import * as uuid from 'uuid';

export default class RuleTag {
  @validate(
    should.object({
      ruleId: should
        .string()
        .required()
        .description('规则id'),
      tags: should
        .array()
        .items(
          should.object({
            tag: should
              .string()
              .required()
              .description('指标code'),
            algorithm: should
              .string()
              .required()
              .description('指标算法'),
            baseline: should
              .number()
              .allow(null)
              .description('参考值'),
            score: should
              .number()
              .required()
              .description('得分'),
            attachStartDate: should
              .date()
              .allow(null)
              .description('定性指标上传附件的开始时间'),
            attachEndDate: should
              .date()
              .allow(null)
              .description('定性指标上传附件的结束时间')
          })
        )
        .required()
        .allow([])
        .description('指标相关数据')
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
      const checkRule = await appDB.execute(
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
      if (checkRule.length === 0) throw new KatoCommonError('考核小项不存在');
      // 2: 判断指标分数不能大于规则总分数
      if (
        checkRule[0]?.ruleScore <
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
          uuid.v4(),
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
      // 6: 新增指标
      return await appDB.execute(
        // language=PostgreSQL
        `
          insert into rule_tag(id, rule, tag, algorithm, baseline, score, created_at, updated_at, attach_start_date, attach_end_date)
          values ${insertParams
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
