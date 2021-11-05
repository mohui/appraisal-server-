// region 员工信息
import {appDB} from '../../app';
import {Occupation} from '../../../common/his';

export async function getStaffList(hospital) {
  // 查询员工信息
  const staffModels = await appDB.execute(
    // language=PostgreSQL
    `
        select id, account, name, major, title, education, "isGP", created_at
        from staff
        where hospital = ?
      `,
    hospital
  );
  // 给员工标注
  return staffModels.map(it => {
    // 先查找 专业类别,找到此专业类别的类型
    const findIndex = Occupation.find(majorIt => majorIt.name === it.major);
    // 根据查找到的专业类别, 查找 职称名称 的职称类型
    let titleIndex;
    if (findIndex) {
      titleIndex = findIndex?.children?.find(
        titleIt => titleIt.name === it.title
      );
    }
    return {
      ...it,
      majorType: findIndex?.majorType ?? null,
      doctorType: findIndex?.doctorType ?? null,
      majorHealthType: findIndex?.majorHealthType ?? null,
      level: titleIndex?.level ?? null
    };
  });
}
// endregion
