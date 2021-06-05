import {appDB} from '../../app';
import * as uuid from 'uuid';
import * as dayjs from 'dayjs';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {sql as sqlRender} from '../../database/template';
import {getEndTime, getHospital, getSettle} from './service';

/**
 * 修改考核名称
 * @param id
 * @param name
 */
async function upsetSystem(id, name) {
  return appDB.joinTx(async () => {
    const hisSystems = await appDB.execute(
      `select id, name
            from his_check_system
            where id = ?`,
      id
    );
    if (hisSystems.length === 0) throw new KatoRuntimeError(`方案不存在`);
    if (hisSystems[0]?.name !== name)
      await appDB.execute(
        `update his_check_system
                set name = ?, updated_at = ?
                where id = ?
          `,
        name,
        dayjs().toDate(),
        id
      );
  });
}

/**
 * 修改考核员工
 * @param id
 * @param staffs
 * @param settleTimeObj
 */
async function upsertStaff(id, staffs, settleTimeObj) {
  // 获取当前月,和上一月是否结算
  const {lastSettle, lastDate, currentSettle, currentDate} = settleTimeObj;
  const date = [];
  // 如果上个月未结算,上个月需要删除
  if (lastSettle === false) date.push(lastDate);
  if (currentSettle === false) date.push(currentDate);

  return appDB.joinTx(async () => {
    // 查询该考核下所有的
    const checkStaffs = await appDB.execute(
      `select staff
              from his_staff_check_mapping
              where "check" = ?
        `,
      id
    );
    // 取出需要删除的员工
    const delStaffs = checkStaffs
      .map(it => {
        // 查找员工是否在要修改的数组中, 如果不在,说明要删除
        const index = staffs?.find(staff => it.staff === staff);
        if (!index) return it.staff;
      })
      .filter(it => it);
    // 取出需要添加的员工
    const addStaffs = staffs
      ?.map(it => {
        const index = checkStaffs.find(staffIt => staffIt.staff === it);
        if (!index) return it;
      })
      .filter(it => it);
    // 要过存在要删除的员工,执行删除, 删除前需要先删除得分表未结算的数据
    if (delStaffs.length > 0) {
      // 如果存在未结算的,删除所有未结算的,如果为空,说明没有为结算的
      if (date.length > 0) {
        // 删除得分表
        await appDB.execute(
          `delete from his_rule_staff_score
                where date in (${date.map(() => '?')})
                 and staff in (${delStaffs.map(() => '?')})`,
          ...date,
          ...delStaffs
        );
      }

      await appDB.execute(
        `delete from his_staff_check_mapping
                where staff in (${delStaffs.map(() => '?')})`,
        ...delStaffs
      );
    }

    if (addStaffs?.length > 0) {
      await appDB.execute(
        `
        insert into
        his_staff_check_mapping(staff, "check", created_at, updated_at)
        values${addStaffs.map(() => '(?, ?, ?, ?)').join()}
        `,
        ...addStaffs
          .map(it => [it, id, dayjs().toDate(), dayjs().toDate()])
          .reduce((prev, current) => {
            return [...prev, ...current];
          }, [])
      );
    }
  });
}

/**
 * 修改考核细则
 * @param id
 * @param automations
 * @param manuals
 */
