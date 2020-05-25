import {RegionModel, HospitalModel} from '../database/model';
import {should, validate} from 'kato-server';

export default class Region {
  @validate(
    should
      .object({
        pageSize: should.number(),
        pageNo: should.number()
      })
      .allow(null)
  )
  async list(params) {
    const {pageSize = 20, pageNo = 1} = params || {};
    return await RegionModel.findAndCountAll({
      attributes: {
        exclude: ['deleted_at']
      },
      paranoid: false,
      offset: pageNo - 1,
      limit: pageSize
    });
  }

  async listHospital() {
    return await HospitalModel.findAndCountAll({
      attributes: {
        exclude: ['deleted_at']
      },
      paranoid: false
    });
  }
}
