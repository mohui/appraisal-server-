import {appDB} from '../../app';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {TagAlgorithmUsages} from '../../../common/rule-score';
import {monthToRange} from './manual';
import * as dayjs from 'dayjs';

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
  async autoScoreStaff(month, staff, times) {
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
    // 取出所有的自动打分的细则id
    const autoRules = rules
      .map(it => {
        if (it.auto === true) return it;
      })
      .filter(it => it);
    if (autoRules.length === 0)
      throw new KatoRuntimeError(`考核${check}无自动打分的细则`);

    // 根据时间获取月份的开始时间和结束时间
    const {start, end} = monthToRange(month);
    // 判断当前时间是否在时间范围内
    const now = dayjs()
      .startOf('d')
      .toDate();
    // const now = dayjs(times)
    //   .startOf('d')
    //   .toDate();

    // 如果开始时间减去当前时间大于0, 说明传的时间是这个月之后的日期,不合法
    if (dayjs(start).diff(now, 'd') > 0)
      throw new KatoRuntimeError(`时间不合法,大于当前月`);
    // 如果结束时间减去当前时间小于1,说明是之前月
    const timeDiff = dayjs(end).diff(now, 'd');

    const scoreDate =
      timeDiff < 1
        ? dayjs(end)
            .subtract(1, 'd')
            .toDate()
        : now;

    // 查询考核得分
    const staffScore = await appDB.execute(
      `
      select rule, staff, date, score
      from his_rule_staff_score
      where staff = ?
        and date = ?
        and rule in (${autoRules.map(() => '?')})
      `,
      staff,
      scoreDate,
      ...autoRules.map(it => it.id)
    );
    // 需要自动打分的细则
    let addAutoScoreRules = [];
    // 需要更新分数的细则, 重新打分的时候有数据
    const updAutoScoreRules = [];
    // TODO:需要删除的细则 如果细则被删除了, 之前打过分的得分记录全部删除
    const delAutoScoreRules = [];
    // 如果没有查到数据,说明没有被打过分;
    if (staffScore.length === 0) {
      addAutoScoreRules = autoRules.map(it => {
        return {
          rule: it.id,
          staff,
          date: scoreDate,
          score: 0
        };
      });
    } else {
      // TODO:有数据的情况,
      // 如果分数表查询出数据,是重新打分,分为三种情况, 1: 是否有要删除的数据, 2: 是否有要新增的数据, 3: 需要更新的数据
      for (const ruleIt of autoRules) {
        const scoreIndex = staffScore.find(it => it.rule === ruleIt.id);
        // 查找到, 是需要更新的数据
        if (scoreIndex) {
          updAutoScoreRules.push(scoreIndex);
        } else {
          // 没找到, 是需要新增员工细则分数
          addAutoScoreRules.push({
            rule: ruleIt.id,
            staff,
            date: scoreDate,
            score: 0
          });
        }
      }
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
      if (addScoreIndex) addScoreIndex.score = 23;
      // 指标分数 之 更新
      if (updScoreIndex) updScoreIndex.score = 23;
    }

    // 先删除
    if (delAutoScoreRules.length > 0) {
      console.log('delete');
      for (const it of delAutoScoreRules) {
        await appDB.execute(
          `delete from his_rule_staff_score where rule = ? and staff = ?`,
          it.rule,
          it.staff
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
          `insert into his_rule_staff_score(rule, staff, date, score, created_at, updated_at)
        values(?, ?, ?, ?, ?, ?)`,
          it.rule,
          it.staff,
          it.date,
          it.score,
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
                  updated_at = ?
               where rule = ? and staff = ? and date = ?
          `,
          it.score,
          insertNow,
          it.rule,
          it.staff,
          it.date
        );
      }
    }
  }
}
