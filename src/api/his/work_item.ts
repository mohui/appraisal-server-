import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {appDB, mappingDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {
  HisStaffDeptType,
  HisStaffMethod,
  HisWorkMethod,
  HisWorkSource
} from '../../../common/his';
import {sql as sqlRender} from '../../database/template';
import {getHospital, monthToRange} from './service';
import {workPointCalculation} from './score';

// region 工分项目来源
/**
 * 工分项目来源
 */
export const HisWorkItemSources: {
  id: string;
  name: string;
  parent?: string;
  scope: string;
  datasource?: {
    table: string;
    date: string;
    columns?: string[];
  };
}[] = [
  {
    id: '门诊',
    name: '门诊',
    parent: null,
    scope: HisStaffDeptType.Staff
  },
  {
    id: '门诊.检查项目',
    name: '检查项目',
    parent: '门诊',
    scope: HisStaffDeptType.Staff
  },
  //示例
  //{id: '住院-检查项目-{id}', name: 'B超', parent: '门诊-检查项目'},
  {
    id: '门诊.药品',
    name: '药品',
    parent: '门诊',
    scope: HisStaffDeptType.Staff
  },
  {id: '住院', name: '住院', parent: null, scope: HisStaffDeptType.Staff},
  {
    id: '住院.检查项目',
    name: '检查项目',
    parent: '住院',
    scope: HisStaffDeptType.Staff
  },
  {
    id: '住院.药品',
    name: '药品',
    parent: '住院',
    scope: HisStaffDeptType.Staff
  },
  {
    id: '手工数据',
    name: '手工数据',
    parent: null,
    scope: HisStaffDeptType.Staff
  },
  {
    id: '公卫数据',
    name: '公卫数据',
    parent: null,
    scope: HisStaffDeptType.HOSPITAL
  },
  {
    id: '公卫数据.老年人生活自理能力评估',
    name: '老年人生活自理能力评估',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_HealthCheckTableScore',
      date: 'OperateTime'
    }
  },
  {
    id: '公卫数据.生活方式',
    name: '生活方式',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'OperateTime',
      columns: ['dlpn is not null']
    }
  },
  {
    id: '公卫数据.脏器功能',
    name: '脏器功能',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'OperateTime',
      columns: ['kc is not null']
    }
  },
  {
    id: '公卫数据.查体-眼底',
    name: '查体-眼底',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['yd is not null']
    }
  },
  {
    id: '公卫数据.查体-足背动脉搏动',
    name: '查体-足背动脉搏动',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['tnbzbdmbd is not null']
    }
  },
  {
    id: '公卫数据.查体-肛门指诊',
    name: '查体-肛门指诊',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['gmzz is not null']
    }
  },
  {
    id: '公卫数据.查体-妇科',
    name: '查体-妇科',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['fk_wy is not null']
    }
  },
  {
    id: '公卫数据.查体-其他',
    name: '查体-其他',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['ctqt is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-血常规',
    name: '辅助检查-血常规',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xcgHb is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-尿常规',
    name: '辅助检查-尿常规',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['ncgndb is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-空腹血糖',
    name: '辅助检查-空腹血糖',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['kfxt is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-心电图',
    name: '辅助检查-心电图',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xdt is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-尿微量白蛋白',
    name: '辅助检查-尿微量白蛋白',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['nwlbdb is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-大便潜血',
    name: '辅助检查-大便潜血',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['dbqx is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-糖化血红蛋白',
    name: '辅助检查-糖化血红蛋白',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['tnbthxhdb is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-乙型肝炎表面抗原',
    name: '辅助检查-乙型肝炎表面抗原',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['HBsAg is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-肝功能',
    name: '辅助检查-肝功能',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['ggnALT is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-肾功能',
    name: '辅助检查-肾功能',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['sgnScr is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-血脂',
    name: '辅助检查-血脂',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xzCHO is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-胸部X光片',
    name: '辅助检查-胸部X光片',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xzCHO is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-B超',
    name: '辅助检查-B超',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xp is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-宫颈涂片',
    name: '辅助检查-宫颈涂片',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['xp is not null']
    }
  },
  {
    id: '公卫数据.辅助检查-其他',
    name: '辅助检查-其他',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_Healthy',
      date: 'checkupDate',
      columns: ['jkfzjcqt is not null']
    }
  },
  {
    id: '公卫数据.高血压随访',
    name: '高血压随访',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_HypertensionVisit',
      date: 'FollowUpDate'
    }
  },
  {
    id: '公卫数据.高血压随访-辅助检查',
    name: '高血压随访-辅助检查',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_HypertensionVisit',
      date: 'FollowUpDate',
      columns: ['Fzjc is not null']
    }
  },
  {
    id: '公卫数据.2型糖尿病随访',
    name: '2型糖尿病随访',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_DiabetesVisit',
      date: 'FollowUpDate'
    }
  },
  {
    id: '公卫数据.2型糖尿病随访-糖化血红蛋白',
    name: '2型糖尿病随访-糖化血红蛋白',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_DiabetesVisit',
      date: 'FollowUpDate',
      columns: ['Hemoglobin is not null']
    }
  },
  {
    id: '公卫数据.2型糖尿病随访-空腹血糖',
    name: '2型糖尿病随访-空腹血糖',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_DiabetesVisit',
      date: 'FollowUpDate',
      columns: ['FastingGlucose is not null']
    }
  },
  {
    id: '公卫数据.老年人中医药服务',
    name: '老年人中医药服务',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_QuestionnaireMain',
      date: 'OperateTime'
    }
  },
  {
    id: '公卫数据.卫生计生监督协管信息报告登记',
    name: '卫生计生监督协管信息报告登记',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_SanitaryControlReport',
      date: 'ReportTime'
    }
  },
  {
    id: '公卫数据.卫生计生监督协管巡查登记',
    name: '卫生计生监督协管巡查登记',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'view_SanitaryControlAssist',
      date: 'checkDate'
    }
  },
  {
    id: '公卫数据.新生儿家庭访视表',
    name: '新生儿家庭访视表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'V_NewbornVisit_KN',
      date: 'VisitDate'
    }
  },
  {
    id: '公卫数据.12-30月龄儿童健康检查记录表',
    name: '12-30月龄儿童健康检查记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'V_ChildCheck_KN',
      date: 'CheckDate',
      columns: ['chronologicalage >= 12', 'chronologicalage < 31']
    }
  },
  {
    id: '公卫数据.3-6岁儿童健康检查记录表',
    name: '3-6岁儿童健康检查记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'V_ChildCheck_KN',
      date: 'CheckDate',
      columns: ['chronologicalage >= 36', 'chronologicalage < 73']
    }
  },
  {
    id: '公卫数据.第1次产前检查服务记录表',
    name: '第1次产前检查服务记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'V_NewlyDiagnosed_KN',
      date: 'NewlyDiagnosedDate'
    }
  },
  {
    id: '公卫数据.第2~5次产前随访服务记录表',
    name: '第2~5次产前随访服务记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'V_PrenatalCare_KN',
      date: 'CheckDate'
    }
  },
  {
    id: '公卫数据.产后访视记录表',
    name: '产后访视记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'V_MaternalVisits_KN',
      date: 'VisitDate'
    }
  },
  {
    id: '公卫数据.产后42天健康检查记录表',
    name: '产后42天健康检查记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'V_Examine42thDay_KN',
      date: 'VisitDate'
    }
  },
  {id: '其他', name: '其他', parent: null, scope: HisStaffDeptType.HOSPITAL},
  {
    id: '其他.门诊诊疗人次',
    name: '门诊诊疗人次',
    parent: '其他',
    scope: HisStaffDeptType.HOSPITAL
  },
  {
    id: '其他.住院诊疗人次',
    name: '住院诊疗人次',
    parent: '其他',
    scope: HisStaffDeptType.HOSPITAL
  }
];
// endregion

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
   * @param staffMethod 指定方式; 动态/固定 固定: , 动态:员工,科室
   * @param staffs [绑定的员工] 动态的时候才有值, 员工id,科室id
   * @param score 分值
   * @param scope 关联员工为动态的时候, 有三种情况 本人/本人所在科室/本人所在机构
   * @param remark 备注
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
      .required()
      .only(HisStaffMethod.STATIC, HisStaffMethod.DYNAMIC)
      .description('关联员工的关联方式; 固定/动态'),
    should
      .array()
      .items({
        code: should.string().description('科室id/员工id'),
        type: should.string().description('类型: 科室/员工')
      })
      .description('绑定的员工或者科室'),
    should
      .number()
      .required()
      .description('分值'),
    should
      .string()
      .only(
        HisStaffDeptType.Staff,
        HisStaffDeptType.DEPT,
        HisStaffDeptType.HOSPITAL
      )
      .required()
      .allow(null)
      .description('固定的时候的范围, 员工/科室/机构'),
    should
      .string()
      .allow(null)
      .description('备注')
  )
  async add(name, method, mappings, staffMethod, staffs, score, scope, remark) {
    if (
      mappings.find(
        it => it === '手工数据' || it === '公卫数据' || it === '其他'
      )
    )
      throw new KatoRuntimeError(`不能选择手工数据,公卫数据,其他节点`);
    if (
      staffMethod === HisStaffMethod.STATIC &&
      (!staffs || staffs?.length === 0)
    )
      throw new KatoRuntimeError(`${HisStaffMethod.STATIC}必须选员工`);

    if (staffMethod === HisStaffMethod.DYNAMIC && !scope)
      throw new KatoRuntimeError(`${HisStaffMethod.DYNAMIC}时候scope必传`);
    // 如果选了公卫数据,和其他, scope必须是机构
    mappings.forEach(it => {
      if (
        (it.startsWith('公卫数据.') || it.startsWith('其他.')) &&
        scope !== HisStaffDeptType.HOSPITAL
      )
        throw new KatoRuntimeError(
          `公卫数据和其他范围选择必须是${HisStaffDeptType.HOSPITAL}`
        );
    });

    const mappingSorts = mappings.sort((a, b) => a.length - b.length);
    const newMappings = [];
    for (const sourceIt of mappingSorts) {
      // 是否以新数组元素开头, 并且长度大于等于新数组元素长度
      const index = newMappings.find(
        newIt => sourceIt.startsWith(newIt) && newIt.length <= sourceIt.length
      );
      // 如果没有, push进去
      if (!index) {
        newMappings.push(sourceIt);
      }
    }
    const hospital = await getHospital();

    return appDB.transaction(async () => {
      const hisWorkItemId = uuid();
      // 添加工分项目
      await appDB.execute(
        ` insert into
              his_work_item(id, hospital, name, method, type, score, remark, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        hisWorkItemId,
        hospital,
        name,
        method,
        staffMethod,
        score,
        remark,
        dayjs().toDate(),
        dayjs().toDate()
      );
      // 如果是固定时候,需要把绑定员工放到数据中
      if (staffMethod === HisStaffMethod.STATIC) {
        for (const it of staffs) {
          await appDB.execute(
            `insert into
              his_work_item_staff_mapping(id, item, source, type, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?)`,
            uuid(),
            hisWorkItemId,
            it.code,
            it.type,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      } else {
        // 如果关联员工为动态, type为员工,科室,机构, source 字段为空
        await appDB.execute(
          `insert into
              his_work_item_staff_mapping(id, item, type, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
          uuid(),
          hisWorkItemId,
          scope,
          dayjs().toDate(),
          dayjs().toDate()
        );
      }

      // 添加工分项目与his收费项目关联表
      for (const sourceId of newMappings) {
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
   * @param staffMethod 指定方式; 动态/固定
   * @param staffs [绑定的员工]
   * @param mappings
   * @param score 分值
   * @param scope 固定的时候范围必传
   * @param remark 备注
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
      .description('来源id[]'),
    should
      .string()
      .required()
      .only(HisStaffMethod.STATIC, HisStaffMethod.DYNAMIC)
      .description('关联员工的关联方式; 固定/动态'),
    should
      .array()
      .items({
        code: should.string().description('科室id/员工id'),
        type: should.string().description('类型: 科室/员工')
      })
      .description('绑定的员工或者科室'),
    should
      .number()
      .required()
      .description('分值'),
    should
      .string()
      .only(
        HisStaffDeptType.Staff,
        HisStaffDeptType.DEPT,
        HisStaffDeptType.HOSPITAL
      )
      .required()
      .allow(null)
      .description('固定的时候的范围, 员工/科室/机构'),
    should
      .string()
      .allow(null)
      .description('备注')
  )
  async update(
    id,
    name,
    method,
    mappings,
    staffMethod,
    staffs,
    score,
    scope,
    remark
  ) {
    if (
      mappings.find(
        it => it === '手工数据' || it === '公卫数据' || it === '其他'
      )
    )
      throw new KatoRuntimeError(`不能选择手工数据,公卫数据,其他节点`);

    if (
      staffMethod === HisStaffMethod.STATIC &&
      (!staffs || staffs?.length === 0)
    )
      throw new KatoRuntimeError(`${HisStaffMethod.STATIC}必须选员工`);
    if (staffMethod === HisStaffMethod.DYNAMIC && !scope)
      throw new KatoRuntimeError(`${HisStaffMethod.DYNAMIC}时候scope必传`);
    // 如果选了公卫数据,和其他, scope必须是机构
    mappings.forEach(it => {
      if (
        (it.startsWith('公卫数据.') || it.startsWith('其他.')) &&
        scope !== HisStaffDeptType.HOSPITAL
      )
        throw new KatoRuntimeError(
          `公卫数据和其他范围选择必须是${HisStaffDeptType.HOSPITAL}`
        );
    });

    // 修改之前查询公分项是否存在
    const find = await appDB.execute(
      ` select * from his_work_item where id = ?`,
      id
    );
    if (find.length === 0) throw new KatoRuntimeError(`工分项目不存在`);

    // 按照长度排序, 父级的id比子集的id短,所以父级会排在前面
    const mappingSorts = mappings.sort((a, b) => a.length - b.length);

    // 定义一个新数组
    const newMappings = [];
    // 排查当父类和子类都在数组中的时候, 过滤掉子类
    for (const sourceIt of mappingSorts) {
      // 是否以(新数组中的元素 + . )开头, 说明其父级已经在新数组中
      const index = newMappings.find(newIt => sourceIt.startsWith(`${newIt}.`));
      // 如果没有, push进去
      if (!index) {
        newMappings.push(sourceIt);
      }
    }

    return appDB.transaction(async () => {
      // 添加工分项目
      await appDB.execute(
        ` update his_work_item
              set name = ?,
                method = ?,
                type = ?,
                score = ?,
                remark = ?,
                updated_at = ?
              where id = ?`,
        name,
        method,
        staffMethod,
        score,
        remark,
        dayjs().toDate(),
        id
      );
      // 先删除
      await appDB.execute(
        `delete from his_work_item_mapping where item = ?`,
        id
      );
      // 添加工分项目与his收费项目关联表
      for (const sourceId of newMappings) {
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

      // 先删除
      await appDB.execute(
        `delete from his_work_item_staff_mapping where item = ?`,
        id
      );
      // 如果是固定时候,需要把绑定员工放到数据中
      if (staffMethod === HisStaffMethod.STATIC) {
        for (const it of staffs) {
          await appDB.execute(
            `insert into
              his_work_item_staff_mapping(id, item, source, type, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?)`,
            uuid(),
            id,
            it.code,
            it.type,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      } else {
        // 当是动态的时候, type 为 员工(本人), 科室(本人所在科室), 机构(本人所在机构)
        await appDB.execute(
          `insert into
              his_work_item_staff_mapping(id, item, type, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
          uuid(),
          id,
          scope,
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

      // 删除工分项和员工的绑定
      await appDB.execute(
        `delete from his_work_item_staff_mapping where item = ?`,
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
    // language=PostgreSQL
    const workItemModels = await appDB.execute(
      `
        select item.id,
               item.name,
               item.method,
               item.type,
               item.score,
               item.remark,
               mapping.source,
               mapping.type "sourceType"
        from his_work_item item
               left join his_work_item_staff_mapping mapping on item.id = mapping.item
        where hospital = ?
        order by item.created_at
      `,
      hospital
    );
    if (workItemModels.length === 0) return [];
    // 查询科室
    // language=PostgreSQL
    const deptModels = await appDB.execute(
      `
        select id, name
        from his_department
        where hospital = ?
      `,
      hospital
    );
    // 查询员工
    // language=PostgreSQL
    const staffModels = await appDB.execute(
      `
        select id, name, department
        from staff
        where hospital = ?
      `,
      hospital
    );
    const deptStaffs = deptModels.concat(staffModels);

    // 汇总同一机构下的员工
    const deptStaffList = [];
    staffModels.forEach(it => {
      // 只汇总有科室的员工
      if (it.department) {
        // 查找科室是否在数组中
        const index = deptStaffList.find(deptId => deptId.id === it.department);
        if (index) {
          index.children.push(it.id);
        } else {
          // 如果没查找到,放到数组中
          deptStaffList.push({
            id: it.department,
            children: [it.id]
          });
        }
      }
    });
    // 以员工/科室 id为key, name为value
    const deptStaffObj = {};
    deptStaffs.forEach(it => {
      deptStaffObj[it.id] = it.name;
    });
    const workItemList = [];
    workItemModels.forEach(it => {
      // 查找是否已经在数组中
      const index = workItemList.find(item => item.id === it.id);
      // 定义员工数组
      let staffs = [];
      if (it.sourceType === `${HisStaffDeptType.DEPT}`) {
        const index = deptStaffList.find(deptIt => deptIt.id === it.source);
        if (index) staffs = index.children;
      } else {
        staffs = it.source ? [it.source] : [];
      }
      //如果再数组中,把关联员工或科室放到子集中
      if (index) {
        if (it.source) {
          index.staffMappings.push(deptStaffObj[it.source]);
          index.staffIdMappings.push(...staffs);
        }
      } else {
        workItemList.push({
          id: it.id,
          name: it.name,
          method: it.method,
          type: it.type,
          score: it.score,
          remark: it.remark,
          scope: it.type === HisStaffMethod.DYNAMIC ? it.sourceType : null,
          staffMappings: it.source ? [deptStaffObj[it.source]] : [],
          staffIdMappings: staffs
        });
      }
    });

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
          `select id as code, name
               from his_dict
               where category_code = '10201005'
                and id in (${checkDictIds.map(() => '?')})`,
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
          `select id as code, name
               from his_dict
               where category_code = '10301001'
                and id in (${drugDictIds.map(() => '?')})`,
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

  // 预览接口
  async preview(
    name,
    method,
    mappings,
    staffMethod,
    staffs,
    score,
    scope,
    staff,
    day
  ) {
    // 时间转化为月份的开始时间和结束时间
    const {start, end} = monthToRange(day);
    const workItems = await workPointCalculation(
      staff,
      start,
      end,
      name,
      method,
      mappings,
      staffMethod,
      staffs,
      score,
      scope
    );
    return workItems
      .sort((a, b) => (a.date.getTime() < b.date.getTime() ? 1 : -1))
      .slice(0, 10000);
  }

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
   * @param params (要修改的主键, 要添加的员工, 要删除的主键, 分数, 备注)
   */
  @validate(
    should
      .object({
        id: should
          .string()
          .required()
          .allow(null)
          .description('主键id'),
        item: should
          .string()
          .required()
          .description('公分项id'),
        staff: should
          .string()
          .required()
          .description('员工id'),
        rate: should
          .number()
          .required()
          .description('权重系数'),
        remark: should
          .string()
          .allow(null)
          .description('备注')
      })
      .required()
      .description('要增删改的公分项和员工的绑定')
  )
  async upsertStaffWorkItemMapping(params) {
    return appDB.transaction(async () => {
      // 排查公分项是否存在
      const itemList = await appDB.execute(
        `select * from his_work_item where id = ?`,
        params?.item
      );
      if (itemList.length === 0) throw new KatoRuntimeError(`工分项目不存在`);

      //  如果有需要添加的数据,执行添加
      if (params?.id) {
        // 先根据id查询到该工分项下的员工是否在其他分数中存在
        const updList = await appDB.execute(
          `select id, staff, item, rate, remark
                from his_staff_work_item_mapping
                where id = ?`,
          params?.id
        );
        if (updList.length === 0)
          throw new KatoRuntimeError(`${params?.id}不存在`);

        // language=PostgreSQL
        await appDB.execute(
          `update his_staff_work_item_mapping
             set rate       = ?,
                 remark     = ?,
                 updated_at = ?
             where id = ?
          `,
          params?.rate,
          params?.remark,
          dayjs().toDate(),
          params?.id
        );
      } else {
        // 排查员工是否存在
        const checkStaff = await appDB.execute(
          `select id, account, name from staff where id = ?`,
          params?.staff
        );

        if (checkStaff.length === 0) throw new KatoRuntimeError(`考核员工异常`);

        // 排查公分项是否存在
        const staffItemList = await appDB.execute(
          `select id, staff, item from his_staff_work_item_mapping where item = ?`,
          params?.item
        );

        // 校验员工是否已经绑定过公分项
        const index = staffItemList.find(
          mapping => mapping.staff === params?.staff
        );
        if (index)
          throw new KatoCommonError(
            `员工${checkStaff[0]?.name}已绑定过该工分项`
          );

        // 执行添加语句
        // language=PostgreSQL
        await appDB.execute(
          `
            insert into his_staff_work_item_mapping(id, item, staff, rate, remark, created_at, updated_at)
            values (?, ?, ?, ?, ?, ?, ?)`,
          uuid(),
          params?.item,
          params?.staff,
          params?.rate,
          params?.remark,
          dayjs().toDate(),
          dayjs().toDate()
        );
      }
    });
  }

  /**
   * 公分项和员工列表
   */
  async selStaffWorkItemMapping() {
    const hospital = await getHospital();
    // 查询员工列表
    // language=PostgreSQL
    const staffModes = await appDB.execute(
      `
        select id, name, account
        from staff
        where hospital = ?
      `,
      hospital
    );

    // 查询公分项
    // language=PostgreSQL
    const workItemModes = await appDB.execute(
      `
        select id, name, method, score
        from his_work_item
        where hospital = ?
      `,
      hospital
    );

    // 查询公分项和员工的绑定
    // language=PostgreSQL
    const mappingModels = await appDB.execute(
      `
        select mapping.id
             , mapping.staff
             , mapping.item
             , mapping.rate
             , mapping.remark
        from his_staff_work_item_mapping mapping
               left join staff on mapping.staff = staff.id
        where staff.hospital = ?
      `,
      hospital
    );

    return {
      staffs: staffModes,
      workItems: workItemModes,
      mappings: mappingModels
    };
  }

  @validate(
    should
      .string()
      .required()
      .description('工分项目和员工关联表主键')
  )
  async delStaffWorkItemMapping(id) {
    return appDB.transaction(async () => {
      // 删除对应关系
      // language=PostgreSQL
      await appDB.execute(
        `
          delete
          from his_staff_work_item_mapping
          where id = ?
        `,
        id
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
   */
  async sources() {
    const hospital = await getHospital();
    //查询etl_id, 用于查询全部的检查项目和药品分类数据
    const etlId = (
      await mappingDB.execute(
        `select * from area_hospital_mapping where area = ? and etl_id like '%HIS%'`,
        hospital
      )
    )[0]?.etl_id;
    if (!etlId) return [];
    //region his项目相关
    //region 已收费项目
    //查询已收费的id数组
    const chargeIdModels: {item: string}[] = await originalDB.execute(
      // language=PostgreSQL
      `
        select distinct item
        from his_charge_detail detail
               left join his_charge_master hcm on detail.main = hcm.id
        where hcm.hospital = ?
          and item not like '%..%'
      `,
      hospital
    );
    // 已收费his项目数组
    const chargeModels: {id; name; parent}[] = (
      await Promise.all(
        chargeIdModels.map(async it => {
          //切分id字符串, item格式: (住院|门诊).(检查项目|药品).(分类id).(检查项目id|药品id)
          const ids = it.item.split('.');
          //检查项目|药品
          const type = ids[1];
          //检查项目id|药品id
          const id = ids[3];
          let models: {name}[] = [];
          if (type === '检查项目') {
            models = await originalDB.execute(
              `select name from his_check where id = ?`,
              id
            );
          } else if (type === '药品') {
            models = await originalDB.execute(
              `select name from his_drug where id = ?`,
              id
            );
          }
          return models.map<{id; name; parent}>(m => ({
            ...m,
            id: it.item,
            parent: ids.slice(0, 3).join('.')
          }))[0];
        })
      )
    ).filter(it => !!it);
    //endregion
    //检查项目分类
    const checkCategoryModels: {id; name}[] = await originalDB.execute(
      `select id, name from his_dict where category_code = '10201005' and etl_id = ?`,
      etlId
    );
    //药品分类
    const drugCategoryModels: {id; name}[] = await originalDB.execute(
      `select id, name from his_dict where category_code = '10301001' and etl_id = ?`,
      etlId
    );
    //endregion
    //返回值数组
    const list = HisWorkItemSources.filter(it => !it.parent);
    for (const treeIt1 of list) {
      if (treeIt1.id === '门诊') {
        treeIt1['children'] = HisWorkItemSources.filter(
          it => it.parent === '门诊'
        );
        // 第三层
        for (const deptIt of treeIt1['children']) {
          if (deptIt.id === '门诊.检查项目') {
            deptIt['children'] = checkCategoryModels.map(c => {
              const id = `门诊.检查项目.${c.id}`;
              return {
                ...c,
                id,
                scope: deptIt.scope,
                children: chargeModels
                  .filter(d => d.parent === id)
                  .map(d => ({...d, scope: deptIt.scope}))
              };
            });
          }
          if (deptIt.id === '门诊.药品') {
            deptIt['children'] = drugCategoryModels.map(c => {
              const id = `门诊.药品.${c.id}`;
              return {
                ...c,
                id,
                scope: deptIt.scope,
                children: chargeModels
                  .filter(d => d.parent === id)
                  .map(d => ({...d, scope: deptIt.scope}))
              };
            });
          }
        }
      }
      if (treeIt1.id === '住院') {
        treeIt1['children'] = HisWorkItemSources.filter(
          it => it.parent === '住院'
        );
        // 第三层
        for (const deptIt of treeIt1['children']) {
          if (deptIt.id === '住院.检查项目') {
            deptIt['children'] = checkCategoryModels.map(c => {
              const id = `住院.检查项目.${c.id}`;
              return {
                ...c,
                id,
                scope: deptIt.scope,
                children: chargeModels
                  .filter(d => d.parent === id)
                  .map(d => ({...d, scope: deptIt.scope}))
              };
            });
          }
          if (deptIt.id === '住院.药品') {
            deptIt['children'] = drugCategoryModels.map(c => {
              const id = `住院.药品.${c.id}`;
              return {
                ...c,
                id,
                scope: deptIt.scope,
                children: chargeModels
                  .filter(d => d.parent === id)
                  .map(d => ({...d, scope: deptIt.scope}))
              };
            });
          }
        }
      }
      if (treeIt1.id === '公卫数据') {
        treeIt1['children'] = HisWorkItemSources.filter(
          it => it.parent === '公卫数据'
        );
      }
      if (treeIt1.id === '其他') {
        treeIt1['children'] = HisWorkItemSources.filter(
          it => it.parent === '其他'
        );
      }
      if (treeIt1.id === '手工数据') {
        const [sql, params] = sqlRender(
          `
            select id, name
            from his_manual_data
            where hospital = {{? hospital}}
          `,
          {
            hospital
          }
        );
        treeIt1['children'] = (await appDB.execute(sql, ...params))?.map(
          it => ({
            id: `${treeIt1.id}.${it.id}`,
            name: it.name,
            parent: '手工数据',
            scope: HisStaffDeptType.Staff
          })
        );
      }
    }
    return list;
  }

  // endregion
}
