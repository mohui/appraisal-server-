import {KatoRuntimeError, should, validate} from 'kato-server';
import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {getHospital} from './his_staff';
import {HisWorkMethod, HisWorkSource} from '../../../common/his';
import {monthToRange} from './manual';
import {sql as sqlRender} from '../../database/template';
import Decimal from 'decimal.js';

/**
 * 工分流水
 */
type WorkItemDetail = {
  //工分项id
  item: any;
  //工分项得分
  score: number;
  //赋值时间
  date: Date;
};

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
          `select id, name, '${HisWorkSource.CHECK}' as source
             from his_check where id in (${checkIds.map(() => '?')})`,
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
        manuals = await originalDB.execute(
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
   * 同步员工工分项流水
   *
   * @param staff 员工id
   * @param month 月份
   */
  async syncDetail(staff, month) {
    const {start, end} = monthToRange(month);
    //查询该员工绑定的工分来源
    // language=PostgreSQL
    const workItemSources: {
      //工分项id
      id: string;
      //得分方式
      method: string;
      //分值
      score: number;
      //工分项目原始id
      source: string;
      //原始工分项目类型
      type: string;
    }[] = await appDB.execute(
      `
        select w.id, w.method, sm.score, wm.source, wm.type
        from his_work_item_mapping wm
               inner join his_staff_work_item_mapping sm on sm.item = wm.item
               inner join his_work_item w on wm.item = w.id
        where sm.staff = ?
      `,
      staff
    );

    let workItems: WorkItemDetail[] = [];
    //region 计算CHECK和DRUG工分来源
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
    if (hisStaffId) {
      const params = workItemSources.filter(
        it => it.type === HisWorkSource.CHECK || it.type == HisWorkSource.DRUG
      );
      for (const param of params) {
        //查询his的收费项目
        // language=PostgreSQL
        const rows: {
          type: string;
          value: string;
          date: Date;
        }[] = await originalDB.execute(
          `
            select charges_type as type, total_price as value, operate_time as date
            from his_charge_detail
            where doctor = ?
              and operate_time > ?
              and operate_time < ?
              and item_type = ?
              and item = ?
            order by operate_time
          `,
          hisStaffId,
          start,
          end,
          param.type,
          param.source
        );
        workItems = workItems.concat(
          //his收费项目转换成工分流水
          rows.map<WorkItemDetail>(it => {
            let score = 0;
            //计算单位量; 收费/退费区别
            const value = new Decimal(it.value)
              .mul(it.type === '4' ? -1 : 1)
              .toNumber();
            //SUM得分方式
            if (param.method === HisWorkMethod.SUM) {
              score = new Decimal(value).mul(param.score).toNumber();
            }
            //AMOUNT得分方式
            if (param.method === HisWorkMethod.AMOUNT) {
              score = param.score;
            }
            return {
              item: param.id,
              date: it.date,
              score: score
            };
          })
        );
      }
    }
    //endregion
    //region 计算MANUAL工分来源
    const params = workItemSources.filter(
      it => it.type === HisWorkSource.MANUAL
    );
    for (const param of params) {
      //查询手工数据流水表
      // language=PostgreSQL
      const rows: {date: Date; value: number}[] = await appDB.execute(
        `
          select date, value
          from his_staff_manual_data_detail
          where staff = ?
            and item = ?
            and date >= ?
            and date < ?
        `,
        staff,
        param.source
      );
      workItems = workItems.concat(
        //手工数据流水转换成工分流水
        rows.map<WorkItemDetail>(it => {
          let score = 0;
          //计算单位量; 收费/退费区别
          //SUM得分方式
          if (param.method === HisWorkMethod.SUM) {
            score = new Decimal(it.value).mul(param.score).toNumber();
          }
          //AMOUNT得分方式
          if (param.method === HisWorkMethod.AMOUNT) {
            score = param.score;
          }
          return {
            item: param.id,
            date: it.date,
            score: score
          };
        })
      );
    }
    //endregion
    //region 同步流水
    await appDB.joinTx(async () => {
      //删除旧流水
      // language=PostgreSQL
      await appDB.execute(
        `
          delete
          from his_staff_work_score_detail
          where staff = ?
            and date >= ?
            and date < ?
        `,
        staff,
        start,
        end
      );
      //添加新流水
      for (const item of workItems) {
        // language=PostgreSQL
        await appDB.execute(
          `
          insert into his_staff_work_score_detail(id, staff, item, date, score)
          values (?, ?, ?, ?, ?)
        `,
          uuid(),
          staff,
          item.item,
          item.date,
          item.score
        );
      }
    });
    //endregion
  }

  /**
   *
   * @param type
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
  async upsertStaffWorkItemMapping(item, staffs) {
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
   * 公分项和员工列表
   */
  @validate(
    should
      .string()
      .allow(null)
      .description('工分项目id'),
    should
      .array()
      .allow(null)
      .description('员工和分值')
  )
  async selStaffWorkItemMapping(method, name) {
    const hospital = await getHospital();
    if (name) name = `%${name}%`;

    const [sql, params] = sqlRender(
      `
        select item.id, item.name
          ,item.method
          ,mapping.staff
          ,mapping.score
          ,staff.name "staffName"
          ,staff.account
        from his_staff_work_item_mapping mapping
        left join his_work_item item  on mapping.item = item.id
        left join staff on mapping.staff = staff.id
        where item.hospital = {{? hospital}}
        {{#if method}}
            AND method = {{? method}}
        {{/if}}
        {{#if name}}
            AND name like {{? name}}
        {{/if}}
      `,
      {
        hospital,
        method,
        name
      }
    );
    const itemList = await appDB.execute(sql, ...params);
    if (itemList.length === 0) return [];

    const returnList = [];
    for (const it of itemList) {
      const index = returnList.find(item => item.id === it.id);
      if (index) {
        if (it.staff) {
          index.staffs.push({
            id: it.staff,
            name: it.name,
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
                  id: it.staff,
                  name: it.name,
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
      .description('工分项目id')
  )
  async delStaffWorkItemMapping(id) {
    return appDB.transaction(async () => {
      // 删除对应关系
      await appDB.execute(
        `delete from his_staff_work_item_mapping where item = ?`,
        id
      );
    });
  }
}
