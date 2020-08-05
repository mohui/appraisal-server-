import {
  RegionModel,
  HospitalModel,
  WorkDifficultyModel
} from '../database/model';
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
        required: true,
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
          res.budget = res.budget.add(next.budget);
          res.correctWorkPoint = res.correctWorkPoint.add(
            next.correctWorkPoint
          );
          res.workPoint = res.workPoint.add(next.workPoint);
          res.score = res.score.add(next.ruleScore);
          res.totalScore = res.totalScore.add(next.ruleTotalScore);
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
      result.budget = result.budget.toNumber();
      result.correctWorkPoint = result.correctWorkPoint.toNumber();
      result.workPoint = result.workPoint.toNumber();
      result.score = result.score.toNumber();
      result.totalScore = result.totalScore.toNumber();
      result.rate = new Decimal(result.score).div(result.totalScore).toNumber();

      delete it.ruleHospitalBudget;
      return {...it, ...result};
    });
  }

  /***
   * 工分的难度列表
   * @param params
   * @returns [{
   *   year:  年份
   *   districtCode:  地区code
   *   districtName:  地区name
   *   scope: 数据范围
   *   name:  工分code
   *   code:  工分name
   *   difficulty:  难度系数
   * }]
   */
  @validate(
    should.object({
      code: should.string().description('区code'),
      scope: should.string().description('数据范围'),
      year: should.number().description('年份')
    })
  )
  async workDifficultyList(params) {
    const {code, scope, year} = params;
    return WorkDifficultyModel.findAll({
      attributes: {exclude: ['id']},
      where: {districtCode: code, scope: scope, year: year}
    });
  }
}
