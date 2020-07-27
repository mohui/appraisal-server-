import {RegionModel, HospitalModel} from '../database/model';
import {should, validate} from 'kato-server';
import {Op} from 'sequelize';
import {RuleHospitalBudget} from '../database/model/rule-hospital-budget';
import {Decimal} from 'decimal.js';

export default class Region {
  //通过code查询下一级行政区域
  @validate(should.string().allow(null))
  async list(code) {
    return await RegionModel.findAll({
      paranoid: false,
      attributes: {exclude: ['deleted_at']},
      where: {parent: code}
    });
  }

  //地区的信息
  @validate(
    should
      .string()
      .required()
      .description('地区code')
  )
  async info(code) {
    return RegionModel.findOne({where: {code}});
  }

  @validate(should.string().description('通过code查询区域下的机构'))
  async listHospital(code) {
    return await HospitalModel.findAll({
      attributes: {
        exclude: ['deleted_at']
      },
      where: {region: code},
      paranoid: false,
      include: {
        model: RegionModel,
        paranoid: false,
        attributes: {
          exclude: ['deleted_at']
        }
      }
    });
  }

  //地区下所有的机构
  @validate(
    should
      .string()
      .required()
      .description('地区code')
  )
  async listAllHospital(code) {
    return HospitalModel.findAll({
      where: {region: {[Op.like]: `${code}%`}},
      include: {
        model: RuleHospitalBudget,
        attributes: [
          'budget',
          'correctWorkPoint',
          'workPoint',
          'ruleScore',
          'rate'
        ]
      }
    }).map(it => {
      it = it.toJSON();
      const result = it.ruleHospitalBudget.reduce(
        (res, next) => {
          res.budget = new Decimal(res.budget).add(next.budget).toNumber();
          res.correctWorkPoint = new Decimal(res.correctWorkPoint)
            .add(next.correctWorkPoint)
            .toNumber();
          res.workPoint = new Decimal(res.workPoint)
            .add(next.workPoint)
            .toNumber();
          res.score = new Decimal(res.score).add(next.ruleScore).toNumber();
          res.rate = new Decimal(res.rate)
            .add(next.rate)
            .div(it.ruleHospitalBudget.length)
            .toNumber();
          return res;
        },
        {
          budget: new Decimal(0),
          correctWorkPoint: new Decimal(0),
          workPoint: new Decimal(0),
          score: new Decimal(0),
          rate: new Decimal(0)
        }
      );

      delete it.ruleHospitalBudget;
      return {...it, ...result};
    });
  }
}
