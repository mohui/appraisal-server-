import {
  RegionModel,
  HospitalModel,
  ReportHospitalModel
} from '../database/model';
import {should, validate} from 'kato-server';
import Score from './score';
import {Op} from 'sequelize';

const scoreAPI = new Score();

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

  async setBudget(budget, code) {
    await RegionModel.update(
      {
        budget
      },
      {
        where: {
          code
        }
      }
    );

    // 分配金额
    await scoreAPI.setBudget();
  }

  //地区下所有的机构
  @validate(
    should
      .string()
      .required()
      .description('地区code')
  )
  async listAllHospital(code) {
    return (
      await HospitalModel.findAll({
        where: {region: {[Op.like]: `${code}%`}},
        include: [ReportHospitalModel]
      })
    ).map(item => ({
      ...item.toJSON(),
      budget: item.report.budget
    }));
  }
}
