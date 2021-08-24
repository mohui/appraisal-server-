import {appDB, originalDB} from '../../app';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {TagAlgorithmUsages} from '../../../common/rule-score';
import * as dayjs from 'dayjs';
import {
  HisStaffDeptType,
  HisStaffMethod,
  HisWorkMethod,
  MarkTagUsages,
  PreviewType
} from '../../../common/his';
import Decimal from 'decimal.js';
import {
  dateValid,
  dayToRange,
  getEndTime,
  getHospital,
  getSettle,
  monthToRange,
  StaffAssessModel
} from './service';
import {createBackJob} from '../../utils/back-job';
import {HisWorkItemSources} from './work_item';
import {sql as sqlRender} from '../../database';
import * as uuid from 'uuid';

function log(...args) {
  console.log(dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'), ...args);
}

// region 工分计算
/**
 * 工分流水
 */
type WorkItemDetail = {
  //工分项id
  id: string;
  //工分项名称
  name: string;
  // 工分项分类id
  typeId: string;
  // 公分项分类名称
  typeName: string;
  //工分项得分
  score: number;
  // 排序
  order: number;
};

/**
 * 工分计算
 *
 * @param staff 员工id
 * @param start 开始时间
 * @param end 结束时间
 * @param name 工分名称
 * @param method 得分方式, 计数,总和
 * @param mappings 工分项目
 * @param staffMethod 医疗工分项目和员工绑定方式 固定, 动态
 * @param staffs 员工数组[{code: 员工/科室id, type: 员工/科室}]
 * @param score 计数单位
 * @param scope 范围 员工, 科室, 机构
 * @return [{
 *   value: 单位量;
 *   date: 时间;
 *   staffId: 员工id;
 *   staffName: 员工名称;
 *   itemId: 工分项id;
 *   itemName: 工分项名称;
 *   type: 类预览类型 PreviewType;
 * }]
 */
export async function workPointCalculation(
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
): Promise<
  {
    value: number;
    date: Date;
    staffId: string;
    staffName: string;
    itemId: string;
    itemName: string;
    type: string;
  }[]
> {
  // 根据员工i查询员工信息
  const staffModel: {
    id: string;
    name: string;
    department?: string;
    hospital: string;
    staff?: string;
  } = (
    await appDB.execute(
      `select id, name, staff, hospital, department from staff where id = ?`,
      staff
    )
  )[0];
  //员工不存在, 直接返回
  if (!staffModel) return [];

  // 查询机构信息,下面显示要用
  const hospitalModels = await originalDB.execute(
    `select code, name from area where code = ?`,
    staffModel.hospital
  );

  // 根据公分项目拼装数组,计算工分
  const bindings = mappings.map(it => {
    const item = HisWorkItemSources.find(sourceIt => sourceIt.id === it);
    return {
      name,
      method,
      score,
      source: it,
      sourceName: item?.name
    };
  });

  // region 取出系统员工id 适用于门诊,住院,手工数据
  // 系统员工, 不管绑定没绑定his员工,全部都要
  let staffIds = [];
  // 取出当是 固定 时候的所有员工id
  if (staffMethod === HisStaffMethod.STATIC) {
    // 员工id列表
    staffIds = staffs
      .filter(it => it.type === HisStaffDeptType.Staff)
      .map(it => it.code);
    const depIds = staffs
      .filter(it => it.type === HisStaffDeptType.DEPT)
      .map(it => it.code);

    // 如果科室长度大于0, 查询科室下的所有员工
    if (depIds.length > 0) {
      // language=PostgreSQL
      const deptStaffList = await appDB.execute(
        `
            select id from staff
                where department in (${depIds.map(() => '?')})`,
        ...depIds
      );
      staffIds.push(...deptStaffList.map(it => it.id));
    }
  } else if (staffMethod === HisStaffMethod.DYNAMIC) {
    // 取出当是 动态 时候的所有员工id
    // 如果是本人
    if (scope === HisStaffDeptType.Staff) {
      staffIds.push(staff);
    }
    // 如果是本人所在科室
    if (scope === HisStaffDeptType.DEPT) {
      // language=PostgreSQL
      const staffDeptModels = await appDB.execute(
        `
          select id
          from staff
          where (department is not null and department = ?)
             or id = ?`,
        staffModel.department,
        staffModel.id
      );
      staffIds = staffDeptModels.map(it => it.id);
    }
    // 如果是本人所在机构
    if (scope === HisStaffDeptType.HOSPITAL) {
      // language=PostgreSQL
      const staffDeptModels = await appDB.execute(
        `
          select id
          from staff
          where hospital = ?
        `,
        staffModel.hospital
      );
      staffIds = staffDeptModels.map(it => it.id);
    }
  }
  // endregion

  // region 查询 门诊/住院 工分来源用到的医生id
  // his员工id, 为了查询 计算CHECK和DRUG工分来源
  let doctorIds;

  // 当前只有 计算CHECK和DRUG工分来源 用到了
  if (
    bindings.filter(
      it => it.source.startsWith('门诊') || it.source.startsWith('住院')
    ).length > 0
  ) {
    // 当是本人所在机构的时候(动态且机构)需要查询所有医生,包括没有关联his的员工
    if (
      staffMethod === HisStaffMethod.DYNAMIC &&
      scope === HisStaffDeptType.HOSPITAL
    ) {
      // 查询his机构id
      // language=PostgreSQL
      const hisStaffModels = await originalDB.execute(
        `
          select id, name
          from his_staff
          where hospital = ?
        `,
        staffModel.hospital
      );
      doctorIds = hisStaffModels.map(it => it.id);
    } else {
      // 根据员工id找到他的his的员工id
      // language=PostgreSQL
      const staffList = await appDB.execute(
        `
            select staff, name
                from staff
            where staff is not null
              and id in (${staffIds.map(() => '?')})`,
        ...staffIds
      );
      doctorIds = staffList.map(it => it.staff);
    }
  }
  // endregion

  // 工分流水
  let workItems = [];
  //计算工分
  //region 计算CHECK和DRUG工分来源
  for (const param of bindings.filter(
    it => it.source.startsWith('门诊') || it.source.startsWith('住院')
  )) {
    //region 处理人员条件条件
    let doctorCondition = '1 = 0';
    if (doctorIds.length > 0) {
      doctorCondition = `doctor in (${doctorIds.map(() => '?').join()})`;
    }
    //endregion
    //查询his的收费项目
    const rows: {
      value: string;
      date: Date;
      staffId: string;
      staffName: string;
      itemId: string;
      itemName: string;
      type: string;
    }[] = await originalDB.execute(
      // language=PostgreSQL
      `
          select total_price as value,
                 operate_time as date,
                 item "itemId",
                 item_name "itemName",
                 doctor "staffId",
                 staff.name as "staffName",
                 '${PreviewType.HIS_STAFF}' as type
          from his_charge_detail detail
          inner join his_staff staff on detail.doctor = staff.id
          where operate_time > ?
            and operate_time < ?
            and (item like ? or item = ?)
            and ${doctorCondition}
          order by operate_time
        `,
      start,
      end,
      `${param.source}.%`,
      param.source,
      ...doctorIds
    );
    //his收费项目流水转换成工分流水
    workItems = workItems.concat(rows);
  }
  //endregion
  //region 计算MANUAL工分来源
  for (const param of bindings.filter(it => it.source.startsWith('手工数据'))) {
    //查询手工数据流水表
    const rows: {
      value: number;
      date: Date;
      staffId: string;
      staffName: string;
      itemId: string;
      itemName: string;
      type: string;
    }[] = await appDB.execute(
      // language=PostgreSQL
      `
          select date,
                 value,
                 smdd.staff "staffId",
                 staff.name "staffName",
                 manual.id "itemId",
                 manual.name "itemName",
                 '${PreviewType.STAFF}' as type
          from his_staff_manual_data_detail smdd
                 inner join his_manual_data manual on smdd.item = manual.id
                 inner join staff  on staff.id = smdd.staff
          where smdd.item = ?
            and smdd.date >= ?
            and smdd.date < ?
            and staff.id in (${staffIds.map(() => '?')})
          order by smdd.date
        `,
      //手工数据的source转id, 默认是只能必须选id
      param.source.split('.')[1],
      start,
      end,
      ...staffIds
    );
    //手工数据流水转换成工分流水
    workItems = workItems.concat(rows);
  }
  //endregion
  //region 计算公卫数据工分来源
  for (const param of bindings.filter(it => it.source.startsWith('公卫数据'))) {
    //机构级别的数据, 直接用当前员工的机构id即可
    //查询hospital绑定关系
    // language=PostgreSQL
    const hisHospitalModels = await appDB.execute(
      `
        select mapping.hishospid hospital,
               hospital.id,
               hospital.name
        from hospital_mapping mapping
               inner join hospital on mapping.h_id = hospital.id
        where mapping.h_id = ?
      `,
      staffModel.hospital
    );
    const hisHospitals: string[] = hisHospitalModels.map(it => it.hospital);
    //没有绑定关系, 直接跳过
    if (hisHospitals.length === 0) continue;
    const item = HisWorkItemSources.find(it => it.id === param.source);
    //未配置数据表, 直接跳过
    if (!item || !item?.datasource?.table) continue;
    //渲染sql
    const sqlRendResult = sqlRender(
      `
          select 1 as value, {{dateCol}} as date, OperateOrganization hospital
          from {{table}}
          where 1 = 1
            and {{dateCol}} >= {{? start}}
            and {{dateCol}} < {{? end}}
            and OperateOrganization in ({{#each hospitals}}{{? this}}{{#sep}},{{/sep}}{{/each}})
          {{#each columns}} and {{this}} {{/each}}
          `,
      {
        dateCol: item.datasource.date,
        hospitals: hisHospitals,
        table: item.datasource.table,
        columns: item.datasource.columns,
        start,
        end
      }
    );
    const rows: {
      date: Date;
      value: number;
      hospital: string;
    }[] = await originalDB.execute(sqlRendResult[0], ...sqlRendResult[1]);
    //公卫数据流水转换成工分流水
    workItems = workItems.concat(
      rows.map(it => {
        const item = hisHospitalModels.find(
          hospitalIt => hospitalIt.hospital === it.hospital
        );
        return {
          value: it.value,
          date: it.date,
          staffId: item?.id,
          staffName: item?.name,
          itemId: param.source,
          itemName: param?.sourceName,
          type: PreviewType.HOSPITAL
        };
      })
    );
  }
  //endregion
  //region 计算其他工分来源
  for (const param of bindings.filter(it => it.source.startsWith('其他'))) {
    let type = '';
    if (param.source === '其他.住院诊疗人次') type = '住院';
    if (param.source === '其他.门诊诊疗人次') type = '门诊';
    const rows: {date: Date; value: number}[] = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select distinct treat, operate_time
          from his_charge_master
          where hospital = ?
            and operate_time > ?
            and operate_time < ?
            and charge_type = ?
          order by operate_time
        `,
        staffModel.hospital,
        start,
        end,
        type
      )
    ).map(it => ({
      value: 1,
      date: it.operate_time
    }));
    //其他工分流水转换成工分流水
    workItems = workItems.concat(
      rows.map(it => {
        return {
          value: it.value,
          date: it.date,
          staffId: hospitalModels[0]?.code,
          staffName: hospitalModels[0]?.name,
          itemId: param.source,
          itemName: param.sourceName,
          type: PreviewType.HOSPITAL
        };
      })
    );
  }
  //endregion
  return workItems;
}

// endregion

// region 公卫打分
async function getMark(hospital, year) {
  const list = await originalDB.execute(
    `select id, "HIS00"
         from mark_his_hospital
         where id = ? and year = ?
    `,
    hospital,
    year
  );
  return (
    list[0] ?? {
      id: null,
      HIS00: 0
    }
  );
}

// endregion

// region 质量系数公共方法
// 考核细则
type CheckRuleModel = {
  // 细则id
  id: string;
  // 细则名称
  name: string;
  // 所属考核方案
  check: string;
  // 是否自动考核
  auto: boolean;
  // 考核要求
  detail: string;
  // 指标
  metric: string;
  // 计算方式
  operator: string;
  // 参考值(大于小于的参考值)
  value: number;
  // 分值
  score: number;
};
type AssessModel = {
  id?: string;
  staffId: string;
  time: Date;
  systemId: string;
  systemName: string;
  ruleId: string;
  ruleName: string;
  score: number;
  // 满分
  total: number;
};
// endregion

export default class HisScore {
  // region 自动打分
  /**
   * 重新计算
   *
   * 工分和考核分, 全部重新计算
   * @param month 月份
   */
  async score(month) {
    const hospital = await getHospital();
    const day = getEndTime(month);
    const {start} = monthToRange(month);
    const settle = await getSettle(hospital, start);
    if (settle) throw new KatoRuntimeError('该月已结算, 不能打分');
    await createBackJob('HisSCore', '', {
      days: [day],
      hospital
    });
  }

  /**
   * 系统定时打分
   *
   * 此时都是计算前一天的分数
   * 只有定时任务才会调用
   */
  async autoScoreAll() {
    //打分的日期
    const day = dayjs()
      .startOf('d')
      //自动打分, 都是计算前一天的分数, 所以, 要减一天
      .subtract(1, 'd')
      .toDate();
    //查询结算状态
    const {start} = monthToRange(day);
    const hospitals = (
      await appDB.execute(
        // language=PostgreSQL
        `
          select a.code, a.name, hs.settle
          from area a
                 left join his_hospital_settle hs on a.code = hs.hospital and hs.month = ?
        `,
        start
      )
    ).filter(it => it.settle === false);
    for (const hospitalModel of hospitals) {
      //工分计算
      await this.workScoreHospital(day, hospitalModel.code);
      //考核打分
      await this.autoScoreHospital(day, hospitalModel.code);
    }
  }

  /**
   * 机构自动打分
   * @param day 月份
   * @param id 机构id
   */
  async autoScoreHospital(day, id) {
    const hospital = await appDB.execute(
      `
          select id, name, hospital
          from staff
          where hospital = ?
        `,
      id
    );
    for (const staffIt of hospital) {
      try {
        log(`开始计算 ${staffIt.name} 打分`);
        await this.autoScoreStaff(day, staffIt?.id, id);
        log(`结束计算 ${staffIt.name} 打分`);
      } catch (e) {
        log(e);
      }
    }
  }

  // endregion

  // region 质量系数打分代码
  /**
   * 员工自动打分
   * @param day 月份
   * @param staff 员工id
   * @param hospital 机构id
   */
  @validate(
    should.date().required(),
    should.string().required(),
    should.string().required()
  )
  async autoScoreStaff(day, staff, hospital) {
    const mark = await getMark(hospital, dayjs(day).year());
    return await appDB.joinTx(async () => {
      // region 打分前的校验
      // 先根据员工查询考核
      // language=PostgreSQL
      const mapping = await appDB.execute(
        `select staff, "check"
           from his_staff_check_mapping
           where staff = ?`,
        staff
      );
      if (mapping.length === 0) {
        log(`员工${staff}无考核`);
        return;
      }
      // 取出考核方案id
      const check = mapping[0]?.check;

      // 查询方案
      // language=PostgreSQL
      const checkSystemModels = await appDB.execute(
        `select id, name, hospital
           from his_check_system
           where id = ?`,
        check
      );
      if (checkSystemModels.length === 0) {
        log(`考核方案${check}不存在`);
        return;
      }

      // 根据考核方案id查询考核细则
      // language=PostgreSQL
      const ruleModels: CheckRuleModel[] = await appDB.execute(
        `select id,
                  "check",
                  auto,
                  name,
                  detail,
                  metric,
                  operator,
                  value,
                  score
           from his_check_rule
           where "check" = ?`,
        check
      );
      if (ruleModels.length === 0) {
        log(`考核${check}无细则`);
        return;
      }
      // endregion

      // region 自动打分根据规则得分
      // 取出所有的自动打分的细则
      const autoRules = ruleModels.filter(it => it.auto);
      // 取出所有的手动打分的细则
      const manualRules = ruleModels.filter(it => !it.auto);
      // 获取所传月份的开始时间 即所在月份的一月一号零点零分零秒
      const monthTime = monthToRange(day);
      // 当天的开始时间和结束时间
      const {start, end} = dayToRange(monthTime.start);
      // 开始之前先查询此员工本月是否打过分
      // language=PostgreSQL
      const assessResultModel: AssessModel[] = await appDB.execute(
        `select id,
                  staff_id    "staffId",
                  time,
                  system_id   "systemId",
                  system_name "systemName",
                  rule_id     "ruleId",
                  rule_name   "ruleName",
                  score,
                  total
           from his_staff_assess_result
           where staff_id = ?
             and time >= ?
             and time < ?`,
        staff,
        start,
        end
      );

      // 自动打分的赋值上分数
      const addRuleScore: AssessModel[] = [];
      // 算出打分结果
      for (const ruleIt of autoRules) {
        let score = 0;
        // 根据指标获取指标数据
        if (ruleIt.metric === MarkTagUsages.HIS00.code) {
          // 根据指标算法,计算得分 之 结果为"是"得满分
          if (ruleIt.operator === TagAlgorithmUsages.Y01.code && mark?.HIS00) {
            // 指标分数
            score = ruleIt.score;
          }
          // 根据指标算法,计算得分 之 结果为"否"得满分
          if (ruleIt.operator === TagAlgorithmUsages.N01.code && !mark?.HIS00) {
            // 指标分数
            score = ruleIt.score;
          }
          // “≥”时得满分，不足按比例得分
          if (ruleIt.operator === TagAlgorithmUsages.egt.code) {
            const rate = mark.HIS00 / ruleIt.value;
            // 指标分数
            score = ruleIt.score * (rate > 1 ? 1 : rate);
          }
        }
        addRuleScore.push({
          staffId: staff,
          time: start,
          systemId: checkSystemModels[0]?.id,
          systemName: checkSystemModels[0]?.name,
          ruleId: ruleIt.id,
          ruleName: ruleIt.name,
          score,
          total: ruleIt.score
        });
      }

      // 填充手动打分的细则,如果有,赋值上分, 没有给0分
      for (const ruleIt of manualRules) {
        // 在打分表里查找
        const item = assessResultModel.find(
          scoreIt => scoreIt.ruleId === ruleIt.id
        );
        // 如果都没有找到,存在还没有打过分的细则id
        addRuleScore.push({
          staffId: staff,
          time: start,
          systemId: checkSystemModels[0]?.id,
          systemName: checkSystemModels[0]?.name,
          ruleId: ruleIt.id,
          ruleName: ruleIt.name,
          score: item?.score ?? 0,
          total: ruleIt.score
        });
      }
      // endregion

      // region 添加自动打分结果
      // 插入之前先删除
      if (assessResultModel.length > 0) {
        // 过滤已经删除的细则 和 自动打分的细则, 先删除,后添加
        const delRuleScoreId = assessResultModel.map(delIt => delIt.id);
        // 删除已经不存在的细则打分
        // language=PostgreSQL
        await appDB.execute(
          `
              delete from his_staff_assess_result
              where id in (${delRuleScoreId.map(() => '?')})
            `,
          ...delRuleScoreId
        );
      }
      // 插入打分结果
      for (const insertIt of addRuleScore) {
        // language=PostgreSQL
        await appDB.execute(
          `insert into his_staff_assess_result(id,
                                                 staff_id,
                                                 time,
                                                 system_id,
                                                 system_name,
                                                 rule_id,
                                                 rule_name,
                                                 score,
                                                 total,
                                                 created_at,
                                                 updated_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ...[
            uuid.v4(),
            insertIt.staffId,
            insertIt.time,
            insertIt.systemId,
            insertIt.systemName,
            insertIt.ruleId,
            insertIt.ruleName,
            insertIt.score,
            insertIt.total,
            new Date(),
            new Date()
          ]
        );
      }
      // endregion
    });
  }

  /**
   * 考核手动打分
   * 只要未结算,不管是新增,删除细则,都要按照细则表里的细则校验
   *
   * @param ruleId 细则id
   * @param staff 员工id
   * @param month 时间
   * @param score 分值
   */
  @validate(
    should
      .string()
      .required()
      .description('细则id'),
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .date()
      .required()
      .description('时间'),
    should
      .number()
      .required()
      .description('分值')
  )
  async setCheckScore(ruleId, staff, month, score) {
    // 获取机构id
    const hospital = await getHospital();
    // 是否结算
    const settle = await getSettle(hospital, month);
    if (settle) throw new KatoRuntimeError(`已结算,不能打分`);

    // 获取所传月份的开始时间 即所在月份的一月一号零点零分零秒
    const monthTime = monthToRange(month);
    // 当天的开始时间和结束时间
    const {start, end} = dayToRange(monthTime.start);

    // region 校验合法性
    // 根据员工id查询出该员工是否有考核
    const staffSystem = await appDB.execute(
      `select staff, "check" from his_staff_check_mapping where staff = ?`,
      staff
    );
    if (staffSystem.length === 0) throw new KatoRuntimeError(`该员工无考核`);

    // 查询方案
    const checkSystemModels = await appDB.execute(
      `select id, name, hospital from his_check_system where id = ?`,
      staffSystem[0].check
    );

    if (checkSystemModels.length === 0)
      throw new KatoRuntimeError(`考核方案不存在`);

    // 查询考核细则
    // language=PostgreSQL
    const ruleModels: CheckRuleModel[] = await appDB.execute(
      `select id,
                name,
                detail,
                auto,
                "check",
                metric,
                operator,
                value,
                score
         from his_check_rule
         where "check" = ?`,
      staffSystem[0].check
    );

    if (ruleModels.length === 0) throw new KatoRuntimeError(`考核方案没有细则`);

    const ruleOneModels = ruleModels.find(it => it.id === ruleId);

    if (!ruleOneModels) throw new KatoRuntimeError(`无此考核细则`);

    // 自动打分的不能手动打分
    if (ruleOneModels.auto === true)
      throw new KatoRuntimeError(`此考核细则不能手动打分`);

    if (ruleOneModels.score < score)
      throw new KatoRuntimeError(`分数不能高于细则的满分`);
    // endregion

    // 查询该细则本月是否有分值
    // language=PostgreSQL
    const assessResultModel: AssessModel[] = await appDB.execute(
      `select id,
                staff_id    "staffId",
                time,
                system_id   "systemId",
                system_name "systemName",
                rule_id     "ruleId",
                rule_name   "ruleName",
                score,
                total
         from his_staff_assess_result
         where staff_id = ?
           and rule_id = ?
           and time >= ?
           and time < ?`,
      staff,
      ruleId,
      start,
      end
    );
    // 如果有分值, 执行修改, 如果没有分值, 执行添加
    if (assessResultModel.length > 0) {
      // 该手工细则本月打过分,执行修改语句
      // language=PostgreSQL
      return await appDB.execute(
        `
          update his_staff_assess_result
          set system_name = ?,
              rule_name   = ?,
              score       = ?,
              total       = ?,
              updated_at  = ?
          where id = ?
        `,
        checkSystemModels[0]?.name,
        ruleOneModels?.name,
        score,
        ruleOneModels?.score,
        new Date(),
        assessResultModel[0]?.id
      );
    } else {
      // 该手工细则本月没有打过分, 执行添加语句
      // language=PostgreSQL
      return await appDB.execute(
        `insert into his_staff_assess_result(id,
                                               staff_id,
                                               time,
                                               system_id,
                                               system_name,
                                               rule_id,
                                               rule_name,
                                               score,
                                               total,
                                               created_at,
                                               updated_at)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ...[
          uuid.v4(),
          staff,
          start,
          checkSystemModels[0]?.id,
          checkSystemModels[0]?.name,
          ruleId,
          ruleOneModels?.name,
          score,
          ruleOneModels?.score,
          new Date(),
          new Date()
        ]
      );
    }
  }

  // endregion

  //region 工分计算相关
  /**
   * 机构工分计算
   *
   * @param month 月份
   * @param hospital 机构id
   */
  async workScoreHospital(month, hospital) {
    log(`开始计算 ${hospital} 工分`);
    // 查询员工
    // language=PostgreSQL
    const staffs: {id: string; name: string}[] = await appDB.execute(
      `
        select id, name
        from staff
        where hospital = ?
      `,
      hospital
    );
    // 获取所传月份的开始时间
    const {start} = monthToRange(month);

    await Promise.all(staffs.map(staff => this.scoreStaff(staff.id, start)));
    log(`结束计算 ${hospital} 工分`);
  }

  /**
   * 员工每日工分打分
   *
   * @param id 员工id
   * @param day 日期
   */
  async scoreStaff(id, day) {
    // 获取月份的开始时间和结束时间
    const {start, end} = monthToRange(day);
    //查询员工信息
    const staffModel: {
      id: string;
      name: string;
      department?: string;
      hospital: string;
      staff?: string;
    } = (
      await appDB.execute(
        `select id, name, staff, hospital, department from staff where id = ?`,
        id
      )
    )[0];
    //员工不存在, 直接返回
    if (!staffModel) return;
    //查询绑定关系
    //language=PostgreSQL
    const bindings: {
      //工分项自身
      id: string; //工分项id
      name: string; //工分项名称
      method: string; //得分方式
      score: number; //分值
      //关联项目
      source: string; //关联项目id
      //关联员工
      staff_type: string; //关联人员类型
      staff_id: string; //关联人员id
      staff_level: string; //关联人员层级
      //绑定关系
      rate: string; //权重
      item_type: string; //工分项分类id
      item_type_name: string; //工分项分类名称
      order: number; //排序
    }[] = await appDB.execute(
      `
        select wi.id,
               wi.name,
               wi.method,
               wi.score,
               wim.source,
               wi.type                   as staff_type,
               wi.item_type,
               type.name                 as item_type_name,
               type.sort                 as "order",
               wism.source               as staff_id,
               coalesce(wism.type, '员工') as staff_level,
               swim.rate
        from his_staff_work_item_mapping swim
               inner join his_work_item wi on swim.item = wi.id
               inner join his_work_item_mapping wim on swim.item = wim.item
               left join his_work_item_staff_mapping wism on swim.item = wism.item
               left join his_work_item_type type on wi.item_type = type.id
        where swim.staff = ?
      `,
      staffModel.id
    );
    const list = [];
    // 循环遍历数组,根据公分项id分组
    for (const it of bindings) {
      const index = list.find(item => item.id === it.id);
      // 如果查找到, 公分项已在数组中,需要查找[工分项目]和[员工]是否在数组中
      if (index) {
        // 查找[工分项目]是否在数组中,如果没有,把工分项目push进去()
        const mappingsFind = index.mappings.find(
          mappingIt => mappingIt === it.source
        );
        // 没查找到, 工分项目push进数组中
        if (!mappingsFind) index.mappings.push(it.source);
        // 如果是固定, 查找员工/科室 是否在数组中,如果不在 push进数组
        if (it.staff_type === HisStaffMethod.STATIC) {
          // 查找此员工或科室是否在数组中
          const staffsFind = index.staffs.find(
            staffIt => staffIt.code === it.staff_id
          );
          // 动态, 且数组中不存在此员工/科室, push进数组
          if (!staffsFind) {
            index.staffs.push({code: it.staff_id, type: it.staff_level});
          }
        }
      } else {
        /**
         * 如果没有查找到, 把工分项放到数组找那个
         * staffs: 根据 staffMethod(工分项目和员工绑定方式), 固定的时候为空,动态的时候有值
         */
        list.push({
          id: it.id,
          staff: id,
          start,
          end,
          name: it.name,
          method: it.method,
          typeId: it.item_type,
          typeName: it.item_type_name,
          // 工分项目
          mappings: [it.source],
          staffMethod: it.staff_type,
          // 固定的时候才有值
          staffs:
            it.staff_type === HisStaffMethod.STATIC
              ? [{code: it.staff_id, type: it.staff_level}]
              : [],
          score: it.score,
          // 范围, 动态的时候才有值
          scope:
            it.staff_type === HisStaffMethod.DYNAMIC ? it.staff_level : null,
          rate: it.rate,
          order: it.order
        });
      }
    }
    // 工分流水
    let workItems: WorkItemDetail[] = [];
    for (const it of list) {
      // 根据工分项获取工分项目的公分
      const work = await workPointCalculation(
        it.staff,
        start,
        end,
        it.name,
        it.method,
        it.mappings,
        it.staffMethod,
        it.staffs,
        it.score,
        it.scope
      );

      let works;
      // 判断是技术还是总和, 如果是技术, 条数 * 标准工作量
      if (it.method === HisWorkMethod.AMOUNT) {
        works = work.map(workIt => ({
          ...workIt,
          score: it.score
        }));
      } else if (it.method === HisWorkMethod.SUM) {
        // 如果是总和 金额 * 标准工作量
        works = work.map(workIt => ({
          ...workIt,
          score: new Decimal(workIt.value).mul(it.score).toNumber()
        }));
      }
      // 累加
      const sum = works.reduce(
        (prev, curr) => Number(prev) + Number(curr.score),
        0
      );
      workItems = workItems.concat([
        {
          id: it.id,
          name: it.name,
          typeId: it.typeId,
          typeName: it.typeName,
          score: sum * it.rate,
          order: it.order
        }
      ]);
    }
    // region 写入结果表
    await appDB.transaction(async () => {
      // 写入之前先清除掉老数据
      // language=PostgreSQL
      await appDB.execute(
        `
          delete
          from his_staff_work_result
          where staff_id = ?
            and time = ?
        `,
        id,
        start
      );
      for (const result of workItems) {
        // 添加拼装好的数据
        await appDB.execute(
          //language=PostgreSQL
          `
            insert into his_staff_work_result(id,
                                              staff_id,
                                              time,
                                              item_id,
                                              item_name,
                                              type_id,
                                              type_name,
                                              score,
                                              "order",
                                              created_at,
                                              updated_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          uuid.v4(),
          id,
          start,
          result?.id ?? null,
          result?.name ?? null,
          result?.typeId ?? null,
          result?.typeName ?? null,
          result?.score ?? null,
          result?.order ?? null,
          new Date(),
          new Date()
        );
      }
    });
    // endregion
  }

  /**
   * 设置员工附加分
   *
   * @param id 员工id
   * @param month 月份
   * @param score 附加分数
   */
  @validate(should.string().required(), dateValid, should.number().required())
  async setExtraScore(id, month, score) {
    const hospital = await getHospital();
    const {start} = monthToRange(month);
    const settle = await getSettle(hospital, start);
    if (settle) {
      throw new KatoRuntimeError(`机构已经结算, 不能修改附加分`);
    }
    //更新附加分
    // language=PostgreSQL
    await appDB.execute(
      `
        insert into his_staff_extra_score(staff, month, score)
        values (?, ?, ?)
        on conflict (staff, month)
          do update set score      = ?,
                        updated_at = now()
      `,
      id,
      start,
      score,
      score
    );
  }

  //endregion
}
