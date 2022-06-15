import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {appDB, lakeDB, mappingDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {
  HisStaffDeptType,
  HisStaffMethod,
  HisWorkMethod,
  HisWorkSource,
  validMultistepRules
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
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_old_health_check main',
      date: 'OperateTime'
    }
  },
  {
    id: '公卫数据.生活方式',
    name: '生活方式',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
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
      table: 'ph_healthy main',
      date: 'checkupDate',
      columns: ['jkfzjcqt is not null']
    }
  },
  {
    id: '公卫数据.高血压随访',
    name: '高血压随访',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_hypertension_visit main',
      date: 'FollowUpDate'
    }
  },
  {
    id: '公卫数据.高血压随访-辅助检查',
    name: '高血压随访-辅助检查',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_hypertension_visit main',
      date: 'FollowUpDate',
      columns: ['Fzjc is not null']
    }
  },
  {
    id: '公卫数据.2型糖尿病随访',
    name: '2型糖尿病随访',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_diabetes_visit main',
      date: 'FollowUpDate'
    }
  },
  {
    id: '公卫数据.2型糖尿病随访-糖化血红蛋白',
    name: '2型糖尿病随访-糖化血红蛋白',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_diabetes_visit main',
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
      table: 'ph_diabetes_visit main',
      date: 'FollowUpDate',
      columns: ['FastingGlucose is not null']
    }
  },
  {
    id: '公卫数据.老年人中医药服务',
    name: '老年人中医药服务',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_old_questionnaire_main main',
      date: 'OperateTime'
    }
  },
  {
    id: '公卫数据.卫生计生监督协管信息报告登记',
    name: '卫生计生监督协管信息报告登记',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_sanitary_control_report main',
      date: 'ReportTime'
    }
  },
  {
    id: '公卫数据.卫生计生监督协管巡查登记',
    name: '卫生计生监督协管巡查登记',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_sanitary_control_assist main',
      date: 'checkDate'
    }
  },
  {
    id: '公卫数据.新生儿家庭访视表',
    name: '新生儿家庭访视表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'mch_new_born_visit main',
      date: 'VisitDate'
    }
  },
  {
    id: '公卫数据.12-30月龄儿童健康检查记录表',
    name: '12-30月龄儿童健康检查记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'mch_child_check main',
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
      table: 'mch_child_check main',
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
      table: 'mch_newly_diagnosed main',
      date: 'NewlyDiagnosedDate'
    }
  },
  {
    id: '公卫数据.第2~5次产前随访服务记录表',
    name: '第2~5次产前随访服务记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'mch_prenatal_care main',
      date: 'CheckDate'
    }
  },
  {
    id: '公卫数据.产后访视记录表',
    name: '产后访视记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'mch_maternal_visit main',
      date: 'VisitDate'
    }
  },
  {
    id: '公卫数据.产后42天健康检查记录表',
    name: '产后42天健康检查记录表',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'mch_examine_42th_day main',
      date: 'VisitDate'
    }
  },
  // 9-24新增issues258指标 开始
  {
    id: '公卫数据.居民健康档案-建档人数',
    name: '居民健康档案-建档人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_person main',
      date: 'operatetime',
      columns: ['writeoff = false']
    }
  },
  {
    id: '公卫数据.居民健康档案-人脸采集数',
    name: '居民健康档案-人脸采集数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_person_face main',
      date: 'operatetime'
    }
  },
  {
    id: '公卫数据.高危人群管理-慢病高危管理卡人数',
    name: '高危人群管理-慢病高危管理卡人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_chronic_disease_high_card main',
      date: 'operatetime',
      columns: ['isdelete = false']
    }
  },
  {
    id: '公卫数据.高危人群管理-慢病高危随访人次',
    name: '高危人群管理-慢病高危随访人次',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_chronic_disease_high_visit main',
      date: 'FollowUpDate',
      columns: ['isdelete = false']
    }
  },
  {
    id: '公卫数据.高血压患者管理-高血压新建档案人数',
    name: '高血压患者管理-高血压新建档案人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_hypertension main',
      date: 'datecards',
      columns: ['isdelete = false']
    }
  },
  {
    id: '公卫数据.糖尿病患者管理-糖尿病新建档案人数',
    name: '糖尿病患者管理-糖尿病新建档案人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_diabetes main',
      date: 'operatetime',
      columns: ['isdelete = false']
    }
  },
  {
    id: '公卫数据.健康教育-宣传栏更新次数',
    name: '健康教育-宣传栏更新次数',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_health_education main',
      date: 'activitytime',
      columns: [`activityformcode = '3'`, 'state = 1']
    }
  },
  {
    id: '公卫数据.健康教育-公众咨询活动次数',
    name: '健康教育-公众咨询活动次数',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_health_education main',
      date: 'activitytime',
      columns: [`activityformcode = '5'`, 'state = 1']
    }
  },
  {
    id: '公卫数据.健康教育-健康知识讲座次数',
    name: '健康教育-健康知识讲座次数',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_health_education main',
      date: 'activitytime',
      columns: [`activityformcode = '4'`, 'state = 1']
    }
  },
  {
    id: '公卫数据.健康教育-个性化健康教育人次',
    name: '健康教育-个性化健康教育人次',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_health_education main',
      date: 'activitytime',
      columns: [`activityformcode = '6'`, 'state = 1']
    }
  },
  {
    id: '公卫数据.健康教育-慢病自我管理小组活动次数',
    name: '健康教育-慢病自我管理小组活动次数',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_health_education main',
      date: 'ActivityTime',
      columns: [`ActivityFormCode = '8'`, 'state = 1']
    }
  },
  {
    id: '公卫数据.健康教育-全面健康生活方式行动次数',
    name: '健康教育-全面健康生活方式行动次数',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'ph_health_education main',
      date: 'ActivityTime',
      columns: [`ActivityFormCode = '9'`, 'state = 1']
    }
  },
  {
    id: '公卫数据.家庭医生签约-签约基础包人数',
    name: '家庭医生签约-签约基础包人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: `
        ph_sign_register main
        INNER JOIN ph_sign_register_service rp ON main.id = rp.register
        INNER JOIN ph_sign_service sp ON sp.id = rp.service --区分服务包类型
      `,
      date: 'main.SignDate',
      columns: [`sp.ncmsservicepackageid = '1'`, `sp.conceitedmoney = 0`]
    }
  },
  {
    id: '公卫数据.家庭医生签约-签约初级包人数',
    name: '家庭医生签约-签约初级包人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: `
        ph_sign_register main
        INNER JOIN ph_sign_register_service rp ON main.id = rp.register
        INNER JOIN ph_sign_service sp ON sp.id = rp.service
      `,
      date: 'main.SignDate',
      columns: [`sp.ncmsservicepackageid = '2'`]
    }
  },
  {
    id: '公卫数据.家庭医生签约-签约中级包人数',
    name: '家庭医生签约-签约中级包人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: `
        ph_sign_register main
        INNER JOIN ph_sign_register_service rp ON main.id = rp.register
        INNER JOIN ph_sign_service sp ON sp.id = rp.service
      `,
      date: 'main.SignDate',
      columns: [`sp.ncmsservicepackageid = '3'`]
    }
  },
  {
    id: '公卫数据.家庭医生签约-签约高级包人数',
    name: '家庭医生签约-签约高级包人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: `
        ph_sign_register main
        INNER JOIN ph_sign_register_service rp ON main.id = rp.register
        INNER JOIN ph_sign_service sp ON sp.id = rp.service
      `,
      date: 'main.SignDate',
      columns: [`sp.ncmsservicepackageid = '4'`]
    }
  },
  {
    id: '公卫数据.家庭医生签约-签约复合包人数',
    name: '家庭医生签约-签约复合包人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: `
        ph_sign_register main
        INNER JOIN ph_sign_register_service rp ON main.id = rp.register
        INNER JOIN ph_sign_service sp ON sp.id = rp.service
      `,
      date: 'main.SignDate',
      columns: [`sp.ncmsservicepackageid = '5'`]
    }
  },
  {
    id: '公卫数据.家庭医生签约-履约人数',
    name: '家庭医生签约-履约人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: 'ph_sign_check_main main',
      date: 'ExeTime',
      columns: []
    }
  },
  {
    id: '公卫数据.老年人管理-老年人体检人数',
    name: '老年人管理-老年人体检人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.Staff,
    datasource: {
      table: `
        ph_healthy main
        inner join ph_person person on main.personnum = person.id
      `,
      date: 'main.OperateTime',
      columns: [`person.ContractStaff & 2 = 2`]
    }
  },
  // 9-26新增issues258指标
  {
    id: '公卫数据.孕产妇管理服务-早孕建册人数',
    name: '孕产妇管理服务-早孕建册人数',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'mch_pregnancy_books main',
      date: 'VisitsDate'
    }
  },
  {
    id: '公卫数据.儿童保健服务-0-12月儿童建卡保健管理人次',
    name: '儿童保健服务-0-12月儿童建卡保健管理人次',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'mch_child_check main',
      date: 'CheckDate',
      columns: ['chronologicalage >= 0', 'chronologicalage < 13']
    }
  },
  {
    id: '公卫数据.儿童保健服务-18-36个月儿童健康保健管理人次',
    name: '儿童保健服务-18-36个月儿童健康保健管理人次',
    parent: '公卫数据',
    scope: HisStaffDeptType.HOSPITAL,
    datasource: {
      table: 'mch_child_check main',
      date: 'CheckDate',
      columns: ['chronologicalage >= 18', 'chronologicalage < 37']
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
   * @param mappings 来源[{id:工分项id,scope:取值范围}]
   * @param staffMethod 指定方式; 动态/固定 固定: , 动态:员工,科室
   * @param staffs [{id:科室id/员工id,type:类型: 科室/员工}]绑定的员工或者科室,动态的时候才有值
   * @param steps 分值
   * @param scope 关联员工为动态的时候, 有三种情况 本人/本人所在科室/本人所在机构
   * @param remark 备注
   * @param itemType 公分项分类
   */
  @validate(
    should.string().required(),
    should.string().only(HisWorkMethod.AMOUNT, HisWorkMethod.SUM),
    should
      .array()
      .required()
      .min(1),
    should
      .string()
      .required()
      .only(HisStaffMethod.STATIC, HisStaffMethod.DYNAMIC),
    should.array().items({
      code: should.string(),
      type: should.string()
    }),
    should
      .array()
      .items({
        start: should.number().allow(null),
        end: should.number().allow(null),
        unit: should.number().required()
      })
      .min(1)
      .required(),
    should
      .string()
      .only(
        HisStaffDeptType.Staff,
        HisStaffDeptType.DEPT,
        HisStaffDeptType.HOSPITAL
      )
      .required()
      .allow(null),
    should.string().allow(null),
    should.string().allow(null)
  )
  async add(
    name,
    method,
    mappings,
    staffMethod,
    staffs,
    steps,
    scope,
    remark,
    itemType
  ) {
    if (
      mappings.find(
        it => it.id === '手工数据' || it.id === '公卫数据' || it.id === '其他'
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
      if (it.scope === '机构' && scope !== HisStaffDeptType.HOSPITAL)
        throw new KatoRuntimeError(
          `公卫数据和其他范围选择必须是${HisStaffDeptType.HOSPITAL}`
        );
    });

    if (!validMultistepRules(steps)) {
      throw new KatoRuntimeError(`梯度传值有误`);
    }

    const mappingSorts = mappings
      .map(it => it.id)
      .sort((a, b) => a.length - b.length);
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

    // 如果公分项类型传了, 查询类型是否合法
    if (itemType) {
      // language=PostgreSQL
      const workItemTypeModels = await appDB.execute(
        `
          select *
          from his_work_item_type
          where id = ?
            and hospital = ?
        `,
        itemType,
        hospital
      );
      if (workItemTypeModels.length === 0)
        throw new KatoRuntimeError(`该分类不存在`);
    }

    return appDB.transaction(async () => {
      const hisWorkItemId = uuid();
      // 添加工分项目
      await appDB.execute(
        // language=PostgreSQL
        `
          insert into his_work_item(id,
                                    hospital,
                                    name,
                                    method,
                                    type,
                                    remark,
                                    item_type,
                                    steps)
          values (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        hisWorkItemId,
        hospital,
        name,
        method,
        staffMethod,
        remark,
        itemType,
        JSON.stringify(steps)
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
   * @param mappings 来源[{id:工分项id,scope:取值范围}]
   * @param staffMethod 指定方式; 动态/固定
   * @param staffs [{id:科室id/员工id,type:类型: 科室/员工}] 绑定的员工或者科室
   * @param steps 梯度分值
   * @param scope 固定的时候的范围, 员工/科室/机构
   * @param remark 备注
   * @param itemType 公分项分类
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.string().only(HisWorkMethod.AMOUNT, HisWorkMethod.SUM),
    should
      .array()
      .required()
      .min(1),
    should
      .string()
      .required()
      .only(HisStaffMethod.STATIC, HisStaffMethod.DYNAMIC),
    should.array().items({
      code: should.string(),
      type: should.string()
    }),
    should
      .array()
      .items({
        start: should.number().allow(null),
        end: should.number().allow(null),
        unit: should.number().required()
      })
      .min(1)
      .required(),
    should
      .string()
      .only(
        HisStaffDeptType.Staff,
        HisStaffDeptType.DEPT,
        HisStaffDeptType.HOSPITAL
      )
      .required()
      .allow(null),
    should.string().allow(null),
    should.string().allow(null)
  )
  async update(
    id,
    name,
    method,
    mappings,
    staffMethod,
    staffs,
    steps,
    scope,
    remark,
    itemType
  ) {
    if (
      mappings.find(
        it => it.id === '手工数据' || it.id === '公卫数据' || it.id === '其他'
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
      if (it.scope === '机构' && scope !== HisStaffDeptType.HOSPITAL)
        throw new KatoRuntimeError(
          `公卫数据和其他范围选择必须是${HisStaffDeptType.HOSPITAL}`
        );
    });

    if (!validMultistepRules(steps)) {
      throw new KatoRuntimeError(`梯度传值有误`);
    }

    // 修改之前查询公分项是否存在
    const find = await appDB.execute(
      ` select * from his_work_item where id = ?`,
      id
    );
    if (find.length === 0) throw new KatoRuntimeError(`工分项目不存在`);

    // 按照长度排序, 父级的id比子集的id短,所以父级会排在前面
    const mappingSorts = mappings
      .map(it => it.id)
      .sort((a, b) => a.length - b.length);

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

    // 如果公分项类型传了, 查询类型是否合法
    if (itemType) {
      const hospital = await getHospital();
      // language=PostgreSQL
      const workItemTypeModels = await appDB.execute(
        `
          select *
          from his_work_item_type
          where id = ?
            and hospital = ?
        `,
        itemType,
        hospital
      );
      if (workItemTypeModels.length === 0)
        throw new KatoRuntimeError(`该分类不存在`);
    }

    return appDB.transaction(async () => {
      // 添加工分项目
      await appDB.execute(
        // language=PostgreSQL
        `
          update his_work_item
          set name       = ?,
              method     = ?,
              type       = ?,
              steps      = ?,
              remark     = ?,
              item_type  = ?,
              updated_at = ?
          where id = ?`,
        name,
        method,
        staffMethod,
        JSON.stringify(steps),
        remark,
        itemType,
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
               item.steps,
               item.remark,
               item.item_type,
               type.name    item_type_name,
               mapping.source,
               mapping.type "sourceType"
        from his_work_item item
               left join his_work_item_staff_mapping mapping on item.id = mapping.item
               left join his_work_item_type type on item.item_type = type.id
        where item.hospital = ?
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
        select staff.id, staff.name, areaMapping.department
        from staff
               inner join staff_area_mapping areaMapping on staff.id = areaMapping.staff
        where areaMapping.area = ?
          and staff.status = true
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
    for (const it of workItemModels) {
      // 查找是否已经在数组中
      const index = workItemList.find(item => item.id === it.id);
      // 定义员工数组
      let staffs = [];
      if (it.sourceType === `${HisStaffDeptType.DEPT}`) {
        const deptIndex = deptStaffList.find(deptIt => deptIt.id === it.source);
        if (deptIndex) staffs = deptIndex.children;
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
          steps: it.steps,
          remark: it.remark,
          itemType: it.item_type,
          typeName: it.item_type_name,
          scope: it.type === HisStaffMethod.DYNAMIC ? it.sourceType : null,
          staffMappings: it.source ? [deptStaffObj[it.source]] : [],
          // 不能直接赋值,直接赋值是引用
          staffIdMappings: [].concat(staffs)
        });
      }
    }

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

  //region 预览接口
  async preview(
    name,
    method,
    mappings,
    staffMethod,
    staffs,
    scope,
    staff,
    day
  ) {
    const hospital = await getHospital();
    // 时间转化为月份的开始时间和结束时间
    const {start, end} = monthToRange(day);
    const workItems = await workPointCalculation(
      staff,
      hospital,
      start,
      end,
      name,
      method,
      mappings,
      staffMethod,
      staffs,
      scope
    );
    return workItems.slice(0, 10000);
  }

  // endregion

  // region 工分项分类相关接口
  // 工分项目分类添加
  @validate(
    should
      .string()
      .allow(null)
      .description('主键'),
    should
      .string()
      .required()
      .description('分类名称'),
    should
      .number()
      .required()
      .description('排序')
  )
  async workItemTypeUpsert(id, name, sort) {
    // 如果id不为空,是修改
    if (id) {
      // 修改之前先查询id是否存在
      // language=PostgreSQL
      const find = await appDB.execute(
        `
          select *
          from his_work_item_type
          where id = ?
        `,
        id
      );
      if (find.length === 0) throw new KatoRuntimeError(`该分类不存在`);
      // 执行修改
      // language=PostgreSQL
      await appDB.execute(
        `
          update his_work_item_type
          set name       = ?,
              "order"    = ?,
              updated_at = ?
          where id = ?
        `,
        name,
        sort,
        new Date(),
        id
      );
    } else {
      // 获取机构
      const hospital = await getHospital();
      // language=PostgreSQL
      await appDB.execute(
        `insert into his_work_item_type(id, name, hospital, "order", created_at, updated_at)
           values (?, ?, ?, ?, ?, ?)`,
        uuid(),
        name,
        hospital,
        sort,
        new Date(),
        new Date()
      );
    }
  }

  // 工分项分类列表
  async workItemTypeList() {
    const hospital = await getHospital();
    // language=PostgreSQL
    const list = await appDB.execute(
      `
        select id, name, hospital, "order" sort
        from his_work_item_type
        where hospital = ?
        order by sort
      `,
      hospital
    );
    return list;
  }

  // 工分项分类列表
  async workItemTypeDelete(id) {
    return appDB.transaction(async () => {
      // 查询分类有没有工分项使用
      const staffWork = await appDB.execute(
        `select * from his_work_item where item_type = ?`,
        id
      );
      if (staffWork.length > 0)
        throw new KatoRuntimeError(`分类在使用,不能删除`);

      // 删除工分项分类
      await appDB.execute(`delete from his_work_item_type where id = ?`, id);
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('工分项id'),
    should
      .string()
      .allow(null)
      .description('分类id')
  )
  async updateItemType(item, itemType) {
    // 查询工分项id是否存在
    const workItemModels = await appDB.execute(
      `
          select *
          from his_work_item
          where id = ?
        `,
      item
    );
    if (workItemModels.length === 0)
      throw new KatoRuntimeError(`该工分项不存在`);

    // 执行修改
    // language=PostgreSQL
    await appDB.execute(
      `
        update his_work_item
        set item_type  = ?,
            updated_at = ?
        where id = ?
      `,
      itemType,
      new Date(),
      item
    );
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
   *
   * @param params [{
   *   id: 要修改的主键,
   *   item: 公分项id,
   *   staff: 员工id,
   *   rate: 权重系数,
   *   remark: 备注,
   * }]
   * */
  @validate(
    should
      .object({
        id: should
          .string()
          .allow(null)
          .required(),
        item: should.string().required(),
        staff: should.string().required(),
        rate: should.number().required(),
        remark: should.string().allow(null)
      })
      .required()
  )
  async upsertStaffWorkItemMapping(params) {
    return appDB.joinTx(async () => {
      // 排查公分项是否存在
      const itemList = await appDB.execute(
        // language=PostgreSQL
        `
          select *
          from his_work_item
          where id = ?
        `,
        params.item
      );
      if (itemList.length === 0) throw new KatoRuntimeError(`工分项目不存在`);

      // 排查员工是否存在
      const checkStaffs = await appDB.execute(
        // language=PostgreSQL
        `
          select id, account, name
          from staff
          where id = ?
        `,
        params.staff
      );

      if (checkStaffs.length === 0) throw new KatoRuntimeError(`考核员工异常`);

      // 执行添加语句
      await appDB.execute(
        // language=PostgreSQL
        `
          insert into his_staff_work_item_mapping(id, item, staff, rate, remark, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?, ?)
          on conflict (item, staff)
            do update set rate       = ?,
                          remark     = ?,
                          updated_at = now()
        `,
        uuid(),
        params.item,
        params.staff,
        params.rate,
        params.remark,
        dayjs().toDate(),
        dayjs().toDate(),
        params.rate,
        params.remark
      );
    });
  }

  /**
   * 批量操作工分项和员工的绑定
   *
   * @param params [{
   *   id: 要修改的主键,
   *   item: 公分项id,
   *   staff: 员工id,
   *   rate: 权重系数,
   *   remark: 备注,
   * }]
   */
  @validate(
    should
      .array()
      .items({
        id: should
          .string()
          .allow(null)
          .required(),
        item: should.string().required(),
        staff: should.string().required(),
        rate: should.number().required(),
        remark: should.string().allow(null)
      })
      .min(1)
      .required()
  )
  async batchUpsertStaffWorkItemMapping(params) {
    return await appDB.joinTx(async () => {
      for (const item of params) {
        await this.upsertStaffWorkItemMapping(item);
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
        select staff.id, staff.name, staff.account
        from staff
               inner join staff_area_mapping areaMapping on staff.id = areaMapping.staff
        where areaMapping.area = ?
      `,
      hospital
    );

    // 查询公分项
    // language=PostgreSQL
    const workItemModes = await appDB.execute(
      `
        select id, name, method
        from his_work_item
        where hospital = ?
      `,
      hospital
    );

    // 查询公分项和员工的绑定
    // language=PostgreSQL
    const mappingModels = await appDB.execute(
      `
        select mapping.id,
               mapping.staff,
               mapping.item,
               mapping.rate,
               mapping.remark
        from his_staff_work_item_mapping mapping
               left join staff on mapping.staff = staff.id
               inner join staff_area_mapping areaMapping on staff.id = areaMapping.staff
        where areaMapping.area = ?
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
        // language=PostgreSQL
        `
          select staff
          from his_staff_work_item_mapping
          where item = ?
        `,
        item
      );
    }
    // 获取可选择的员工列表
    const staffList = await appDB.execute(
      // language=PostgreSQL
      `
        select staff.id, staff.account, staff.name
        from staff
               inner join staff_area_mapping areaMapping on staff.id = areaMapping.staff
        where areaMapping.area = ?
      `,
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
    const chargeIdModels: {
      item: string;
      item_name: string;
    }[] = await lakeDB.execute(
      // language=PostgreSQL
      `
        select distinct item, item_name
        from his_charge_detail detail
               left join his_charge_master hcm on detail.main = hcm.id
        where hcm.hospital = ?
          and item not like '%..%'
      `,
      hospital
    );
    // 已收费his项目数组
    const chargeModels: {id; name; parent}[] = [];
    for (const chargeIt of chargeIdModels) {
      // 收费项目会改名字,如果改名字,查询结果会多条,把相同id的名字拼接起来
      const findIndex = chargeModels.find(it => it.id === chargeIt.item);
      if (findIndex) {
        findIndex.name = `${findIndex.name}/${chargeIt.item_name}`;
      } else {
        chargeModels.push({
          name: chargeIt.item_name,
          id: chargeIt.item,
          parent: chargeIt.item
            .split('.')
            .slice(0, 3)
            .join('.')
        });
      }
    }
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
