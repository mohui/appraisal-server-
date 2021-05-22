import {should, validate} from 'kato-server';
import {v4 as uuid} from 'uuid';
import {HisManualDataInput} from '../../../common/his';
import {appDB} from '../../app';
import {getHospital} from './his_staff';

/**
 * 手工数据模块
 */
export default class HisManualData {
  /**
   * 查询手工数据
   */
  list() {
    return appDB.execute(
      `select id, name, input, created_at, updated_at from his_manual_data`
    );
  }

  /**
   * 新建手工数据
   *
   * @param name 名称
   * @param input 输入方式
   */
  @validate(
    should.string().required(),
    should.string().only(Object.values(HisManualDataInput))
  )
  async add(name, input) {
    const hospital = await getHospital();
    await appDB.execute(
      `insert into his_manual_data(id, hospital, name, input) values (?, ?, ?, ?)`,
      uuid(),
      hospital,
      name,
      input
    );
  }

  /**
   * 更新手工数据
   *
   * @param id id
   * @param name 名称
   * @param input 输入方式
   */
  @validate(
    should.string(),
    should.string(),
    should.string().allow(Object.values(HisManualDataInput))
  )
  async update(id, name, input) {
    const hospital = await getHospital();
    await appDB.execute(
      `update his_manual_data set name = ? and input = ? where id = ? and hospital = ?`,
      name,
      input,
      id,
      hospital
    );
  }
}
