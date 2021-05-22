import * as dayjs from 'dayjs';
import {should, validate} from 'kato-server';
import {v4 as uuid} from 'uuid';
import {HisManualDataInput} from '../../../common/his';
import {appDB} from '../../app';
import {getHospital} from './his_staff';

/**
 * 手工数据属性型返回值
 */
type ManualPropDataReturnValue = {
  //手工数据id
  id: string;
  //员工
  staff: {
    id: string;
    name: string;
  };
  //手工数据值
  value?: number;
  //手工数据流水数量
  size: number;
  //赋值时间
  date?: Date;
};

/**
 * 月份转开始结束时间
 *
 * @param month 时间
 */
function monthToRange(month: Date): {start: Date; end: Date} {
  const time = dayjs(month);
  const start = time.startOf('M').toDate();
  const end = time
    .add(1, 'M')
    .startOf('M')
    .toDate();
  return {start, end};
}

/**
 * 手工数据模块
 */
export default class HisManualData {
  /**
   * 获取指定手工数据信息
   *
   * @param id id
   * @param month 月份
   */
  @validate(should.string().required(), should.date().required())
  async get(id, month) {
    const hospital = await getHospital();
    const result = (
      await appDB.execute(`select * from his_manual_data where id = ?`, id)
    )[0];
    if (!result) return null;
    //月份转开始结束时间
    const {start} = monthToRange(month);
    const settle =
      (
        await appDB.execute(
          `select settle from his_hospital_settle where hospital = ? and month = ?`,
          hospital,
          start
        )
      )[0]?.settle ?? false;
    return {
      ...result,
      settle
    };
  }

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
    should.string().only(Object.values(HisManualDataInput))
  )
  async update(id, name, input) {
    const hospital = await getHospital();
    await appDB.execute(
      `update his_manual_data set name = ?, input = ? where id = ? and hospital = ?`,
      name,
      input,
      id,
      hospital
    );
  }

  /**
   * 查询手工数据日志值
   */
  @validate(should.string().required(), should.date().required())
  async listLogData(id, month) {
    const hospitalId = await getHospital();
    //月份转开始结束时间
    const {start, end} = monthToRange(month);
    return (
      await appDB.execute(
        `
        select d.basic as id,
               d.staff,
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
      )
    ).map(it => ({
      ...it,
      staff: {
        id: it.staff,
        name: it.name
      }
    }));
  }

  /**
   * 查询手工数据属性值
   *
   * @param id 手工数据id
   * @param month 月份
   */
  @validate(should.string().required(), should.date().required())
  async listData(id, month) {
    const hospital = await getHospital();
    //月份转开始结束时间
    const {start} = monthToRange(month);
    //获取当前机构下的所有人员并转换成返回值数组
    const rows: ManualPropDataReturnValue[] = (
      await appDB.execute(
        `select id, name from staff where hospital = ?`,
        hospital
      )
    ).map<ManualPropDataReturnValue>(it => ({
      id: id,
      staff: {
        id: it.id,
        name: it.name
      },
      value: null,
      size: 0,
      date: null
    }));
    //查询手工数据流水表
    const list: {
      id;
      staff;
      name;
      value;
      date;
      created_at;
      updated_at;
    }[] = await this.listLogData(id, start);
    //累计属性值
    for (const row of list) {
      const current = rows.find(it => it.staff.id === row.staff.id);
      if (current) {
        current.value += row.value;
        current.size += 1;
      }
    }
    return rows;
  }

  /**
   * 添加手工数据日志值
   *
   * @param staff 员工id
   * @param id 手工数据id
   * @param value 值
   * @param date 赋值时间
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.number().required(),
    should.date().required()
  )
  async addLogData(staff, id, value, date) {
    await appDB.execute(
      `insert into his_staff_manual_data_detail(staff, basic, date, value) values (?, ?, ?, ?)`,
      staff,
      id,
      date,
      value
    );
  }

  /**
   * 设置手工数据属性值
   *
   * @param staff 员工id
   * @param id 手工数据id
   * @param value 值
   * @param date 赋值时间
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.number().required()
  )
  async setData(staff, id, value, date) {
    const {start, end} = monthToRange(date);
    //1. 查询所有数据
    const total = (
      await appDB.execute(
        `
          select sum(value) as value
          from his_staff_manual_data_detail
          where staff = ?
            and basic = ?
            and date >= ?
            and date < ?
        `,
        staff,
        id,
        start,
        end
      )
    )[0].value;
    //2. diff
    const diff = value - total;
    //3. addLogData
    await this.addLogData(staff, id, diff, date);
  }
}
