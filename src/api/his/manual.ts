import * as dayjs from 'dayjs';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {v4 as uuid} from 'uuid';
import {HisManualDataInput} from '../../../common/his';
import {appDB, unifs} from '../../app';
import {getHospital, monthToRange} from './service';
import {sql as sqlRender} from '../../database/template';

/**
 * 手工数据属性型返回值
 */
type ManualPropDataReturnValue = {
  //手工数据id
  item: string;
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
  // 手工数据子集
  children: {
    id: string;
    date: Date;
    value: number;
    files: Array<string>;
    remark: string;
  }[];
  //创建时间
  created_at?: Date;
  //更新时间
  updated_at?: Date;
};

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
  async list() {
    const hospital = await getHospital();
    // language=PostgreSQL
    return await appDB.execute(
      `select id, name, input, created_at, updated_at
         from his_manual_data
         where hospital = ?
         order by created_at`,
      hospital
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
   * 删除手工数据项目
   *
   * @param id id
   */
  @validate(should.string().required())
  async del(id) {
    const hospital = await getHospital();
    const data = await this.get(id, Date.now());
    if (!data) throw new KatoRuntimeError(`参数不合法`);
    //查询结算历史
    //language=PostgreSQL
    const counts = (
      await appDB.execute(
        `
          select count(1) as counts
          from his_staff_manual_data_detail d
                 inner join his_manual_data m on d.item = m.id
                 inner join his_hospital_settle s on m.hospital = s.hospital and s.settle = true
          where d.item = ?
            and to_char(s.month, 'yyyyMM') = to_char(d.date, 'yyyyMM');
        `,
        hospital
      )
    )[0].counts;
    if (Number(counts)) throw new KatoRuntimeError(`${data.name} 存在结算历史`);
    //开启事务
    await appDB.transaction(async () => {
      //删除流水表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from his_staff_manual_data_detail
          where item = ?
        `,
        id
      );
      //删除主表
      await appDB.execute(`delete from his_manual_data where id = ?`, id);
    });
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
   *
   * @param id 项目id
   * @param month 月份时间
   * @param staff 员工id
   */
  @validate(
    should.string().required(),
    should.date().required(),
    should.string().allow(null)
  )
  async listLogData(id, month, staff) {
    const hospitalId = await getHospital();
    //月份转开始结束时间
    const {start, end} = monthToRange(month);

    // 拼装sql语句
    const [sql, params] = sqlRender(
      `
        select d.id,
                 d.item,
                 d.staff,
                 s.name,
                 d.value,
                 d.date,
                 d.files,
                 d.remark,
                 d.created_at,
                 d.updated_at
          from his_staff_manual_data_detail d
                 inner join staff s on d.staff = s.id and s.hospital = {{? hospitalId}}
          where d.item = {{? id}}
            and d.date >= {{? start}}
            and d.date < {{? end}}
            {{#if staff}}
              AND d.staff = {{? staff}}
            {{/if}}
          order by d.date, created_at
      `,
      {
        hospitalId,
        id,
        start,
        end,
        staff
      }
    );

    return (await appDB.execute(sql, ...params)).map(it => ({
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
        // language=PostgreSQL
        `select id, name from staff where hospital = ? order by created_at`,
        hospital
      )
    ).map<ManualPropDataReturnValue>(it => ({
      item: id,
      staff: {
        id: it.id,
        name: it.name
      },
      value: null,
      size: 0,
      date: null,
      children: [],
      // eslint-disable-next-line @typescript-eslint/camelcase
      created_at: null,
      // eslint-disable-next-line @typescript-eslint/camelcase
      updated_at: null
    }));
    //查询手工数据流水表
    const list: {
      id;
      item;
      staff;
      name;
      value;
      date;
      files;
      remark;
      created_at;
      updated_at;
    }[] = await this.listLogData(id, start, null);
    //累计属性值
    for (const row of list) {
      const current = rows.find(it => it.staff.id === row.staff.id);
      if (current) {
        current.value += row.value;
        current.size += 1;

        current?.children.push({
          id: row.id,
          date: row.created_at,
          value: row.value,
          files: row?.files,
          remark: row?.remark
        });
        //指定月最后一次赋值时间
        current.date = current.date ?? row.date;
        if (row.date.getTime() > current.date.getTime()) {
          current.date = row.date;
        }
        //指定月第一次创建时间
        // eslint-disable-next-line @typescript-eslint/camelcase
        current.created_at = current.created_at ?? row.created_at;
        if (row.created_at.getTime() < current.created_at.getTime()) {
          // eslint-disable-next-line @typescript-eslint/camelcase
          current.created_at = row.created_at;
        }
        //指定月最后一次更新时间
        // eslint-disable-next-line @typescript-eslint/camelcase
        current.updated_at = current.updated_at ?? row.updated_at;
        if (row.updated_at.getTime() > current.updated_at.getTime()) {
          // eslint-disable-next-line @typescript-eslint/camelcase
          current.updated_at = row.updated_at;
        }
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
   * @param files 文件路径
   * @param remark 备注
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.number().required(),
    should.date().required(),
    should.array().allow(null),
    should.string().allow(null)
  )
  async addLogData(staff, id, value, date, files, remark) {
    //校验是否可以操作
    await this.validDetail(id, date);
    //赋值时间的转换;
    const now = new Date();
    const dateObj = dayjs(date);
    const diff = dayjs(date).diff(now, 'M');
    if (diff > 0) {
      //赋值时间是未来
      date = dateObj.startOf('M').toDate();
    } else if (diff < 0) {
      //给过去赋值, 则是月末最后1s
      date = dateObj
        .startOf('M')
        .add(1, 'M')
        .subtract(1, 's')
        .toDate();
    } else {
      date = now;
    }
    await appDB.execute(
      // language=PostgreSQL
      `
        insert into his_staff_manual_data_detail(id, staff, item, date, value, files, remark)
        values (?, ?, ?, ?, ?, ?, ?)
      `,
      uuid(),
      staff,
      id,
      date,
      value,
      `{${files?.map(item => `"${item}"`).join()}}`,
      remark
    );
  }

  /**
   * 设置手工数据属性值
   *
   * @param staff 员工id
   * @param id 手工数据id
   * @param value 值
   * @param date 赋值时间
   * @param files 文件
   * @param remark 备注
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.number().required(),
    should.date().required(),
    should.array().allow(null),
    should.string().allow(null)
  )
  async setData(staff, id, value, date, files, remark) {
    await this.validDetail(id, date);
    const {start, end} = monthToRange(date);
    //1. 查询所有数据
    const total = (
      await appDB.execute(
        // language=PostgreSQL
        `
          select sum(value) as value
          from his_staff_manual_data_detail
          where staff = ?
            and item = ?
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
    await this.addLogData(staff, id, diff, date, files, remark);
  }

  /**
   * 按月删除手工数据流水
   *
   * @param staff 人员id
   * @param id id
   * @param month 月份
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.date().required()
  )
  async delData(staff, id, month) {
    await this.validDetail(id, month);
    const {start, end} = monthToRange(month);
    // 先查询
    const logModels: {
      id: string;
      staff: string;
      item: string;
      date: Date;
      files: [];
      remark: string;
    }[] = await appDB.execute(
      // language=PostgreSQL
      `
          select id, staff, item, date, files, remark
          from his_staff_manual_data_detail
          where staff = ?
          and item = ?
          and date >= ?
          and date < ?
        `,
      staff,
      id,
      start,
      end
    );

    if (logModels.length === 0) throw new KatoRuntimeError(`没有可删除的数据`);
    for (const detail of logModels) {
      if (detail.files.length > 0) {
        for (const file of detail.files) {
          await unifs.deleteFile(file);
        }
      }
    }

    await appDB.execute(
      // language=PostgreSQL
      `
        delete
        from his_staff_manual_data_detail
        where staff = ?
          and item = ?
          and date >= ?
          and date < ?
      `,
      staff,
      id,
      start,
      end
    );
  }

  /**
   * 删除手工数据流水
   *
   * @param id id
   */
  @validate(should.string().required())
  async delLogData(id) {
    return appDB.transaction(async () => {
      const logModel: {
        id: string;
        staff: string;
        item: string;
        date: Date;
        files: [];
        remark: string;
      } = (
        await appDB.execute(
          // language=PostgreSQL
          `
          select id, staff, item, date, files, remark
          from his_staff_manual_data_detail
          where id = ?
        `,
          id
        )
      )[0];
      if (!logModel) throw new KatoRuntimeError(`数据不存在`);
      await this.validDetail(logModel.item, logModel.date);

      if (logModel?.files?.length > 0) {
        for (const file of logModel.files) {
          await unifs.deleteFile(file);
        }
      }
      await appDB.execute(
        // language=PostgreSQL
        `
        delete
        from his_staff_manual_data_detail
        where id = ?
      `,
        id
      );
    });
  }

  /**
   * 手工数据流水是否可操作
   *
   * @param id id
   * @param month 月份
   */
  async validDetail(id, month) {
    const data = await this.get(id, month);
    if (!data) throw new KatoRuntimeError(`该数据项目不存在`);
    if (data.settle) throw new KatoRuntimeError(`该数据项目当前月份已经结算`);
  }
}
