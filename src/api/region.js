import {RegionModel, HospitalModel} from '../database/model';
import {should, validate} from 'kato-server';

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

  @validate(
    should
      .object({
        code: should.string().description('通过code查询区域下的机构'),
        parent: should.string().description('通过上级机构查询其名下的机构')
      })
      .allow(null)
  )
  async listHospital(params) {
    const {code, parent} = params || {};
    let whereOptions = {};
    if (code) whereOptions['region'] = code;
    if (parent) whereOptions['parent'] = parent;
    return await HospitalModel.findAll({
      attributes: {
        exclude: ['deleted_at']
      },
      where: whereOptions,
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
}