async function upsertRule(id, automations, manuals) {
  return appDB.joinTx(async () => {
    const hisRules = await appDB.execute(
      `select * from his_check_rule
              where "check" = ?
        `,
      id
    );
    // 要添加的自动打分细则
    const addAutomations = [];
    // 要修改的自动打分细则
    const updAutomations = [];
    automations.forEach(it => {
      // 如果id存在, 是修改, 否则是添加
      if (it.id) {
        // 要修改的细则
        updAutomations.push(it);
      } else {
        // 要添加的细则
        addAutomations.push(it);
      }
    });
    // 要添加的手动打分细则
    const addManuals = [];
    // 要修改的手动打分细则
    const updManuals = [];

    // 处理手动打分细则
    manuals.forEach(it => {
      // 如果id,存在是修改,否则是添加
      if (it.id) {
        // 需要修改的细则
        updManuals.push(it);
      } else {
        addManuals.push(it);
      }
    });
    // 把手工和自动的放到一个数组中
    const upsertRules = automations.concat(manuals);
    // 得出要删除的细则
    const delRules = hisRules
      .map(it => {
        const index = upsertRules.find(upsert => it.id === upsert?.id);
        if (!index) {
          return it.id;
        }
      })
      .filter(it => it);

    // 如果有要删除的细则
    if (delRules.length > 0) {
      await appDB.execute(
        `delete from his_check_rule
                where id in (${delRules.map(() => '?')})`,
        ...delRules
      );
    }
    // 如果有要添加的自动打分细则
    if (addAutomations.length > 0) {
      for (const ruleIt of addAutomations) {
        // 自动打分
        await appDB.execute(
          `insert into
              his_check_rule(id, "check", auto, name, metric,
                operator, value, score, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          uuid.v4(),
          id,
          ruleIt.auto,
          ruleIt.name,
          ruleIt.metric,
          ruleIt.operator,
          ruleIt.value,
          ruleIt.score,
          dayjs().toDate(),
          dayjs().toDate()
        );
      }
    }
    // 如果有要修改的自动打分细则
    if (updAutomations.length > 0) {
      for (const ruleIt of updAutomations) {
        // 自动打分
        await appDB.execute(
          `update his_check_rule set
                name = ?,
                metric = ?,
                operator = ?,
                value = ?,
                score = ?,
                updated_at = ?
              where id = ?`,
          ruleIt.name,
          ruleIt.metric,
          ruleIt.operator,
          ruleIt.value,
          ruleIt.score,
          dayjs().toDate(),
          ruleIt.id
        );
      }
    }

    // 如果有要添加的手动打分细则
    if (addManuals.length > 0) {
      for (const ruleIt of addManuals) {
        // 手动打分
        await appDB.execute(
          `insert into
              his_check_rule(id, "check", auto, name, detail, score, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?, ?)`,
          uuid.v4(),
          id,
          ruleIt.auto,
          ruleIt.name,
          ruleIt.detail,
          ruleIt.score,
          dayjs().toDate(),
          dayjs().toDate()
        );
      }
    }
    // 如果有要修改的手动打分细则
    if (updManuals.length > 0) {
      for (const ruleIt of updManuals) {
        // 自动打分
        await appDB.execute(
          `update his_check_rule set
                name = ?,
                detail = ?,
                value = ?,
                score = ?,
                updated_at = ?
              where id = ?`,
          ruleIt.name,
          ruleIt.detail,
          ruleIt.value,
          ruleIt.score,
          dayjs().toDate(),
          ruleIt.id
        );
      }
    }
  });
}

export default class HisCheck {
  async list() {
    // 获取所属机构
    const hospital = await getHospital();
    // 获取考核方案名称
    const systemList = await appDB.execute(
      `select
              system.id,
              system.hospital,
              system.name,
              mapping.staff,
              staff.account,
              staff.name "staffName"
        from his_check_system system
        left join his_staff_check_mapping mapping on system.id = mapping."check"
        left join staff on mapping.staff = staff.id
        where system.hospital = ?
        order by system.created_at desc
      `,
      hospital
    );
    // 获取员工id
    const staffs = systemList.map(it => it.staff);

    // 根据员工id获取负责项目
    const workItems = await appDB.execute(
      `select item.id, item.name, item.method, mapping.staff
            from his_staff_work_item_mapping mapping
            left join his_work_item item on mapping.item = item.id
            where mapping.staff in (${staffs.map(() => '?')})`,
      ...staffs
    );
    // 获取医疗方案分值
    const systemScores = await appDB.execute(
      `select checkRule."check" "checkId", sum(checkRule.score) score
            from his_check_rule checkRule
            left join his_check_system system on checkRule."check" = system.id
            where system.hospital = ?
            group by checkRule."check"`,
      hospital
    );

    // 把员工的工分项目放到员工下
    const staffWorks = [];
    for (const workIt of workItems) {
      const index = staffWorks.find(it => it.staff === workIt.staff);
      if (index) {
        index.item.push({
          id: workIt.id,
          name: workIt.name,
          method: workIt.method
        });
      } else {
        staffWorks.push({
          staff: workIt.staff,
          item: [
            {
              id: workIt.id,
              name: workIt.name,
              method: workIt.method
            }
          ]
        });
      }
    }

    // 获取考核员工
    const returnList = [];
    for (const it of systemList) {
      // 查找工分项目
      const workItemObj = staffWorks.find(workIt => workIt.staff === it.staff);
      // 查找细则得分
      const scoreObj = systemScores.find(item => item.checkId === it.id);

      // 查找考核得分
      const findIndex = returnList.find(find => find.id === it.id);
      if (findIndex) {
        findIndex.staffs.push({
          staff: it.staff,
          account: it.account,
          name: it.staffName
        });
        // 如果员工有工分项目,需要判断这个员工的工分项目是否已经在列表中
        if (workItemObj) {
          for (const staffWorkItem of workItemObj.item) {
            const workIndex = findIndex.item.find(
              returnIt => returnIt.id === staffWorkItem.id
            );
            if (!workIndex)
              findIndex.item.push({
                id: staffWorkItem.id,
                name: staffWorkItem.name,
                method: staffWorkItem.method
              });
          }
        }
      } else {
        returnList.push({
          id: it.id,
          name: it.name,
          score: scoreObj?.score,
          staffs: [
            {
              staff: it.staff,
              account: it.account,
              name: it.staffName
            }
          ],
          item: workItemObj?.item ?? []
        });
      }
    }
    return returnList;
  }

  /**
   * 新建考核方案
   * 1个员工只能被一个考核方案考核
   *
   * @param name 考核名称
   * @param staffs 考核员工
   * @param automations 自动指标
   * @param manuals 手动指标
   */
  @validate(
    should
      .string()
      .required()
      .description('方案名称'),
    should
      .array()
      .required()
      .description('考核员工'),
    should
      .array()
      .items({
        auto: should
          .boolean()
          .required()
          .description('是否自动考核'),
        name: should
          .string()
          .allow(null)
          .description('名称,手动打分必有'),
        metric: should
          .string()
          .required()
          .description('指标,自动打分必有'),
        operator: should
          .string()
          .required()
          .description('计算方式,自动打分必有'),
        value: should
          .number()
          .required()
          .description('参考值'),
        score: should
          .number()
          .required()
          .description('分值')
      })
      .required()
      .description('自动考核细则'),
    should
      .array()
      .items({
        auto: should
          .boolean()
          .required()
          .description('是否自动考核'),
        name: should
          .string()
          .required()
          .description('名称,手动打分必有'),
        detail: should
          .string()
          .required()
          .description('名称,手动打分必有'),
        score: should
          .number()
          .required()
          .description('分值')
      })
      .required()
      .description('自动考核细则')
  )
  async add(name, staffs, automations, manuals) {
    if (automations.length === 0 && manuals.length === 0)
      throw new KatoRuntimeError(`自动打分和手动打分不能都为空`);
    const hospital = await getHospital();
    return appDB.transaction(async () => {
      const staffList = await appDB.execute(
        `select * from his_staff_check_mapping
              where staff in (${staffs.map(() => '?')})`,
        ...staffs
      );
      if (staffList.length > 0)
        throw new KatoRuntimeError(`有员工已被其他考核方案考核`);
      // 添加考核方案名称
      const checkId = uuid.v4();
      await appDB.execute(
        `insert into
              his_check_system(id, hospital, name, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
        checkId,
        hospital,
        name,
        dayjs().toDate(),
        dayjs().toDate()
      );
      // 添加考核员工
      await appDB.execute(
        `
        insert into
        his_staff_check_mapping(staff, "check", created_at, updated_at)
        values${staffs.map(() => '(?, ?, ?, ?)').join()}
        `,
        ...staffs
          .map(it => [it, checkId, dayjs().toDate(), dayjs().toDate()])
          .reduce((prev, current) => {
            return [...prev, ...current];
          }, [])
      );
      // 添加自动打分
      if (automations) {
        for (const ruleIt of automations) {
          // 自动打分
          await appDB.execute(
            `insert into
              his_check_rule(id, "check", auto, name, metric,
                operator, value, score, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            uuid.v4(),
            checkId,
            ruleIt.auto,
            ruleIt.name,
            ruleIt.metric,
            ruleIt.operator,
            ruleIt.value,
            ruleIt.score,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      }
      if (manuals) {
        // 手动打分
        for (const ruleIt of manuals) {
          // 手动打分
          await appDB.execute(
            `insert into
              his_check_rule(id, "check", auto, name, detail, score, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?, ?)`,
            uuid.v4(),
            checkId,
            ruleIt.auto,
            ruleIt.name,
            ruleIt.detail,
            ruleIt.score,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      }
    });
  }

  /**
   * 删除考核方案
   *
   * 如果方案绑定着员工,需要解绑员工,才能删除方案
   * 如果方案绑定着细则,需要删除细则,才能删除方案
   */
  @validate(
    should
      .string()
      .required()
      .description('考核方案id')
  )
  async delete(id) {
    return appDB.transaction(async () => {
      // 检查考核方案是否绑定了员工
      const staffs = await appDB.execute(
        `select * from his_staff_check_mapping where "check" = ?`,
        id
      );
      if (staffs.length > 0)
        throw new KatoRuntimeError(`考核方案存在考核规则, 不能删`);
      // 删除医疗考核规则
      const rule = await appDB.execute(
        `select * from his_check_rule where "check" = ?`,
        id
      );
      if (rule.length > 0)
        throw new KatoRuntimeError(`考核方案存在考核规则, 不能删`);

      // 删除医疗考核方案
      await appDB.execute(`delete from his_check_system where id = ?`, id);
    });
  }

  /**
   * 修改方案
   */
  @validate(
    should
      .string()
      .required()
      .description('考核方案id'),
    should
      .string()
      .required()
      .description('考核方案名称'),
    should
      .array()
      .allow(null)
      .description('考核员工'),
    should
      .array()
      .items({
        id: should
          .string()
          .allow(null)
          .description('细则id,如果没有,是要添加的'),
        auto: should
          .boolean()
          .required()
          .description('是否自动考核'),
        name: should
          .string()
          .allow(null)
          .description('名称,手动打分必有'),
        metric: should
          .string()
          .required()
          .description('指标,自动打分必有'),
        operator: should
          .string()
          .required()
          .description('计算方式,自动打分必有'),
        value: should
          .number()
          .required()
          .description('参考值'),
        score: should
          .number()
          .required()
          .description('分值')
      })
      .allow(null)
      .description('自动考核细则'),
    should
      .array()
      .items({
        id: should
          .string()
          .allow(null)
          .description('细则id,如果没有,是要添加的'),
        auto: should
          .boolean()
          .required()
          .description('是否自动考核'),
        name: should
          .string()
          .required()
          .description('名称,手动打分必有'),
        detail: should
          .string()
          .required()
          .description('名称,手动打分必有'),
        score: should
          .number()
          .required()
          .description('分值')
      })
      .allow(null)
      .description('自动考核细则')
  )
  async update(id, name, staffs, automations, manuals) {
    const hospital = await getHospital();
    const currentMonth = new Date();
    // 上个月时间
    const lastMonth = dayjs()
      .subtract(1, 'month')
      .toDate();
    const lastMonthEnd = getEndTime(lastMonth);

    // 上个月是否结算
    const lastSettle = await getSettle(hospital, lastMonth);
    // 本月是否结算
    const currentSettle = await getSettle(hospital, lastMonthEnd);

    const settleTimeObj = {
      lastSettle,
      lastDate: lastMonthEnd,
      currentSettle,
      currentDate: currentMonth
    };

    // 细则必须有
    if (!automations && !manuals)
      throw new KatoRuntimeError(`自动打分和手动打分不能都为空`);

    return appDB.joinTx(async () => {
      // 修改方案名称
      await upsetSystem(id, name);
      // 修改考核员工
      await upsertStaff(id, staffs, settleTimeObj);
      // 修改考核细则
      await upsertRule(id, automations, manuals);
    });
  }

  /**
   * 可绑定方案员工列表
   * @param id
   */
  @validate(
    should
      .string()
      .allow(null)
      .description('考核方案id')
  )
  async checkStaff(id) {
    // 获取所属机构
    const hospital = await getHospital();
    // 查询所有员工
    const staffs = await appDB.execute(
      `select id, account, name from staff where hospital = ?`,
      hospital
    );
    // 未绑定过考核的员工
    const [sql, params] = sqlRender(
      `
        select distinct staff from his_staff_check_mapping
        where 1 = 1
        {{#if id}}
            AND "check" != {{? id}}
        {{/if}}
      `,
      {
        id
      }
    );
    const checkStaff = await appDB.execute(sql, ...params);

    // 查询此考核方案员工
    let selectedStaffs = [];
    if (id) {
      selectedStaffs = await appDB.execute(
        `select distinct staff from his_staff_check_mapping where "check" = ?`,
        id
      );
    }
    return staffs.map(it => ({
      ...it,
      usable: !checkStaff.find(item => it.id === item.staff)?.staff,
      selected: !!selectedStaffs.find(item => it.id === item.staff)?.staff
    }));
  }

  /**
   * 考核详情
   */
  @validate(
    should
      .string()
      .required()
      .description('考核方案id')
  )
  async get(id) {
    // 根据id获取考核名称
    const hisSystems = await appDB.execute(
      `select id, name
            from his_check_system
            where id = ?`,
      id
    );
    if (hisSystems.length === 0) throw new KatoRuntimeError(`方案不存在`);
    const hisRules = await appDB.execute(
      `select * from his_check_rule
              where "check" = ?
        `,
      id
    );
    const automations = hisRules
      .map(it => {
        if (it.auto === true) return it;
      })
      .filter(it => it);
    const manuals = hisRules
      .map(it => {
        if (it.auto === false) return it;
      })
      .filter(it => it);

    return {
      id: hisSystems[0]?.id,
      name: hisSystems[0]?.name,
      automations,
      manuals
    };
  }
}
