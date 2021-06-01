import {appDB, originalDB} from '../../app';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {TagAlgorithmUsages} from '../../../common/rule-score';
import * as dayjs from 'dayjs';
import {HisWorkMethod, HisWorkSource} from '../../../common/his';
import Decimal from 'decimal.js';
import {v4 as uuid} from 'uuid';
import {getHospital} from './his_staff';
import {sql as sqlRender} from '../../database/template';
import {
  dateToDay,
  dateValid,
  dayToRange,
  getEndTimes,
  getSettle,
  monthToRange
} from './service';

function log(...args) {
  console.log(dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'), ...args);
}

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
 * 员工考核结果
 */
export type StaffScoreModel = {
  //工分
  work: {
    //本人工分项目的工分列表
    self: {id: string; name: string; score: number}[];
    //本人工分来源的员工列表
    staffs: {
      id: string;
      name: string;
      score: number;
    }[];
    //工分
    score?: number;
  };
  //考核方案
  check?: {
    id: string;
    name: string;
    //考核规则得分
    scores: {
      id: string;
      auto: boolean;
      name: string;
      detail: string;
      metric: string;
      operator: string;
      value: string;
      score: number;
      total: number;
    }[];
    //质量系数
    rate?: number;
  };
};

export default class HisScore {
  /**
   * 自动打分
   *
   * @param month 月份
   */
  async autoScoreAll(month) {
    return null;
  }

  /**
   * 机构自动打分
   * @param month 月份
   * @param id 机构id
   */
  async autoScoreHospital(month, id) {
    return null;
  }

  /**
   * 员工自动打分
   * @param month 月份
   * @param staff 员工id
   */
  @validate(should.date().required(), should.string().required())
  async autoScoreStaff(month, staff) {
    // 先根据员工查询考核
    const mapping = await appDB.execute(
      `select staff, "check" from his_staff_check_mapping
        where staff = ?`,
      staff
    );
    if (mapping.length === 0) throw new KatoRuntimeError(`员工${staff}无考核`);
    // 取出考核id
    const check = mapping[0]?.check;

    // 根据考核id查询考核细则
    const rules = await appDB.execute(
      `select id, auto,  name, detail,
            metric, operator,
            value, score
          from his_check_rule
          where "check" = ?`,
      check
    );
    if (rules.length === 0) throw new KatoRuntimeError(`考核${check}无细则`);
    // 取出所有的自动打分的细则
    const autoRules = rules.filter(it => it.auto);
    // 取出手动打分的
    const manualRuleIds = rules.filter(it => !it.auto).map(it => it.id);

    if (autoRules.length === 0)
      throw new KatoRuntimeError(`考核${check}无自动打分的细则`);

    const scoreDate = getEndTimes(month)?.scoreDate;

    // 查询考核得分  只查询这个人这一天的细则得分, 过滤掉手动的
    const [sql, params] = sqlRender(
      `
        select rule, staff, date, score
          from his_rule_staff_score
          where staff = {{? staff}}  and date = {{? scoreDate}}
        {{#if manualRuleIds}}
            AND rule not in ({{#each manualRuleIds}}{{? this}}{{#sep}},{{/sep}}{{/each}})
        {{/if}}
      `,
      {
        staff,
        scoreDate,
        manualRuleIds
      }
    );

    // 查询考核得分
    const staffScore = await appDB.execute(sql, ...params);
    // 需要自动打分的细则
    let addAutoScoreRules = [];
    // 需要更新分数的细则, 重新打分的时候有数据
    const updAutoScoreRules = [];
    // 需要删除的细则 如果细则被删除了, 之前打过分的得分记录全部删除
    let delAutoScoreRules = [];

    // 如果没有查到数据,当天没有被打过分;
    if (staffScore.length === 0) {
      addAutoScoreRules = autoRules.map(it => {
        return {
          rule: it.id,
          ruleName: it.name,
          staff,
          date: scoreDate,
          score: 0, // 这个是得分
          total: it.score // 这个是总分
        };
      });
    } else {
      // TODO: 如果查到数据,是重新打分,分为三种情况, 1: 是否有要删除的数据, 2: 是否有要新增的数据, 3: 需要更新的数据
      for (const ruleIt of autoRules) {
        // 查找得分表是否有这一条细则,有: 是需要更新的, 没有: 是需要新增的
        const scoreIndex = staffScore.find(it => it.rule === ruleIt.id);
        // 查找到, 是需要更新的数据
        if (scoreIndex) {
          // 找到: 2 是需要更新的
          updAutoScoreRules.push({
            rule: scoreIndex.rule,
            ruleName: ruleIt.name,
            staff: scoreIndex.staff,
            date: scoreIndex.date,
            score: scoreIndex.score,
            total: ruleIt.score // 这个是总分
          });
        } else {
          // 没找到: 3 是需要新增的员工细则分数
          addAutoScoreRules.push({
            rule: ruleIt.id,
            ruleName: ruleIt.name,
            staff,
            date: scoreDate,
            score: 0,
            total: ruleIt.score // 这个是总分
          });
        }
      }
      // 查找是否有需要删除的数据
      delAutoScoreRules = staffScore.filter(it => {
        const index = autoRules.find(ruleIt => ruleIt.id === it.rule);
        if (!index) return it;
      });
    }

    for (const ruleIt of autoRules) {
      // 如果查找到,是需要新增的数据
      const addScoreIndex = addAutoScoreRules.find(
        scoreIt => scoreIt.rule === ruleIt.id
      );
      // 如果查找到,是需要更新的数据
      const updScoreIndex = updAutoScoreRules.find(
        scoreIt => scoreIt.rule === ruleIt.id
      );

      // 根据指标获取指标数据
      // if (ruleIt.metric === '指定的指标') {
      if (ruleIt.metric) {
        // 根据指标算法,计算得分 之 结果为"是"得满分
        if (ruleIt.operator === TagAlgorithmUsages.Y01.code) {
          // 指标分数 之 新增
          if (addScoreIndex) addScoreIndex.score = ruleIt.score;
          // 指标分数 之 更新
          if (updScoreIndex) updScoreIndex.score = ruleIt.score;
        }
        // 根据指标算法,计算得分 之 结果为"否"得满分
        if (ruleIt.operator === TagAlgorithmUsages.N01.code) {
          // 指标分数 之 新增
          if (addScoreIndex) addScoreIndex.score = ruleIt.score;
          // 指标分数 之 更新
          if (updScoreIndex) updScoreIndex.score = ruleIt.score;
        }
        // “≥”时得满分，不足按比例得分
        if (ruleIt.operator === TagAlgorithmUsages.egt.code) {
          // 指标分数 之 新增
          if (addScoreIndex) addScoreIndex.score = ruleIt.score;
          // 指标分数 之 更新
          if (updScoreIndex) updScoreIndex.score = ruleIt.score;
        }
        // “≤”时得满分，超过按比例得分
        if (ruleIt.operator === TagAlgorithmUsages.elt.code) {
          // 指标分数 之 新增
          if (addScoreIndex) addScoreIndex.score = ruleIt.score;
          // 指标分数 之 更新
          if (updScoreIndex) updScoreIndex.score = ruleIt.score;
        }
      }

      // 指标分数 之 新增
      if (addScoreIndex) addScoreIndex.score = 15;
      // 指标分数 之 更新
      if (updScoreIndex) updScoreIndex.score = 23;
    }

    // 先删除
    if (delAutoScoreRules.length > 0) {
      console.log('delete');
      for (const it of delAutoScoreRules) {
        await appDB.execute(
          `delete from his_rule_staff_score where rule = ? and staff = ? and date = ?`,
          it.rule,
          it.staff,
          it.date
        );
      }
    }
    // 自动打分
    if (addAutoScoreRules.length > 0) {
      console.log('add');
      for (const it of addAutoScoreRules) {
        const insertNow = new Date();
        // 执行添加语句
        await appDB.execute(
          `insert into his_rule_staff_score(
                  rule,
                  rule_name,
                  staff,
                  date,
                  score,
                  total,
                  created_at,
                  updated_at)
                values(?, ?, ?, ?, ?, ?, ?, ?)`,
          it.rule,
          it.ruleName,
          it.staff,
          it.date,
          it.score,
          it.total,
          insertNow,
          insertNow
        );
      }
    }
    // 重新打分
    if (updAutoScoreRules.length > 0) {
      console.log('update');
      for (const it of updAutoScoreRules) {
        const insertNow = new Date();
        // 执行添加语句
        await appDB.execute(
          `update his_rule_staff_score set
                  score = ?,
                  rule_name = ?,
                  total = ?,
                  updated_at = ?
               where rule = ? and staff = ? and date = ?
          `,
          it.score,
          it.ruleName,
          it.total,
          insertNow,
          it.rule,
          it.staff,
          it.date
        );
      }
    }
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
    const hospital = await getHospital();
    const settle = await getSettle(hospital, month);
    if (settle) throw new KatoRuntimeError(`已结算,不能打分`);
    const date = getEndTimes(month);
    const scoreDate = date.scoreDate;

    // 查询考核细则
    const rules = await appDB.execute(
      `select id, name, auto, "check", score
            from his_check_rule where id = ?`,
      ruleId
    );
    if (rules.length === 0) throw new KatoRuntimeError(`无此考核细则`);
    // 自动打分的不能手动打分
    if (rules[0].auto === true)
      throw new KatoRuntimeError(`此考核细则不能手动打分`);

    // 根据员工id查询出改员工是否有考核
    const staffSystem = await appDB.execute(
      `select staff, "check" from his_staff_check_mapping where staff = ?`,
      staff
    );
    if (staffSystem.length === 0) throw new KatoRuntimeError(`该员工无考核`);

    if (rules[0].check !== staffSystem[0].check)
      throw new KatoRuntimeError(`考核员工考核项目和细则考核项目不一致`);

    if (rules[0].score < score)
      throw new KatoRuntimeError(`分数不能高于细则的满分`);

    // 查询今天是否有分值
    const todayScore = await appDB.execute(
      `select *
            from his_rule_staff_score
            where rule = ? and staff = ? and date = ?`,
      ruleId,
      staff,
      scoreDate
    );
    // 如果查找到,执行修改,没有查到到:添加
    if (todayScore.length === 0) {
      return await appDB.execute(
        `insert into
              his_rule_staff_score(rule, rule_name, staff, date, score, total, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?, ?)`,
        ...[
          ruleId,
          rules[0]?.name,
          staff,
          scoreDate,
          score,
          rules[0].score,
          scoreDate,
          scoreDate
        ]
      );
    } else {
      return await appDB.execute(
        `update his_rule_staff_score
            set score = ?, updated_at = ?
            where rule = ? and staff = ? and date = ?`,
        score,
        scoreDate,
        ruleId,
        staff,
        scoreDate
      );
    }
  }

  //region 工分计算相关
  /**
   * 机构工分计算
   *
   * @param month 月份
   * @param hospital 机构id
   */
  async workScoreHospital(month, hospital) {
    log(`开始计算 ${hospital} 工分`);
    //查询员工
    // language=PostgreSQL
    const staffs: {id: string; name: string}[] = await appDB.execute(
      `
        select id, name
        from staff
        where hospital = ?
      `,
      hospital
    );
    //同步工分
    for (const staff of staffs) {
      log(`开始同步 ${staff.name} 工分流水`);
      await this.syncDetail(staff.id, month);
      log(`结束同步 ${staff.name} 工分流水`);
    }
    //计算工分
    for (const staff of staffs) {
      log(`开始计算 ${staff.name} 工分`);
      await this.scoreStaff(staff.id, month);
      log(`结束计算 ${staff.name} 工分`);
    }
    log(`结束计算 ${hospital} 工分`);
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
   * 员工每日工分打分
   *
   * @param staff 员工id
   * @param day 月份
   */
  async scoreStaff(staff, day) {
    await appDB.joinTx(async () => {
      const date = dateToDay(day);
      const {start, end} = dayToRange(date);
      //查询工分来源
      //language=PostgreSQL
      const scoreDetails: {
        staff: string;
        item: string;
        score: number;
        value: number;
        method: string;
        item_name: string;
        staff_name: string;
      }[] = await appDB.execute(
        `
          select foo.*, wi.name as item_name, wi.method, s.name as staff_name
          from (
                 select ss.staff, sim.item, sum(sd.score) as score
                 from (
                        select unnest(sources) as staff, rate
                        from his_staff_work_source
                        where staff = ?
                      ) ss
                        inner join his_staff_work_item_mapping sim on ss.staff = sim.staff
                        left join his_staff_work_score_detail sd
                                  on ss.staff = sd.staff and sim.item = sd.item and sd.date >= ? and sd.date < ?
                 group by ss.staff, sim.item
               ) foo
                 inner join his_work_item wi on foo.item = wi.id
                 inner join staff s on foo.staff = s.id
        `,
        staff,
        start,
        end
      );
      //本人的工分项目得分列表
      const self = scoreDetails
        .filter(it => it.staff === staff)
        .map(it => ({
          id: it.item,
          name: it.item_name,
          score: it.score
        }));
      //本人的工分来源列表
      const staffs = scoreDetails.reduce((result, current) => {
        const obj = result.find(it => it.id === current.staff);
        if (obj) {
          obj.score += current.score;
        } else {
          result.push({
            id: current.staff,
            name: current.staff_name,
            score: current.score
          });
        }
        return result;
      }, []);
      //查询得分结果
      //language=PostgreSQL
      let resultModel: {
        id: string;
        day: Date;
        result: StaffScoreModel;
      } = (
        await appDB.execute(
          `
            select id, day, result
            from his_staff_result
            where id = ?
              and day = ? for update
          `,
          staff,
          day
        )
      )[0];
      if (!resultModel) {
        resultModel = {
          id: staff,
          day: day,
          result: {
            work: {
              self: [],
              staffs: [],
              score: null
            },
            check: null
          }
        };
      }
      resultModel.result.work.self = self;
      resultModel.result.work.staffs = staffs;
      resultModel.result.work.score = self.reduce(
        (result, current) => (result += current.score),
        0
      );
      const resultValue = JSON.stringify(resultModel.result);
      await appDB.execute(
        //language=PostgreSQL
        `
          insert into his_staff_result(id, day, result)
          values (?, ?, ?)
          on conflict (id, day)
            do update set result     = ?,
                          updated_at = now()
        `,
        resultModel.id,
        resultModel.day,
        resultValue,
        resultValue
      );
    });
  }

  //region 附加分相关
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
