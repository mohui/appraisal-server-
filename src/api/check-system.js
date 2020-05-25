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
      checkId: should.string().required(),
      checkName: should.string().required()
    })
  )
  updateName(params) {
    return appDB.transaction(async () => {
      const sys = await CheckSystemModel.findOne({
        where: {checkId: params.checkId},
        lock: true
      });
      if (!sys) throw new KatoCommonError('该考核不存在');
      return await CheckSystemModel.update(
        {checkName: params.checkName},
        {where: {checkId: params.checkId}}
      );
    });
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
        .description('规则名称'),
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
  async addRule(params) {
    return await CheckRuleModel.create(params);
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

  @validate(
    should
      .object({
        checkId: should
          .string()
          .allow(null, '')
          .description('考核体系id')
      })
      .allow(null)
  )
  async listRule(params) {
    const {checkId} = params || {};
    let whereOptions = {};
    if (checkId) whereOptions.checkId = checkId;
    return await CheckRuleModel.findAndCountAll({
      where: whereOptions,
      distinct: true,
      include: CheckSystemModel
    });
  }

  async list() {
    return await CheckSystemModel.findAndCountAll({
      distinct: true,
      include: CheckRuleModel
    });
  }
}
