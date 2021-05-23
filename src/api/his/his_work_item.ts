import {KatoRuntimeError, should, validate} from 'kato-server';
import {appDB, originalDB} from '../../app';
import * as uuid from 'uuid';
import * as dayjs from 'dayjs';
import {getHospital} from './his_staff';
import {HisWorkMethod, HisWorkSource} from '../../../common/his';
import {monthToRange} from './manual';

/**
 * 接口
 *
 * 新建公分项
 * 修改公分项
 * 删除公分项
 * 员工和工分项的绑定
 * 公分项列表
 */
export default class HisWorkItem {
  /**
   * 新建公分项
   *
   * @param name 工分项目名称
   * @param method 得分方式; 计数/总和
   * @param mappings [{来源id[],type:类型; 检查项目/药品/手工数据}]
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
      .items({
        source: should.array().required(),
        type: should
          .string()
          .only(HisWorkSource.CHECK, HisWorkSource.DRUG, HisWorkSource.MANUAL)
          .description('类型; 检查项目/药品/手工数据')
      })
      .required()
      .description('来源id[]')
  )
  async add(name, method, mappings) {
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
      for (const it of mappings) {
        for (const sourceId of it.source) {
          await appDB.execute(
            `insert into
              his_work_item_mapping(item, source, type, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
            hisWorkItemId,
            sourceId,
            it.type,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
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

  /**
   * 修改工分项目
   * @param id 工分项目id
   * @param name 工分项目名称
   * @param method 得分方式
   * @param mappings
   */
  @validate(
    should
      .string()
      .required()
      .description('工分项目id'),
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
      .items({
        source: should.array().required(),
        type: should
          .string()
          .only(HisWorkSource.CHECK, HisWorkSource.DRUG, HisWorkSource.MANUAL)
          .description('类型; 检查项目/药品/手工数据')
      })
      .required()
      .description('来源id[]')
  )
  async update(id, name, method, mappings) {
    return appDB.transaction(async () => {
      // 添加工分项目
      await appDB.execute(
        ` update his_work_item
              set name = ?,
                method = ?,
                updated_at = ?
              where id = ?`,
        name,
        method,
        dayjs().toDate(),
        id
      );
      // 先删除
      await appDB.execute(
        `delete from his_work_item_mapping where item = ?`,
        id
      );
      // 添加工分项目与his收费项目关联表
      for (const it of mappings) {
        for (const sourceId of it.source) {
          // 再添加
          await appDB.execute(
            `insert into
              his_work_item_mapping(item, source, type, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
            id,
            sourceId,
            it.type,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      }
    });
  }

  /**
   * 删除工分项目
   * @param id
   */
  async delete(id) {
    return appDB.transaction(async () => {
      // 删除对应关系
      await appDB.execute(
        `delete from his_staff_work_item_mapping where item = ?`,
        id
      );
      // 删除工分项目来源
      await appDB.execute(
        `delete from his_work_item_mapping where item = ?`,
        id
      );
      // 删除工分项目
      await appDB.execute(`delete from his_work_item where id = ?`, id);
    });
  }

  /**
   * 工分项列表
   */
  async list() {
    // 获取机构id
    const hospital = await getHospital();
    // 查询工分项目
    const workItemList = await appDB.execute(
      `select id, name, method from his_work_item where hospital = ?`,
      hospital
    );
    if (workItemList.length === 0) return [];
    // 数据来源
    let itemMappings = [];

    for (const it of workItemList) {
      // 工分项id
      const itemId = it?.id;
      // 查找工分项目来源
      const workItemMappingList = await appDB.execute(
        `select item, source, type from his_work_item_mapping where item = ?`,
        itemId
      );
      const checkIds = workItemMappingList
        .filter(it => it.type === HisWorkSource.CHECK)
        .map(it => it.source);

      const drugsIds = workItemMappingList
        .filter(it => it.type === HisWorkSource.DRUG)
        .map(it => it.source);

      const manualIds = workItemMappingList
        .filter(it => it.type === HisWorkSource.MANUAL)
        .map(it => it.source);
      // 检查项目列表
      let checks = [];
      // 药品
      let drugs = [];
      // 手工数据
      let manuals = [];
      if (checkIds.length > 0) {
        checks = await originalDB.execute(
          `select id, name
             from his_check where id in (${checkIds.map(() => '?')})`,
          ...checkIds
        );
      }
      // 药品
      if (drugsIds.length > 0) {
        drugs = await originalDB.execute(
          `select id, name
             from his_drug where id in (${drugsIds.map(() => '?')})`,
          ...drugsIds
        );
      }
      // 手工数据
      if (manualIds.length > 0) {
        manuals = await originalDB.execute(
          `select id, name
             from his_manual_data where id in (${manualIds.map(() => '?')})`,
          ...manualIds
        );
      }
      itemMappings = checks.concat(drugs, manuals);
      it['mappings'] = itemMappings;
    }

    return workItemList;
  }

  /**
   * 同步员工工分项流水
   *
   * @param staff 员工id
   * @param month 月份
   */
  async syncDetail(staff, month) {
    const {start, end} = monthToRange(month);
    //查询绑定的his账号id
    // language=PostgreSQL
    const hisStaffId = (
      await appDB.execute(
        `
          select staff
          from staff
          where id = ?`,
        staff
      )
    )[0].staff;
    let hisDetail = [];
    //
    if (hisStaffId) {
      // language=PostgreSQL
      hisDetail = await originalDB.execute(
        `
          select item, charges_type as type, total_price as value, operate_time as date
          from his_charge_detail
          where operate_time > ?
            and operate_time < ?
            and doctor = ?
        `,
        start,
        end,
        hisStaffId
      );
    }
    return {hisDetail};
  }
}
