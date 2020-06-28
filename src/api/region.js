import {RegionModel, HospitalModel} from '../database/model';
import {should, validate} from 'kato-server';
import Score from './score';

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
}
