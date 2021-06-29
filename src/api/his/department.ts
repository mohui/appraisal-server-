import {getHospital} from './service';
import {appDB} from '../../app';
import {v4 as uuid} from 'uuid';
import {should, validate} from 'kato-server';

export default class HisDepartment {
  @validate(
    should
      .string()
      .required()
      .description('科室')
  )
  async add(name) {
    const hospital = await getHospital();
    return appDB.transaction(async () => {
      // language=PostgreSQL
      return await appDB.execute(
        `
          insert into his_department(id, hospital, name, created_at, updated_at)
          values (?, ?, ?, ?, ?)
        `,
        uuid(),
        hospital,
        name,
        new Date(),
        new Date()
      );
    });
  }

  /**
   *
   * @param id
   * @param name
   */
  @validate(
    should
      .string()
      .required()
      .description('主键'),
    should
      .string()
      .required()
      .description('科室名称')
  )
  async update(id, name) {
    return appDB.transaction(async () => {
      // language=PostgreSQL
      return await appDB.execute(
        `
          update his_department
          set name       = ?,
              updated_at = ?
          where id = ?`,
        name,
        new Date(),
        id
      );
    });
  }

  // 科室删除功能
  @validate(
    should
      .string()
      .required()
      .description('主键')
  )
  async delete(id) {
    return appDB.transaction(async () => {
      // language=PostgreSQL
      await appDB.execute(
        `
        update staff set
          department = null,
          updated_at = ?
        where department = ?`,
        new Date(),
        id
      );
      // language=PostgreSQL
      return await appDB.execute(
        `
          delete from his_department where id = ?`,
        id
      );
    });
  }

  // 科室列表
  async list() {
    const hospital = await getHospital();
    // language=PostgreSQL
    return await appDB.execute(
      `
        select id, hospital, name, created_at
        from his_department
        where hospital = ?
        order by created_at
      `,
      hospital
    );
  }
}
