import {KatoRuntimeError, should, validate} from 'kato-server';
import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {HisWorkMethod, HisWorkSource} from '../../../common/his';
import {sql as sqlRender} from '../../database/template';
import {getHospital} from './service';

/**
 * 工分项目来源
 */
const HisWorkItemSources: {
  id: string;
  name: string;
  parent?: string;
}[] = [
  {id: '门诊', name: '门诊', parent: null},
  {id: '门诊-检查项目', name: '检查项目', parent: '门诊'},
  //示例
  //{id: '住院-检查项目-{id}', name: 'B超', parent: '门诊-检查项目'},
  {id: '门诊-药品', name: '药品', parent: '门诊'},
  {id: '住院', name: '住院', parent: null},
  {
    id: '住院-检查项目',
    name: '检查项目',
    parent: '住院'
  },
  {id: '住院-药品', name: '药品', parent: '住院'},
  {id: '手工数据', name: '手工数据', parent: null},
  {id: '公卫数据', name: '公卫数据', parent: null}
];

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
      const hisWorkItemId = uuid();
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
      // 查询有没有工分项和考核员工的对应关系
      const staffWork = await appDB.execute(
        `select * from his_staff_work_item_mapping where item = ?`,
        id
      );
      if (staffWork.length > 0)
        throw new KatoRuntimeError(`工分项目绑定了考核员工,不能删除`);

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
          `select id, name, '${HisWorkSource.CHECK}' as source
               from his_check
               where status = true and id in (${checkIds.map(() => '?')})`,
          ...checkIds
        );
      }
      // 药品
      if (drugsIds.length > 0) {
        drugs = await originalDB.execute(
          `select id, name, '${HisWorkSource.DRUG}' as source
             from his_drug where id in (${drugsIds.map(() => '?')})`,
          ...drugsIds
        );
      }
      // 手工数据
      if (manualIds.length > 0) {
        manuals = await appDB.execute(
          `select id, name, '${HisWorkSource.MANUAL}' as source
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
   * 医疗工分项目来源
   * @param type 工分项目来源
   * @param keyWord 关键字搜索
   */
  @validate(
    should
      .string()
      .only(HisWorkSource.CHECK, HisWorkSource.DRUG, HisWorkSource.MANUAL)
      .description('工分项目id'),
    should
      .string()
      .allow(null)
      .description('员工和分值')
  )
  async searchSource(type, keyWord) {
    if (keyWord) keyWord = `%${keyWord}%`;
    const hospital = await getHospital();
    // 结果
    let checkSources;
    let sql, params;
    if (type === HisWorkSource.CHECK) {
      [sql, params] = sqlRender(
        `
        select id, name
        from his_check
        where status = true
        {{#if keyWord}}
            AND name like {{? keyWord}}
        {{/if}}
        limit 50
      `,
        {
          keyWord
        }
      );
      checkSources = await originalDB.execute(sql, ...params);
    }
    if (type === HisWorkSource.DRUG) {
      [sql, params] = sqlRender(
        `
        select id, name
        from his_drug
        where 1 = 1
        {{#if keyWord}}
            AND name like {{? keyWord}}
        {{/if}}
        limit 50
      `,
        {
          keyWord
        }
      );
      checkSources = await originalDB.execute(sql, ...params);
    }

    if (type === HisWorkSource.MANUAL) {
      [sql, params] = sqlRender(
        `
        select id, name
        from his_manual_data
        where hospital = {{? hospital}}
        {{#if keyWord}}
            AND name like {{? keyWord}}
        {{/if}}
        limit 50
      `,
        {
          hospital,
          keyWord
        }
      );
      checkSources = await appDB.execute(sql, ...params);
    }
    return checkSources;
  }

  /**
   * 工分项和员工的绑定
   * @param item 工分项id
   * @param params (要修改的主键, 要添加的员工, 要删除的主键, 分数)
   */
  @validate(
    should
      .string()
      .required()
      .description('工分项目id'),
    should
      .object({
        insert: should
          .object({
            staffs: should
              .array()
              .required()
              .description('员工id'),
            score: should
              .number()
              .required()
              .allow(null)
              .description('分值')
          })
          .required()
          .description('要添加的绑定关系'),
        update: should
          .object({
            ids: should
              .array()
              .required()
              .description('员工和工分项绑定id'),
            score: should
              .number()
              .required()
              .allow(null)
              .description('分值')
          })
          .required()
          .description('要修改的绑定关系'),
        delete: should
          .array()
          .required()
          .description('员工和公分项绑定id')
      })
      .required()
      .description('要增删改的公分项和员工的绑定')
  )
  async upsertStaffWorkItemMapping(item, params) {
    return appDB.transaction(async () => {
      // 排查公分项是否存在
      const itemList = await appDB.execute(
        `select * from his_work_item where id = ?`,
        item
      );
      if (itemList.length === 0) throw new KatoRuntimeError(`工分项目不存在`);

      // 排查公分项是否存在
      const staffItemList = await appDB.execute(
        `select id, staff, item, score from his_staff_work_item_mapping where item = ?`,
        item
      );

      // 第一步,判断如果有需要删除的数据先执行删除
      if (params?.delete.length > 0) {
        await appDB.execute(
          `delete from his_staff_work_item_mapping
                 where id in (${params.delete.map(() => '?')})`,
          ...params.delete
        );
      }

      // 第二步, 如果有需要添加的数据,执行添加
      if (params?.insert.staffs.length > 0) {
        const staffIds = params.insert.staffs;
        if (staffIds.length === 0)
          throw new KatoRuntimeError(`考核员工不能为空`);

        const checkStaff = await appDB.execute(
          `select id, account, name from staff where id in (${staffIds.map(
            () => '?'
          )})`,
          ...staffIds
        );

        if (checkStaff.length !== staffIds.length)
          throw new KatoRuntimeError(`考核员工异常`);

        // 校验员工是否已经绑定过公分项
        staffItemList.forEach(it => {
          const index = checkStaff.find(staff => it.staff === staff.id);
          if (index)
            throw new KatoRuntimeError(`员工${index.name}已绑定过该工分项`);
        });
        // 添加
        for (const staffIt of staffIds) {
          await appDB.execute(
            ` insert into
              his_staff_work_item_mapping(id, item, staff, score, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?)`,
            uuid(),
            item,
            staffIt,
            params.insert.score,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      }

      // 第三步, 如果有需要更新的数据,执行更新
      if (params?.update.ids.length > 0) {
        // 先根据id查询到该工分项下的员工是否在其他分数中存在
        const updList = await appDB.execute(
          `select id, staff, item, score
                from his_staff_work_item_mapping
                where id in (${params?.update.ids.map(() => '?')})`,
          ...params.update.ids
        );
        // 校验员工是否已经绑定过公分项
        staffItemList.forEach(it => {
          const index = updList.find(
            item => it.staff === item.staff && it.score !== item.score
          );
          if (index)
            throw new KatoRuntimeError(`员工${index.name}已绑定过该工分项`);
        });
        await appDB.execute(
          `update his_staff_work_item_mapping set score = ?, updated_at = ?
                where id in (${params?.update.ids.map(() => '?')})
          `,
          params.update.score,
          dayjs().toDate(),
          ...params.update.ids
        );
      }
    });
  }

  /**
   * 公分项和员工列表
   */
  @validate(
    should
      .string()
      .allow(null)
      .description('工分项目id'),
    should
      .string()
      .allow(null)
      .description('公分项名称'),
    should
      .string()
      .allow(null)
      .description('员工名称')
  )
  async selStaffWorkItemMapping(method, name, staffName) {
    const hospital = await getHospital();
    if (name) name = `%${name}%`;
    if (staffName) staffName = `%${staffName}%`;

    const [sql, params] = sqlRender(
      `
        select item.id
          ,item.name
          ,item.method
          ,mapping.id "mappingId"
          ,mapping.staff
          ,mapping.score
          ,staff.name "staffName"
          ,staff.account
        from his_staff_work_item_mapping mapping
        left join his_work_item item  on mapping.item = item.id
        left join staff on mapping.staff = staff.id
        where item.hospital = {{? hospital}}
        {{#if method}}
            AND item.method = {{? method}}
        {{/if}}
        {{#if name}}
            AND item.name like {{? name}}
        {{/if}}
        {{#if staffName}}
            AND staff.name like {{? staffName}}
        {{/if}}
      `,
      {
        hospital,
        method,
        name,
        staffName
      }
    );
    const itemList = await appDB.execute(sql, ...params);
    if (itemList.length === 0) return [];

    const returnList = [];
    for (const it of itemList) {
      const index = returnList.find(
        item => item.id === it.id && item.score === it.score
      );
      if (index) {
        if (it.staff) {
          index.staffs.push({
            mapping: it.mappingId,
            id: it.staff,
            name: it.staffName,
            account: it.account
          });
        }
      } else {
        returnList.push({
          id: it.id,
          name: it.name,
          method: it.method,
          score: it.score,
          staffs: it.staff
            ? [
                {
                  mapping: it.mappingId,
                  id: it.staff,
                  name: it.staffName,
                  account: it.account
                }
              ]
            : []
        });
      }
    }
    return returnList;
  }

  @validate(
    should
      .string()
      .required()
      .description('工分项目id'),
    should
      .array()
      .min(1)
      .required()
      .description('员工id')
  )
  async delStaffWorkItemMapping(id, staffs) {
    return appDB.transaction(async () => {
      // 删除对应关系
      await appDB.execute(
        `delete from his_staff_work_item_mapping
              where item = ? and staff in (${staffs.map(() => '?')})`,
        id,
        ...staffs
      );
    });
  }

  @validate(
    should
      .string()
      .allow(null)
      .description('工分项目id')
  )
  async staffList(item) {
    const hospital = await getHospital();

    let workStaff = [];
    if (item) {
      workStaff = await appDB.execute(
        `select staff from  his_staff_work_item_mapping where item = ?`,
        item
      );
    }
    // 获取可选择的员工列表
    const staffList = await appDB.execute(
      `select id, account, name
            from staff
            where hospital = ?`,
      hospital
    );

    return staffList.map(it => {
      const index = workStaff.find(item => it.id === item.staff);
      return {
        ...it,
        usable: !index
      };
    });
  }
}
