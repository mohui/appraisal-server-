import {CheckRuleModel, CheckSystemModel} from '../database/model';
import {should, validate} from 'kato-server';

export default class CheckSystem {
  @validate(
    should.object({
      name: should
        .string()
        .required()
        .description('考核系统名')
    })
  )
  async add(params) {
    const {name} = params;
    return await CheckSystemModel.create({checkName: name, total: 0});
  }

  @validate(
    should.object({
      checkId: should
        .string()
        .required()
        .description('考核系统id'),
      name: should
        .string()
        .required()
        .description('规则名称')
    })
  )
  async addRule(params) {
    const {checkId, name} = params;
    return await CheckRuleModel.create({ruleName: name, checkId: checkId});
  }

  async list() {
    return await CheckSystemModel.findAll({include: CheckRuleModel});
  }
}
