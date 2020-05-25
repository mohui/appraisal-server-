import {CheckRuleModel, CheckSystemModel} from '../database/model';
import {KatoCommonError, should, validate} from 'kato-server';
import {appDB} from '../app';

export default class CheckSystem {
  @validate(
    should.object({
      checkName: should
        .string()
        .required()
        .description('考核系统名')
    })
  )
  async add(params) {
    const {checkName} = params;
    return await CheckSystemModel.create({checkName, total: 0});
  }

  @validate(
    should.object({
      checkId: should
        .string()
        .required()
        .description('考核系统id'),
      ruleName: should
        .string()
        .required()
        .description('规则名称')
    })
  )
  async addRule(params) {
    const {checkId, ruleName} = params;
    return await CheckRuleModel.create({ruleName, checkId: checkId});
  }

  @validate(
    should.object({
      ruleId: should.string().required(),
      ruleName: should
        .string()
        .required()
        .description('规则名称'),
      parentRuleId: should.string().description('父规则id'),
      checkId: should
        .string()
        .required()
        .description('考核体系id'),
      ruleScore: should
        .number()
        .required()
        .description('得分'),
      checkStandard: should
        .string()
        .required()
        .description('考核标准'),
      checkMethod: should
        .string()
        .required()
        .description('考核方法'),
      status: should
        .string()
        .required()
        .description('状态'),
      standardIds: should
        .array()
        .items(should.string())
        .allow([])
        .description('关联指标id')
    })
  )
  async updateRule(params) {
    const {
      ruleId,
      ruleName,
      parentRuleId = '',
      checkId = '',
      ruleScore = '',
      checkStandard = '',
      checkMethod = '',
      status = '',
      standardIds = []
    } = params;
    return appDB.transaction(async () => {
      //查询规则,并锁定
      let rule = await CheckRuleModel.findOne({where: {ruleId}, lock: true});
      if (!rule) throw new KatoCommonError('该规则不存在');
      //进行修改操作
      return await CheckRuleModel.update(
        {
          ruleName,
          parentRuleId,
          checkId,
          ruleScore,
          checkMethod,
          checkStandard,
          status,
          standardIds
        },
        {where: {ruleId}}
      );
    });
  }

  async listRule() {
    return await CheckRuleModel.findAll({include: CheckSystemModel});
  }

  async list() {
    return await CheckSystemModel.findAll({include: CheckRuleModel});
  }
}
