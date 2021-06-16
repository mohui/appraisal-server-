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
export const HisWorkItemSources: {
  id: string;
  name: string;
  parent?: string;
  datasource?: {
    table: string;
    date: string;
    columns?: string[];
  };
}[] = [
  {id: '门诊', name: '门诊', parent: null},
  {id: '门诊.检查项目', name: '检查项目', parent: '门诊'},
  //示例
  //{id: '住院-检查项目-{id}', name: 'B超', parent: '门诊-检查项目'},
  {id: '门诊.药品', name: '药品', parent: '门诊'},
  {id: '住院', name: '住院', parent: null},
  {id: '住院.检查项目', name: '检查项目', parent: '住院'},
  {id: '住院.药品', name: '药品', parent: '住院'},
  {id: '手工数据', name: '手工数据', parent: null},
  {id: '公卫数据', name: '公卫数据', parent: null},
  {
    id: '公卫数据.老年人生活自理能力评估',
    name: '老年人生活自理能力评估',
    parent: '公卫数据',
    datasource: {
      table: 'view_HealthCheckTableScore',
      date: 'OperateTime'
    }
  },
  {
    id: '公卫数据.生活方式',
    name: '生活方式',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'OperateTime',
      columns: ['dlpn']
    }
  },
  {
    id: '公卫数据.脏器功能',
    name: '脏器功能',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'OperateTime',
      columns: ['kc']
    }
  },
  {
    id: '公卫数据.查体-眼底',
    name: '查体-眼底',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['yd']
    }
  },
  {
    id: '公卫数据.查体-足背动脉搏动',
    name: '查体-足背动脉搏动',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['tnbzbdmbd']
    }
  },
  {
    id: '公卫数据.查体-肛门指诊',
    name: '查体-肛门指诊',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['gmzz']
    }
  },
  {
    id: '公卫数据.查体-妇科',
    name: '查体-妇科',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['fk_wy']
    }
  },
  {
    id: '公卫数据.查体-其他',
    name: '查体-其他',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['ctqt']
    }
  },
  {
    id: '公卫数据.辅助检查-血常规',
    name: '辅助检查-血常规',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xcgHb']
    }
  },
  {
    id: '公卫数据.辅助检查-尿常规',
    name: '辅助检查-尿常规',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['ncgndb']
    }
  },
  {
    id: '公卫数据.辅助检查-空腹血糖',
    name: '辅助检查-空腹血糖',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['kfxt']
    }
  },
  {
    id: '公卫数据.辅助检查-心电图',
    name: '辅助检查-心电图',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xdt']
    }
  },
  {
    id: '公卫数据.辅助检查-尿微量白蛋白',
    name: '辅助检查-尿微量白蛋白',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['nwlbdb']
    }
  },
  {
    id: '公卫数据.辅助检查-大便潜血',
    name: '辅助检查-大便潜血',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['dbqx']
    }
  },
  {
    id: '公卫数据.辅助检查-糖化血红蛋白',
    name: '辅助检查-糖化血红蛋白',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['tnbthxhdb']
    }
  },
  {
    id: '公卫数据.辅助检查-乙型肝炎表面抗原',
    name: '辅助检查-乙型肝炎表面抗原',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['HBsAg']
    }
  },
  {
    id: '公卫数据.辅助检查-肝功能',
    name: '辅助检查-肝功能',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['ggnALT']
    }
  },
  {
    id: '公卫数据.辅助检查-肾功能',
    name: '辅助检查-肾功能',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['sgnScr']
    }
  },
  {
    id: '公卫数据.辅助检查-血脂',
    name: '辅助检查-血脂',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xzCHO']
    }
  },
  {
    id: '公卫数据.辅助检查-胸部X光片',
    name: '辅助检查-胸部X光片',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xzCHO']
    }
  },
  {
    id: '公卫数据.辅助检查-B超',
    name: '辅助检查-B超',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xp']
    }
  },
  {
    id: '公卫数据.辅助检查-宫颈涂片',
    name: '辅助检查-宫颈涂片',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xp']
    }
  },
  {
    id: '公卫数据.辅助检查-宫颈涂片',
    name: '辅助检查-其他',
    parent: '公卫数据',
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['jkfzjcqt']
    }
  },
  {
    id: '公卫数据.高血压随访',
    name: '高血压随访',
    parent: '公卫数据',
    datasource: {
      table: 'view_HypertensionVisit',
      date: 'FollowUpDate'
    }
  },
  {
    id: '公卫数据.高血压随访-辅助检查',
    name: '高血压随访-辅助检查',
    parent: '公卫数据',
    datasource: {
      table: 'view_HypertensionVisit',
      date: 'FollowUpDate',
      columns: ['Fzjc']
    }
  },
  {
    id: '公卫数据.2型糖尿病随访',
    name: '2型糖尿病随访',
    parent: '公卫数据',
    datasource: {
      table: 'view_DiabetesVisit',
      date: 'FollowUpDate'
    }
  },
  {
    id: '公卫数据.2型糖尿病随访-糖化血红蛋白',
    name: '2型糖尿病随访-糖化血红蛋白',
    parent: '公卫数据',
    datasource: {
      table: 'view_DiabetesVisit',
      date: 'FollowUpDate',
      columns: ['Hemoglobin']
    }
  },
  {
    id: '公卫数据.2型糖尿病随访-空腹血糖',
    name: '2型糖尿病随访-空腹血糖',
    parent: '公卫数据',
    datasource: {
      table: 'view_DiabetesVisit',
      date: 'FollowUpDate',
      columns: ['FastingGlucose']
    }
  },
  {
    id: '公卫数据.老年人中医药服务',
    name: '老年人中医药服务',
    parent: '公卫数据',
    datasource: {
      table: 'view_QuestionnaireMain',
      date: 'OperateTime'
    }
  },
  {
    id: '公卫数据.卫生计生监督协管信息报告登记',
    name: '卫生计生监督协管信息报告登记',
    parent: '公卫数据',
    datasource: {
      table: 'view_SanitaryControlReport',
      date: 'ReportTime'
    }
  },
  {
    id: '公卫数据.卫生计生监督协管巡查登记',
    name: '卫生计生监督协管巡查登记',
    parent: '公卫数据',
    datasource: {
      table: 'view_SanitaryControlAssist',
      date: 'checkDate'
    }
  }
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
  // region 公分项目的增删改查
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
      .required()
      .description('来源id[]')
  )
  async add(name, method, mappings) {
    if (mappings.find(it => it === '手工数据' || it === '公卫数据'))
      throw new KatoRuntimeError(`不能选择手工数据和公卫数据节点`);
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
      for (const sourceId of mappings) {
        let code = null;
        const sources = sourceId?.split('.') ?? [];
        // 手工数据
        if (sourceId.startsWith('手工数据') && sources.length === 2) {
          code = sources[1];
        }
        // 手工数据
        if (
          (sourceId.startsWith('门诊') || sourceId.startsWith('住院')) &&
          sources.length === 4
        ) {
          code = sources[3];
        }
        await appDB.execute(
          `insert into
              his_work_item_mapping(item, source, code, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
          hisWorkItemId,
          sourceId,
          code,
          dayjs().toDate(),
          dayjs().toDate()
        );
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
      for (const sourceId of mappings) {
        let code = null;
        const sources = sourceId?.split('.') ?? [];
        // 手工数据
        if (sourceId.startsWith('手工数据') && sources.length === 2) {
          code = sources[1];
        }
        // 手工数据
        if (
          (sourceId.startsWith('门诊') || sourceId.startsWith('住院')) &&
          sources.length === 4
        ) {
          code = sources[3];
        }
        // 再添加
        await appDB.execute(
          `insert into
              his_work_item_mapping(item, source, code, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
          id,
          sourceId,
          code,
          dayjs().toDate(),
          dayjs().toDate()
        );
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
      `select id, name, method from his_work_item where hospital = ? order by created_at`,
      hospital
    );
    if (workItemList.length === 0) return [];

    for (const it of workItemList) {
      // 工分项id
      const itemId = it?.id;
      // 查找工分项目来源
      const workItemMappingList = await appDB.execute(
        `select item, source, code from his_work_item_mapping where item = ?`,
        itemId
      );
      // 检查项目id列表
      const checkIds = [];
      // 药品id列表
      const drugsIds = [];
      // 手工数据id列表
      const manualIds = [];
      // 没有id的列表
      const mappings = [];
      // 检查项目分类id的列表
      const checkDictIds = [];
      // 药品分类id的列表
      const drugDictIds = [];
      workItemMappingList.forEach(mappingIt => {
        // 筛选出所有的检查项目id
        if (mappingIt.source?.includes('检查项目') && mappingIt.code) {
          checkIds.push(mappingIt);
        }
        // 筛选出所有的药品id
        if (mappingIt.source?.includes('药品') && mappingIt.code) {
          drugsIds.push(mappingIt);
        }
        if (mappingIt.source?.includes('手工数据') && mappingIt.code) {
          manualIds.push(mappingIt);
        }

        const dicts = mappingIt.source?.split('.');
        const sourcesLength = dicts?.length;
        // 把所有的分类id筛选出来
        if (!mappingIt.code && sourcesLength === 3) {
          // 检查项目的分类id
          if (
            mappingIt.source.startsWith('门诊.检查项目') ||
            mappingIt.source.startsWith('住院.检查项目')
          ) {
            checkDictIds.push({
              source: mappingIt.source,
              code: dicts[2]
            });
          }
          if (
            mappingIt.source.startsWith('门诊.药品') ||
            mappingIt.source.startsWith('住院.药品')
          ) {
            drugDictIds.push({
              source: mappingIt.source,
              code: dicts[2]
            });
          }
        }
        // 把所有的没有id的筛选出来
        if (!mappingIt.code && sourcesLength < 3) {
          mappings.push({
            id: mappingIt.source,
            name: mappingIt.source
          });
        }
      });

      // 检查项目列表
      let checks = [];
      // 药品
      let drugs = [];
      // 手工数据
      let manuals = [];
      // 检查项目分类
      let checkDict = [];
      // 药品分类
      let drugDict = [];
      if (checkIds.length > 0) {
        const checkModels = await originalDB.execute(
          `select id, name
               from his_check
               where status = true and id in (${checkIds.map(() => '?')})`,
          ...checkIds.map(it => it.code)
        );
        checks = checkIds.map(checkIt => {
          const index = checkModels.find(
            modelIt => modelIt.id === checkIt.code
          );
          return {
            id: checkIt.source,
            name: index?.name
          };
        });
      }
      // 药品
      if (drugsIds.length > 0) {
        const drugModels = await originalDB.execute(
          `select id, name
             from his_drug where id in (${drugsIds.map(() => '?')})`,
          ...drugsIds.map(it => it.code)
        );
        drugs = drugsIds.map(drugIt => {
          const index = drugModels.find(modelIt => modelIt.id === drugIt.code);
          return {
            id: drugIt.source,
            name: index?.name
          };
        });
      }
      // 手工数据
      if (manualIds.length > 0) {
        const manualModels = await appDB.execute(
          `select id, name
             from his_manual_data where id in (${manualIds.map(() => '?')})`,
          ...manualIds.map(it => it.code)
        );

        manuals = manualIds.map(manualIt => {
          const index = manualModels.find(
            modelIt => modelIt.id === manualIt.code
          );
          return {
            id: manualIt.source,
            name: index?.name
          };
        });
      }
      // 检查项目分类
      if (checkDictIds.length > 0) {
        const dictModels = await originalDB.execute(
          `select code, name
               from his_dict
               where category_code = '10201005'
                and code in (${checkDictIds.map(() => '?')})`,
          ...checkDictIds.map(it => it.code)
        );

        checkDict = checkDictIds.map(dictIt => {
          const index = dictModels.find(
            modelIt => modelIt.code === dictIt.code
          );
          return {
            id: dictIt.source,
            name: index?.name
          };
        });
      }
      // 药品分类
      if (drugDictIds.length > 0) {
        const dictModels = await originalDB.execute(
          `select code, name
               from his_dict
               where category_code = '10301001'
                and code in (${drugDictIds.map(() => '?')})`,
          ...drugDictIds.map(it => it.code)
        );

        drugDict = drugDictIds.map(dictIt => {
          const index = dictModels.find(
            modelIt => modelIt.code === dictIt.code
          );
          return {
            id: dictIt.source,
            name: index?.name
          };
        });
      }

      // 合并数组
      it['mappings'] = [
        ...checks,
        ...drugs,
        ...manuals,
        ...checkDict,
        ...drugDict,
        ...mappings
      ];
    }

    return workItemList;
  }

  // endregion

  // region 公分项目来源, 和员工绑定的增删改查
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

  /**
   * 工分项目来源
   * @param parent
   * @param item
   */
  @validate(
    should
      .string()
      .allow(null)
      .description('父级id'),
    should
      .string()
      .allow(null)
      .description('工分项目id')
  )
  async sources(parent, item) {
    const hospital = await getHospital();
    let sql, params;
    let list = [];
    if (!parent) {
      list = HisWorkItemSources.filter(it => !it.parent).map(it => {
        return {
          ...it
        };
      });
    }
    switch (parent) {
      case '门诊':
        list = HisWorkItemSources.filter(it => it.parent === '门诊').map(it => {
          return {
            ...it
          };
        });
        break;
      case '住院':
        list = HisWorkItemSources.filter(it => it.parent === '住院').map(it => {
          return {
            ...it
          };
        });
        break;
      case '公卫数据':
        list = HisWorkItemSources.filter(it => it.parent === '公卫数据').map(
          it => {
            return {
              ...it
            };
          }
        );
        break;
      case '手工数据':
        [sql, params] = sqlRender(
          `
            select id, name
              from his_manual_data
            where hospital = {{? hospital}}
            limit 50
          `,
          {
            hospital
          }
        );
        list = (await appDB.execute(sql, ...params))?.map(it => {
          return {
            id: `${parent}.${it.id}`,
            name: it.name,
            parent: '手工数据'
          };
        });
        break;
      case '门诊.检查项目':
      case '住院.检查项目':
        list = (
          await originalDB.execute(
            `select code, name from his_dict where category_code = '10201005'`
          )
        )?.map(it => {
          return {
            id: `${parent}.${it.code}`,
            name: it.name,
            parent: parent
          };
        });
        break;
      case '门诊.药品':
      case '住院.药品':
        list = (
          await originalDB.execute(
            `select code, name from his_dict where category_code = '10301001'`
          )
        )?.map(it => {
          return {
            id: `${parent}.${it.code}`,
            name: it.name,
            parent: parent
          };
        });
        break;
      default:
        // eslint-disable-next-line no-case-declarations
        let ids = [];
        if (parent) {
          ids = parent.split('.');
          if (ids.length !== 3) return [];
        }

        // 门诊,住院药品
        if (ids[1] === '药品') {
          [sql, params] = sqlRender(
            `
        select id, name
        from his_drug
        where category = {{? category}}
      `,
            {
              category: ids[2]
            }
          );
          list = (await originalDB.execute(sql, ...params))?.map(it => {
            return {
              id: `${parent}.${it.id}`,
              name: it.name,
              parent: parent
            };
          });
        }
        // 门诊,住院检查项目
        if (ids[1] === '检查项目') {
          [sql, params] = sqlRender(
            `
        select id, name
        from his_check
        where status = true
        and category = {{? category}}
      `,
            {
              category: ids[2]
            }
          );
          list = (await originalDB.execute(sql, ...params))?.map(it => {
            return {
              id: `${parent}.${it.id}`,
              name: it.name,
              parent: parent
            };
          });
        }
        break;
    }

    let mappingItems = [];
    // 如果传了工分项目id,说明是修改,需要把已有的来源默认选中
    if (item) {
      mappingItems = await appDB.execute(
        `select source from his_work_item_mapping where item = ?`,
        item
      );
    }

    return list.map(it => {
      const index = mappingItems.find(mapping => mapping.source === it.id);
      return {
        ...it,
        selected: !!index
      };
    });
  }

  // endregion
}
