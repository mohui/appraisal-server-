import {appDB} from '../../app';
import * as uuid from 'uuid';
import {getHospital} from './his_staff';
import * as dayjs from 'dayjs';
import {KatoRuntimeError} from 'kato-server';

export default class HisCheck {
  async list() {
    const hospital = await getHospital();
    const systemList = await appDB.execute(
      `select
              system.id,
              system.hospital,
              system.name,
              mapping.staff
        from his_check_system system
        left join his_staff_check_mapping mapping on system.id = mapping."check"
        where system.hospital = ?
      `,
      hospital
    );
    const returnList = [];
    for (const it of systemList) {
      const findIndex = returnList.find(find => find?.id === it.id);
      if (findIndex) {
        findIndex.staffs.push({
          staff: it.staff
        });
      } else {
        returnList.push({
          id: it.id,
          name: it.name,
          staffs: [
            {
              staff: it.staff
            }
          ]
        });
      }
    }
    return returnList;
  }

  /**
   * 新建考核方案
   * 1个员工只能被一个考核方案考核
   *
   * @param name
   * @param staffs
   */
  async add(name, staffs) {
    const hospital = await getHospital();
    return appDB.transaction(async () => {
      const staffList = await appDB.execute(
        `select * from his_staff_check_mapping
              where staff in (${staffs.map(() => '?')})`,
        ...staffs
      );
      if (staffList.length > 0)
        throw new KatoRuntimeError(`有员工已被其他考核方案考核`);
      // 添加考核方案名称
      const checkId = uuid.v4();
      await appDB.execute(
        `insert into
              his_check_system(id, hospital, name, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
        checkId,
        hospital,
        name,
        dayjs().toDate(),
        dayjs().toDate()
      );
      // 添加考核员工
      await appDB.execute(
        `
        insert into
        his_staff_check_mapping(staff, "check", created_at, updated_at)
        values${staffs.map(() => '(?, ?, ?, ?)').join()}
        `,
        ...staffs
          .map(it => [it, checkId, dayjs().toDate(), dayjs().toDate()])
          .reduce((prev, current) => {
            return [...prev, ...current];
          }, [])
      );
    });
  }

  /**
   * 删除考核方案
   */
  async delete(id) {
    return appDB.transaction(async () => {
      await appDB.execute(
        `delete from his_staff_check_mapping where "check" = ?`,
        id
      );
      await appDB.execute(`delete from his_check_system where id = ?`, id);
    });
  }
}
