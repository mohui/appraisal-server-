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
          'ruleTotalScore',
          'rate'
        ]
      }
    }).map(it => {
      it = it.toJSON();
      const result = it.ruleHospitalBudget.reduce(
        (res, next) => {
          res.budget = new Decimal(res.budget).add(next.budget);
          res.correctWorkPoint = new Decimal(res.correctWorkPoint).add(
            next.correctWorkPoint
          );
          res.workPoint = new Decimal(res.workPoint).add(next.workPoint);
          res.score = new Decimal(res.score).add(next.ruleScore);
          res.totalScore = new Decimal(res.totalScore).add(next.ruleTotalScore);
          return res;
        },
        {
          budget: new Decimal(0),
          correctWorkPoint: new Decimal(0),
          workPoint: new Decimal(0),
          score: new Decimal(0),
          totalScore: new Decimal(0)
        }
      );
      result.budget = Number(result.budget);
      result.correctWorkPoint = Number(result.correctWorkPoint);
      result.workPoint = Number(result.workPoint);
      result.score = Number(result.score);
      result.totalScore = Number(result.totalScore);
      result.rate =
        new Decimal(result.score).div(result.totalScore).toNumber() || 0;

      delete it.ruleHospitalBudget;
      return {...it, ...result};
    });
  }
}
