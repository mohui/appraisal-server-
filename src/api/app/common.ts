import {appDB, originalDB} from '../../app';
import {KatoCommonError} from 'kato-server';
import * as dayjs from 'dayjs';

/**
 * 员工解绑机构
 *
 * @param area 机构id
 * @param staff 员工id
 * @return {
 *   id: '主机构id'
 * }
 */
export async function unbindHospital(
  area: string,
  staff: string
): Promise<{
  id: string;
}> {
  const hisStaffModels = await originalDB.execute(
    // language=PostgreSQL
    `
      select id, name, hospital
      from his_staff
      where hospital = ?
    `,
    area
  );
  // 所有的his员工id
  const hisStaffIds = hisStaffModels.map(it => it.id);

  // 机构下的所有公卫员工
  const phStaffModels = await originalDB.execute(
    // language=PostgreSQL
    `
      select id, name username, states
      from ph_user
      where hospital = ?
    `,
    area
  );
  // 所有的公卫员工id
  const phStaffIds = phStaffModels.map(it => it.id);
  return appDB.transaction(async () => {
    /**
     * 1. 先删除his员工和公卫员工
     * 2. 获取用户关联的所有机构
     * 3. 判断要删除的是否是主机构.
     * 3.1: 是,判断此员工的关联机构是是单个还是多个
     * 3.1.1: 单个: 修改用户表主机构和科室为null, 多个: 员工最后绑定的机构设置为主机构, 删除绑定表此机构
     * 3.2 否: 直接删除员工绑定的此机构
     */
    if (phStaffIds.length > 0) {
      // 删除员工和公卫员工关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_ph_mapping
          where staff = ?
            and ph_staff in (${phStaffIds.map(() => '?')})
        `,
        staff,
        ...phStaffIds
      );
    }

    if (hisStaffIds.length > 0) {
      // 删除员工和his员工关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_his_mapping
          where staff = ?
            and his_staff in (${hisStaffIds.map(() => '?')})
        `,
        staff,
        ...hisStaffIds
      );
    }
    // 1. 获取用户关联的所有机构
    const areaMappingModels: {
      staff: string;
      area: string;
      department: string;
      created_at: Date;
      primaryHospital: string;
    }[] = await appDB.execute(
      // language=PostgreSQL
      `
        select areaMapping.staff,
               areaMapping.area,
               areaMapping.department,
               areaMapping.created_at,
               staff.hospital "primaryHospital"
        from staff_area_mapping areaMapping
               inner join staff on areaMapping.staff = staff.id
        where areaMapping.staff = ?
        order by areaMapping.created_at desc
      `,
      staff
    );
    if (areaMappingModels.length === 0)
      throw new KatoCommonError('此员工未绑定机构, 无法删除');
    // 2. 判断要删除的是否是主机构
    if (area === areaMappingModels[0].primaryHospital) {
      // 主机构
      let primaryHospital = null;
      // 主机构科室
      let primaryDepartment = null;
      // 2.1: 是,判断此员工的关联机构是是单个还是多个
      if (areaMappingModels.length > 1) {
        // 2.1.1: 单个: 修改用户表主机构和科室为null, 多个: 员工最后绑定的机构设置为主机构, 删除绑定表此机构
        primaryHospital =
          areaMappingModels[0].area === area
            ? areaMappingModels[1]?.area
            : areaMappingModels[0].area;
        primaryDepartment =
          areaMappingModels[0].area === area
            ? areaMappingModels[1]?.department
            : areaMappingModels[0].department;
      }
      // 删除员工和此机构绑定
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_area_mapping
          where staff = ?
            and area = ?`,
        staff,
        area
      );
      // 修改员工主机构
      await appDB.execute(
        // language=PostgreSQL
        `
          update staff
          set hospital   = ?,
              department = ?,
              updated_at = ?
          where id = ?
        `,
        primaryHospital,
        primaryDepartment,
        dayjs().toDate(),
        staff
      );
      return {id: primaryHospital};
    }
    // 2.2 否: 直接删除员工绑定的此机构
    // 删除员工和地区关联表
    await appDB.execute(
      // language=PostgreSQL
      `
        delete
        from staff_area_mapping
        where staff = ?
          and area = ?`,
      staff,
      area
    );
    return {id: areaMappingModels[0].primaryHospital};
  });
}
