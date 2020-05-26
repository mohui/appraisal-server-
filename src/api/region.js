import {RegionModel, HospitalModel} from '../database/model';
import {should, validate} from 'kato-server';
import {Op} from 'sequelize';

export default class Region {
  @validate(
    should
      .object({
        pageSize: should.number(),
        pageNo: should.number(),
        level: should.number(),
        parent: should.string(),
        name: should.string(),
        code: should.string()
      })
      .allow(null)
  )
  async list(params) {
    const {pageSize = 20, pageNo = 1, level, parent, name, code} = params || {};
    let whereOptions = {};
    if (level) whereOptions['level'] = level;
    if (parent) whereOptions['parent'] = parent;
    if (name) whereOptions['name'] = {[Op.like]: `%${name}%`};
    if (code) whereOptions['code'] = code;
    return await RegionModel.findAndCountAll({
      attributes: {
        exclude: ['deleted_at']
      },
      where: whereOptions,
      paranoid: false,
      distinct: true,
      offset: pageNo - 1,
      limit: pageSize,
      include: {
        model: HospitalModel,
        paranoid: false,
        attributes: {
          exclude: ['deleted_at']
        }
      }
    });
  }

  @validate(
    should
      .object({
        pageSize: should.number(),
        pageNo: should.number(),
        region: should.string(),
        parent: should.string(),
        name: should.string(),
        id: should.string()
      })
      .allow(null)
  )
  async listHospital(params) {
    const {pageSize = 20, pageNo = 1, region, parent, name, id} = params || {};
    let whereOptions = {};
    if (region) whereOptions['region'] = region;
    if (parent) whereOptions['parent'] = parent;
    if (name) whereOptions['name'] = {[Op.like]: `%${name}%`};
    if (id) whereOptions['id'] = id;
    return await HospitalModel.findAndCountAll({
      attributes: {
        exclude: ['deleted_at']
      },
      where: whereOptions,
      distinct: true,
      paranoid: false,
      offset: pageNo - 1,
      limit: pageSize,
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
