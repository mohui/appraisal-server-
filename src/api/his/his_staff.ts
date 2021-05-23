import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {Context} from '../context';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {sql as sqlRender} from '../../database/template';

export async function getHospital() {
  if (
    Context.current.user.hospitals &&
    Context.current.user.hospitals.length > 1
  )
    throw new KatoRuntimeError(`没有查询his员工权限`);

  return Context.current.user.hospitals[0]['id'];
}
export default class HisStaff {
  /**
   * 查询his员工
   */
  async listHisStaffs() {
    const hospital = await getHospital();

    return await originalDB.execute(
      `select id, name, hospital from his_staff where hospital = ?`,
      hospital
    );
  }

  /**
   * 添加员工
   *
   * @param staff
   * @param account
   * @param password
   * @param name
   */
  @validate(
    should
      .string()
      .allow(null)
      .description('绑定his员工id'),
    should
      .string()
      .required()
      .description('登录名'),
    should
      .string()
      .required()
      .description('密码'),
    should
      .string()
      .required()
      .description('名称')
  )
  async add(staff, account, password, name) {
    const hospital = await getHospital();
    if (staff) {
      // 查询his员工是否已经被绑定
      const accountOne = await appDB.execute(
        `select * from staff where staff = ?`,
        staff
      );
      if (accountOne.length > 0) throw new KatoRuntimeError(`his员工已经存在`);
    } else {
      staff = null;
    }
    return await appDB.execute(
      `insert into
            staff(
              id,
              hospital,
              staff,
              account,
              password,
              name,
              created_at,
              updated_at
              )
            values(?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(),
      hospital,
      staff,
      account,
      password,
      name,
      dayjs().toDate(),
      dayjs().toDate()
    );
  }

  @validate(
    should
      .string()
      .required()
      .description('主键'),
    should
      .string()
      .required()
      .description('名称'),
    should
      .string()
      .required()
      .description('密码')
  )
  /**
   * 修改员工信息
   */
  async update(id, name, password) {
    return await appDB.execute(
      `
        update staff set
          name = ?,
          password = ?,
          updated_at = ?
        where id = ?`,
      name,
      password,
      dayjs().toDate(),
      id
    );
  }

  /**
   * 删除员工信息
   */
  @validate(
    should
      .string()
      .required()
      .description('主键')
  )
  async delete(id) {
    // 先查询是否绑定过
    const itemMapping = await appDB.execute(
      `select * from his_staff_work_item_mapping where staff = ?`,
      id
    );
    if (itemMapping.length > 0) throw new KatoRuntimeError(`员工已绑定工分项`);

    const staffWorkSource = await appDB.execute(
      `select * from his_staff_work_source where staff = ? or ? = ANY(sources)`,
      id,
      id
    );
    if (staffWorkSource.length > 0) throw new KatoRuntimeError(`员工添加考核`);

    return await appDB.execute(
      `
        delete from staff where id = ?`,
      id
    );
  }

  /**
   * 员工列表
   */
  @validate(
    should
      .string()
      .allow(null)
      .description('账号'),
    should
      .string()
      .allow(null)
      .description('用户名')
  )
  async list(account, name) {
    const hospital = await getHospital();
    // 用户名查询模糊查询
    if (account) account = `%${account}%`;
    if (name) name = `%${name}%`;

    const [sql, params] = sqlRender(
      `
        select id, hospital, staff, account, password, name, created_at, updated_at
        from staff
        where hospital = {{? hospital}}
        {{#if account}}
            AND account like {{? account}}
        {{/if}}
        {{#if name}}
            AND name like {{? name}}
        {{/if}}
      `,
      {
        hospital,
        account,
        name
      }
    );
    return await appDB.execute(sql, ...params);
  }

  /**
   * 员工绑定
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .array()
      .items({
        source: should
          .array()
          .required()
          .description('关联员工id'),
        rate: should
          .number()
          .required()
          .description('权重系数')
      })
      .required()
      .description('关联员工[]')
  )
  async addHisStaffWorkSource(staff, sourceRate) {
    return appDB.transaction(async () => {
      // 添加员工关联
      for (const it of sourceRate) {
        await appDB.execute(
          ` insert into
              his_staff_work_source(id, staff, sources, rate, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?)`,
          uuid(),
          staff,
          `{${it.source.map(item => `"${item}"`).join()}}`,
          it.rate,
          dayjs().toDate(),
          dayjs().toDate()
        );
      }
    });
  }
  /**
   * 删除员工绑定
   */
  async delHisStaffWorkSource(id) {
    return await appDB.execute(
      `
        delete from his_staff_work_source where id = ?`,
      id
    );
  }

  /**
   * 修改考核员工
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .array()
      .required()
      .description('关联员工[]')
  )
  async updateHisStaffWorkSource(id, sources, rate) {
    return appDB.transaction(async () => {
      await appDB.execute(
        ` update his_staff_work_source
                set
                sources = ?,
                rate = ?,
                updated_at = ?
              where id = ?`,
        `{${sources.map(item => `"${item}"`).join()}}`,
        rate,
        dayjs().toDate(),
        id
      );
    });
  }

  /**
   * 查询员工绑定
   */
  async selHisStaffWorkSource() {
    const hospital = await getHospital();
    const list = await appDB.execute(
      `
        select
          source.id
          ,source.staff
          ,source.sources
          ,source.rate
          ,staff.name "staffName"
        from his_staff_work_source source
        left join staff on source.staff = staff.id
        where staff.hospital = ?
        order by source.created_at desc`,
      hospital
    );

    const staffList = await appDB.execute(
      `select id, name from staff where hospital = ?`,
      hospital
    );
    const staffListObj = {};

    for (const it of staffList) {
      staffListObj[it.id] = it.name;
    }

    return list.map(it => {
      const sourcesName = it.sources.map(item => {
        return staffListObj[item];
      });
      return {
        ...it,
        sourcesName: sourcesName
      };
    });
  }
}
