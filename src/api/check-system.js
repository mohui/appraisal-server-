import {CheckRuleModel, CheckSystemModel} from '../database/model';
import {KatoCommonError, should, validate} from 'kato-server';
import {appDB} from '../app';

export default class CheckSystem {
  //添加考核系统
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

  //更新考核系统名称
  @validate(
    should.object({
      checkId: should
        .string()
        .required()
        .description('考核体系id'),
      checkName: should
        .string()
        .required()
        .description('考核系统名称')
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

  //添加考核细则
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
      parentRuleId: should
        .string()
        .required()
        .description('所属分组id'),
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
      evaluateStandard: should
        .string()
        .required()
        .description('评分标准')
    })
  )
  async addRule(params) {
    return await CheckRuleModel.create(params);
  }

  //添加规则组
  @validate(
    should.object({
      checkId: should
        .string()
        .required()
        .description('所属的考核系统id'),
      ruleName: should
        .string()
        .required()
        .description('规则组的名称')
    })
  )
  async addRuleGroup(params) {
    return await CheckRuleModel.create(params);
  }

  //更新规则组
  @validate(
    should.object({
      ruleId: should.string().required(),
      ruleName: should.string()
    })
  )
  async updateRuleGroup(params) {
    return appDB.transaction(async () => {
      const group = await CheckRuleModel.findOne({
        where: {checkId: params.ruleId},
        lock: true
      });
      if (!group) throw new KatoCommonError('该规则组不存在');
      //修改规则组
      return await CheckRuleModel.update(
        {checkName: params.checkName},
        {where: {ruleId: params.ruleId}}
      );
    });
  }

  //删除考核系统
  @validate(
    should
      .string()
      .required()
      .description('考核体系id')
  )
  remove(id) {
    return appDB.transaction(async () => {
      //查询考核系统,并锁定
      const sys = await CheckSystemModel.findOne({
        where: {checkId: id},
        paranoid: false,
        lock: {of: CheckSystemModel},
        include: [CheckRuleModel]
      });
      if (!sys) throw new KatoCommonError('该考核系统不存在');
      //删除该考核系统下的所有规则
      await Promise.all(
        sys.checkRules.map(async rule => await rule.destroy({force: true}))
      );
      //删除该考核系统
      return await sys.destroy({force: true});
    });
  }

  //更新规则
  @validate(
    should.object({
      ruleId: should
        .string()
        .required()
        .description('规则id'),
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
      evaluateStandard: should
        .string()
        .required()
        .description('评分标准')
    })
  )
  async updateRule(params) {
    const {
      ruleId,
      ruleName,
      parentRuleId = '',
      evaluateStandard = '',
      ruleScore = '',
      checkStandard = '',
      checkMethod = '',
      status = ''
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
          ruleScore,
          checkMethod,
          checkStandard,
          evaluateStandard,
          status
        },
        {where: {ruleId}}
      );
    });
  }

  //删除规则
  @validate(
    should
      .string()
      .required()
      .description('规则id')
  )
  async removeRule(id) {
    return appDB.transaction(async () => {
      //查询并锁定
      const rule = await CheckRuleModel.findOne({
        where: {ruleId: id},
        lock: true
      });
      if (!rule) throw new KatoCommonError('该规则不存在');
      //如果是规则组,则删除其下的细则
      if (rule.parentRuleId)
        await Promise.all(
          CheckRuleModel.findAll({
            where: {parentRuleId: rule.ruleId}
          }).map(async it => await it.destroy())
        );

      return await rule.destroy({force: true});
    });
  }

  //查询规则
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
    //查询该体系下所有rules
    let allRules = await CheckRuleModel.findAll({
      where: whereOptions
    });

    //rule进行分组
    const ruleGroup = allRules.filter(row => !row.parentRuleId);
    allRules = ruleGroup.map(group => ({
      ...group.toJSON(),
      group: allRules
        .filter(rule => rule.parentRuleId === group.ruleId)
        .map(it => it.toJSON())
    }));
    return {count: ruleGroup.length, rows: allRules};
  }

  //查询考核系统
  @validate(
    should
      .object({
        pageSize: should.number(),
        pageNo: should.number(),
        checkId: should.string()
      })
      .allow(null)
  )
  async list(params) {
    const {pageSize = 20, pageNo = 1, checkId} = params || {};
    let whereOptions = {};
    if (checkId) whereOptions['checkId'] = checkId;
    return await CheckSystemModel.findAndCountAll({
      where: whereOptions,
      distinct: true,
      offset: (pageNo - 1) * pageSize,
      limit: pageSize
    });
  }
}
