import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {appDB} from '../../app';
import * as uuid from 'uuid';
import * as dayjs from 'dayjs';
import {getHospital} from './his_staff';
import {HisWorkMethod, HisWorkSource} from '../../../common/his';

export default class HisWorkItem {
  /**
   * 新建公分项
   *
   * @param name 工分项目名称
   * @param method 得分方式; 计数/总和
   * @param source 来源id[]
   * @param type 类型; 检查项目/药品/手工数据
   */
  @validate(
    should
      .string()
      .required()
      .description('工分项目名称'),
    should
      .string()
      .only(HisWorkMethod.AMOUNT, HisWorkMethod.SUM)
      .description('得分方式; 计数/总和'),
    should
      .array()
      .required()
      .description('来源id[]'),
    should
      .string()
      .only(HisWorkSource.CHECK, HisWorkSource.DRUG, HisWorkSource.MANUAL)
      .description('类型; 检查项目/药品/手工数据')
  )
  async add(name, method, source, type) {
    const hospital = await getHospital();

    return appDB.transaction(async () => {
      const hisWorkItemId = uuid.v4();
      // 添加工分项目
      await appDB.execute(
        ` insert into
              his_work_item(id, hospital, name, method, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?)`,
        hisWorkItemId,
        hospital,
        name,
        method,
        dayjs().toDate(),
        dayjs().toDate()
      );

      // 添加工分项目与his收费项目关联表
      for (const sourceId of source) {
        await appDB.execute(
          `insert into
              his_work_item_mapping(item, source, type, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
          hisWorkItemId,
          sourceId,
          type,
          dayjs().toDate(),
          dayjs().toDate()
        );
      }
    });
  }

  /**
   * 员工和工分项绑定
   * @param item
   * @param staffs
   */
  @validate(
    should
      .string()
      .required()
      .description('工分项目id'),
    should
      .array()
      .items({
        staffs: should.array().required(),
        score: should.number().required()
      })
      .required()
      .description('员工和分值')
  )
  async addHisStaffWorkItemMapping(item, staffs) {
    return appDB.transaction(async () => {
      // 排查公分项是否存在
      const itemList = await appDB.execute(
        `select * from his_work_item where id = ?`,
        item
      );
      if (itemList.length === 0) throw new KatoRuntimeError(`工分项目不存在`);
      // 排查公分项是否存在
      const staffItemList = await appDB.execute(
        `select * from his_staff_work_item_mapping where item = ?`,
        item
      );
      // 如果已经存在,先删除
      if (staffItemList.length > 0)
        await appDB.execute(
          `delete from his_staff_work_item_mapping where item = ?`,
          item
        );
      // 绑定员工和工分项
      for (const it of staffs) {
        for (const staffIt of it.staffs) {
          await appDB.execute(
            ` insert into
              his_staff_work_item_mapping(item, staff, score, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
            item,
            staffIt,
            it.score,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      }
    });
  }
}
