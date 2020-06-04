import {should, validate} from 'kato-server';
import {RuleTagModel} from '../database/model';
import {appDB} from '../app';

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
              .description('得分')
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
      //查询与该规则挂钩的原有的指标
      const allTags = await RuleTagModel.findAll({where: {rule: ruleId}});
      //删除已经被解除的指标
      await Promise.all(
        allTags
          .filter(item => !tags.find(tag => tag.tag === item.tag))
          .map(async delTag => delTag.destroy())
      );
      //剩下的批量操作
      await Promise.all(
        tags.map(async tag => {
          //查询该指标是否原先就有配置
          let currentTag = allTags.find(item => item.tag === tag.tag);
          if (currentTag) {
            //存在则进行修改操作
            currentTag.algorithm = tag.algorithm;
            currentTag.baseline = tag.baseline;
            currentTag.score = tag.score;
            return await currentTag.save();
          }
          //否则进行新增操作
          tag.ruleId = ruleId;
          return await RuleTagModel.create(tag);
        })
      );
    });
  }
}