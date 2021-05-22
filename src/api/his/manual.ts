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

  /**
   * 查询手工数据日志值
   */
  @validate(should.string(), should.date(), should.date())
  async listLogData(id, start, end) {
    const hospitalId = await getHospital();
    //language=PostgreSQL
    return await appDB.execute(
      `
        select s.id,
               s.name,
               d.value,
               d.date,
               d.created_at,
               d.updated_at
        from his_staff_manual_data_detail d
               inner join staff s on d.staff = s.id and s.hospital = ?
        where d.basic = ?
          and d.date >= ?
          and d.date < ?
        order by d.date desc
      `,
      hospitalId,
      id,
      start,
      end
    );
  }

  /**
   * 添加手工数据日志值
   *
   * @param staff 员工id
   * @param id 手工数据id
   * @param value 值
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.number().required()
  )
  async addLogData(staff, id, value) {
    await appDB.execute(
      `insert into his_staff_manual_data_detail(staff, basic, date, value) values (?, ?, ?, ?)`,
      staff,
      id,
      Date.now(),
      value
    );
  }

  /**
   * 添加手工数据属性值
   *
   * @param staff 员工id
   * @param id 手工数据id
   * @param value 值
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.number().required()
  )
  async addData(staff, id, value) {
    //1. 查询所有数据
    const total = (
      await appDB.execute(
        `select sum(value) as value from his_staff_manual_data_detail where staff = ? and basic = ?`,
        staff,
        id
      )
    )[0].value;
    //2. diff
    const diff = value - total;
    //3. addLogData
    await this.addLogData(staff, id, diff);
  }
}
