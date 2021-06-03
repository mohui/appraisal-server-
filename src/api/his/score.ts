import {appDB, originalDB} from '../../app';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {TagAlgorithmUsages} from '../../../common/rule-score';
import * as dayjs from 'dayjs';
import {HisWorkMethod, HisWorkSource, MarkTagUsages} from '../../../common/his';
import Decimal from 'decimal.js';
import {v4 as uuid} from 'uuid';
import {
  dateValid,
  dayToRange,
  getEndTime,
  getHospital,
  getSettle,
  monthToRange,
  StaffAssessModel,
  StaffWorkModel
} from './service';
import {createBackJob} from '../../utils/back-job';

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
 * 遍历打分
 *
 * @param ruleModels 细则列表
 * @param ruleId 细则id
 * @param score 细则得分
 * @param assess 要添加的数组
 */
async function staffAssess(
  ruleModels,
  ruleId,
  score,
  assess: StaffAssessModel
) {
  let ruleScores;
  // 如果没有数据,说明是没有打过分,需要把细则都放到里面,然后打分
  if (!assess) {
    ruleScores = ruleModels.map(ruleIt => {
      return {
        id: ruleIt.id,
        auto: ruleIt.auto,
        name: ruleIt.name,
        detail: ruleIt.detail,
        metric: ruleIt.metric,
        operator: ruleIt.operator,
        value: ruleIt.value,
        score: ruleIt.id === ruleId ? score : null,
        total: ruleIt.score
      };
    });
  } else {
    // 如果有数据, 就是打过分,需要排查细则有没有添加和删除的
    const delRuleScore = assess?.scores.filter(scoreIt => {
      // 在得分细则表里遍历, 如果这个得分细则的id在细则表中没有找到,说明这个细则已经删除了,需要在得分细则表里删除掉
      const index = ruleModels.find(ruleIt => ruleIt.id === scoreIt.id);
      if (!index) return scoreIt;
    });
    // 需要添加的数据
    const addRuleScores = ruleModels.filter(ruleIt => {
      // 在细则表里遍历查找, 如果这个细则的id在得分细则表中没有找到,说明这个细则需要添加
      const index = assess?.scores.find(scoreIt => scoreIt.id === ruleIt.id);
      if (!index) return ruleIt;
    });
    // 把细则表中新增的细则放到打分表的细则中
    if (addRuleScores.length > 0) {
      for (const ruleIt of addRuleScores) {
        assess.scores.push({
          id: ruleIt.id,
          auto: ruleIt.auto,
          name: ruleIt.name,
          detail: ruleIt.detail,
          metric: ruleIt.metric,
          operator: ruleIt.operator,
          value: ruleIt.value,
          score: null,
          total: ruleIt.score
        });
      }
    }
    // 把打分细则表中已经删除的细则删除
    if (delRuleScore.length > 0) {
      for (const ruleIt of delRuleScore) {
        const index = assess.scores.findIndex(
          scoreIt => scoreIt.id === ruleIt.id
        );
        if (index > -1) assess.scores.splice(index, 1);
      }
    }

    // 查找需要改分的细则
    const assessOneModel = assess?.scores.find(
      scoreIt => scoreIt.id === ruleId
    );
    // 因为上面补过,所以一定找的到
    assessOneModel.score = score;
    ruleScores = assess?.scores;
  }
  // 获取总分(分母)
  const scoreDenominator = ruleScores.reduce(
    (prev, curr) => Number(prev) + Number(curr?.total),
    0
  );

  // 获取得分(分子)
  const scoreNumerator = ruleScores.reduce(
    (prev, curr) => Number(prev) + Number(curr?.score),
    0
  );
  const rate = scoreDenominator > 0 ? scoreNumerator / scoreDenominator : 0;
  return {
    ruleScores,
    rate
  };
}

/**
 * 自动打分细则
 *
 * @param ruleModels 所有的细则
 * @param type 自动手动
 * @param assess, 打分表里的细则
 */
async function autoStaffAssess(ruleModels, type, assess: StaffAssessModel) {
  // 如果没有数据,说明是没有打过分,需要把细则都放到里面,然后打分
  if (!assess) {
    assess = {
      id: '',
      name: '',
      scores: ruleModels.map(ruleIt => {
        return {
          id: ruleIt.id,
          auto: ruleIt.auto,
          name: ruleIt.name,
          detail: ruleIt.detail,
          metric: ruleIt.metric,
          operator: ruleIt.operator,
          value: ruleIt.value,
          score: null,
          total: ruleIt.score
        };
      })
    };
  } else {
    // 如果有数据, 分为自动和手动两种情况
    if (type === 'automations') {
      // 如果有数据,先把手动打分的数据全部筛选出来,并且
      assess.scores = assess?.scores.filter(scoreIt => scoreIt.auto === false);

      // 排查细则有没有添加和删除的
      assess.scores = assess?.scores?.filter(scoreIt => {
        // 在得分细则表里遍历, 根据细则id在细则表里查询是否存在, 如果没找到,删除, 所以只要找到的, 并且是手动的
        const index = ruleModels.find(
          ruleIt => scoreIt.auto === false && ruleIt.id === scoreIt.id
        );
        if (index) return scoreIt;
      });

      // 需要添加的数据
      const addRuleScores = ruleModels.filter(ruleIt => {
        // 在细则表里遍历查找, 如果这个细则的id在得分细则表中没有找到,说明这个细则需要添加
        const index = assess?.scores.find(scoreIt => scoreIt.id === ruleIt.id);
        if (!index) return ruleIt;
      });
      // 把细则表中新增的细则放到打分表的细则中
      if (addRuleScores.length > 0) {
        for (const ruleIt of addRuleScores) {
          assess.scores.push({
            id: ruleIt.id,
            auto: ruleIt.auto,
            name: ruleIt.name,
            detail: ruleIt.detail,
            metric: ruleIt.metric,
            operator: ruleIt.operator,
            value: ruleIt.value,
            score: null,
            total: ruleIt.score
          });
        }
      }
    }
    // 手动的情况,如果有数据, 只需要把可能存在的需要添加的细则加上, 不需要坐其他操作(不改变原分)
    if (type === 'manual') {
      // 先把自动的筛选出来
      assess.scores = ruleModels.map(ruleIt => {
        const index = assess.scores.find(scoreIt => ruleIt.id === scoreIt.id);
        return {
          id: ruleIt.id,
          auto: ruleIt.auto,
          name: ruleIt.name,
          detail: ruleIt.detail,
          metric: ruleIt.metric,
          operator: ruleIt.operator,
          value: ruleIt.value,
          score: index ? index.score : null,
          total: ruleIt.score
        };
      });
    }
  }

  // 排查一波数字字段是否是纯数字和null
  assess.scores = assess.scores.map(it => {
    return {
      ...it,
      value: isNaN(Number(it.value)) ? null : it.value,
      total: isNaN(Number(it.total)) ? null : it.total,
      score: isNaN(Number(it.score)) ? null : it.score
    };
  });
  return {
    ruleScores: assess.scores
  };
}

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

export default class HisScore {
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

  //region 未开发代码
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
        await this.autoScoreStaff(month, staffIt?.id, id);
        log(`结束计算 ${staffIt.name} 打分`);
      } catch (e) {
        log(e);
      }
    }
  }

  //endregion

  // region 打分代码
  /**
   * 员工自动打分
   * @param month 月份
   * @param staff 员工id
   * @param hospital 机构id
   */
  @validate(
    should.date().required(),
    should.string().required(),
    should.string().required()
  )
  async autoScoreStaff(month, staff, hospital) {
    const mark = await getMark(hospital, dayjs(month).year());
    return await appDB.joinTx(async () => {
      // 先根据员工查询考核
      const mapping = await appDB.execute(
        `select staff, "check" from his_staff_check_mapping
        where staff = ?`,
        staff
      );
      if (mapping.length === 0) {
        log(`员工${staff}无考核`);
        return;
      }

      // 查询方案
      const checkSystemModels = await appDB.execute(
        `select  id, name, hospital from his_check_system where id = ?`,
        mapping[0].check
      );

      // 取出考核id
      const check = mapping[0]?.check;

      // 根据考核id查询考核细则
      const ruleModels = await appDB.execute(
        `select id, auto,  name, detail,
            metric, operator,
            value, score
          from his_check_rule
          where "check" = ?`,
        check
      );
      if (ruleModels.length === 0) {
        log(`考核${check}无细则`);
        return;
      }

      // 取出所有的自动打分的细则
      const autoRules = ruleModels.filter(it => it.auto);

      if (autoRules.length === 0) {
        log(`考核${check}无自动打分的细则`);
        return;
      }

      // 查询考核得分  只查询这个人这一天的细则得分, 过滤掉手动的
      let staffScores: {
        id: string;
        day: Date;
        assess: StaffAssessModel;
      } = (
        await appDB.execute(
          `
          select id, day, assess from his_staff_result
           where id = ? and day = ?
        `,
          staff,
          month
        )
      )[0];
      // 是添加还是修改
      let upsert = '';

      // 如果没有查到数据,或者查到数据了但是打分的字段为空,说明当天没有被打过分,需要先添加;
      if (!staffScores) {
        // 如果当天没有打过分, 先填充数据
        const assessModelObj = await autoStaffAssess(
          ruleModels,
          'automations',
          staffScores?.assess
        );

        staffScores = {
          // 员工id
          id: staff,
          day: month,
          assess: {
            id: checkSystemModels[0].id,
            name: checkSystemModels[0].name,
            scores: assessModelObj?.ruleScores,
            //质量系数
            rate: null
          }
        };
        // 是添加
        upsert = 'add';
      } else {
        upsert = 'update';
        // 如果查到数据,是重新打分,分为两种情况, 1: 打分字段有数据, 2: 打分字段无数据
        const assessModelObj = await autoStaffAssess(
          ruleModels,
          'automations',
          staffScores?.assess
        );

        staffScores = {
          // 员工id
          id: staff,
          day: month,
          assess: {
            id: checkSystemModels[0].id,
            name: checkSystemModels[0].name,
            scores: assessModelObj?.ruleScores,
            //质量系数
            rate: null
          }
        };
      }

      for (const ruleIt of autoRules) {
        // 如果查找到,是需要新增的数据
        const scoreIndex = staffScores?.assess?.scores.find(
          scoreIt => scoreIt.id === ruleIt.id
        );

        // 根据指标获取指标数据
        if (ruleIt.metric === MarkTagUsages.HIS00.code) {
          // 根据指标算法,计算得分 之 结果为"是"得满分
          if (ruleIt.operator === TagAlgorithmUsages.Y01.code && mark?.HIS00) {
            // 指标分数
            scoreIndex.score = ruleIt.score;
          }
          // 根据指标算法,计算得分 之 结果为"否"得满分
          if (ruleIt.operator === TagAlgorithmUsages.N01.code && !mark?.HIS00) {
            // 指标分数
            scoreIndex.score = ruleIt.score;
          }
          // “≥”时得满分，不足按比例得分
          if (ruleIt.operator === TagAlgorithmUsages.egt.code) {
            const rate = mark.HIS00 / ruleIt.value;
            // 指标分数
            scoreIndex.score = ruleIt.score * (rate > 1 ? 1 : rate);
          }
        }
      }

      // 获取总分(分母)
      const scoreDenominator = staffScores?.assess?.scores.reduce(
        (prev, curr) => Number(prev) + Number(curr?.total),
        0
      );

      // 获取得分(分子)
      const scoreNumerator = staffScores?.assess?.scores.reduce(
        (prev, curr) => Number(prev) + Number(curr?.score),
        0
      );
      staffScores.assess.rate =
        Number(scoreDenominator) > 0 ? scoreNumerator / scoreDenominator : 0;

      const nowDate = new Date();
      // 是添加
      if (upsert === 'add') {
        // 执行添加语句
        return await appDB.execute(
          `insert into
              his_staff_result(id, day, assess, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
          ...[
            staffScores.id,
            staffScores.day,
            JSON.stringify(staffScores.assess),
            nowDate,
            nowDate
          ]
        );
      } else {
        // 执行修改语句
        return await appDB.execute(
          `
            update his_staff_result
              set assess = ?,
                updated_at = ?
            where id = ? and day = ?`,
          JSON.stringify(staffScores.assess),
          nowDate,
          staffScores.id,
          staffScores.day
        );
      }
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

    // 时间转换为本月的当前时间或者之前学的最后一天
    const scoreDate = getEndTime(month);

    // 根据员工id查询出改员工是否有考核
    const staffSystem = await appDB.execute(
      `select staff, "check" from his_staff_check_mapping where staff = ?`,
      staff
    );
    if (staffSystem.length === 0) throw new KatoRuntimeError(`该员工无考核`);

    // 查询方案
    const checkSystemModels = await appDB.execute(
      `select  id, name, hospital from his_check_system where id = ?`,
      staffSystem[0].check
    );

    if (checkSystemModels.length === 0)
      throw new KatoRuntimeError(`考核方案不存在`);

    // 查询考核细则
    const ruleModels = await appDB.execute(
      `select id, name, detail, auto, "check",
            metric, operator, value, score
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

    // 查询今天是否有分值
    let todayScore: {
      id: string;
      day: Date;
      assess: StaffAssessModel;
    } = (
      await appDB.execute(
        `select id, day, assess
           from his_staff_result
           where id = ? and day = ?`,
        staff,
        scoreDate
      )
    )[0];
    const nowDate = new Date();

    // 如果没有查询到, 说明还没有打过分,需要添加
    if (!todayScore) {
      const assessModelObj = await staffAssess(
        ruleModels,
        ruleId,
        score,
        todayScore.assess
      );
      todayScore = {
        // 员工id
        id: staff,
        day: scoreDate,
        assess: {
          id: checkSystemModels[0].id,
          name: checkSystemModels[0].name,
          scores: assessModelObj?.ruleScores,
          //质量系数
          rate: assessModelObj?.rate
        }
      };
      // 执行添加语句
      return await appDB.execute(
        `insert into
              his_staff_result(id, day, assess, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
        ...[
          todayScore.id,
          todayScore.day,
          JSON.stringify(todayScore.assess),
          nowDate,
          nowDate
        ]
      );
    } else {
      // 如果存在,有两种情况, 1: 考核方案的没有数据(工分有数据), 2: 考核方案有数据
      const assessModelObj = await staffAssess(
        ruleModels,
        ruleId,
        score,
        todayScore.assess
      );

      // 如果考核方案没有数据
      todayScore.assess = {
        id: checkSystemModels[0].id,
        name: checkSystemModels[0].name,
        scores: assessModelObj?.ruleScores,
        //质量系数
        rate: assessModelObj?.rate
      };

      // 执行修改语句
      return await appDB.execute(
        `
            update his_staff_result
              set assess = ?,
                updated_at = ?
            where id = ? and day = ?`,
        JSON.stringify(todayScore.assess),
        nowDate,
        staff,
        scoreDate
      );
    }
  }
  // endregion

  /**
   * 自动手工打分 打前一天的手工分
   * @param month
   * @param staff
   * @constructor
   */
  @validate(
    should
      .date()
      .required()
      .description('时间'),
    should
      .string()
      .required()
      .description('考核员工id')
  )
  async autoManualScore(month, staff) {
    // 根据员工id查询出改员工是否有考核
    const staffSystem = await appDB.execute(
      `select staff, "check" from his_staff_check_mapping where staff = ?`,
      staff
    );
    if (staffSystem.length === 0) {
      log(`该员工无考核`);
      return;
    }

    // 根据员工id查询到的方案id查询方案
    const checkSystemModels = await appDB.execute(
      `select  id, name, hospital from his_check_system where id = ?`,
      staffSystem[0].check
    );

    if (checkSystemModels.length === 0) {
      log(`考核方案不存在`);
      return;
    }

    // 根据方案id查询考核细则
    const ruleModels = await appDB.execute(
      `select id, name, detail, auto, "check",
            metric, operator, value, score
           from his_check_rule
           where "check" = ?`,
      staffSystem[0].check
    );
    if (ruleModels.length === 0) {
      log(`考核方案没有细则`);
      return;
    }

    // 查询今天是否有分值
    let todayScore: {
      id: string;
      day: Date;
      assess: StaffAssessModel;
    } = (
      await appDB.execute(
        `select id, day, assess
           from his_staff_result
           where id = ? and day = ?`,
        staff,
        month
      )
    )[0];

    // 昨天的时间
    const yesterday = dayjs(month)
      .subtract(1, 'day')
      .toDate();
    // 查询昨天的分数
    const yesterdayScores: {
      id: string;
      day: Date;
      assess: StaffAssessModel;
    } = (
      await appDB.execute(
        `select id, day, assess
           from his_staff_result
           where id = ? and day = ?`,
        staff,
        yesterday
      )
    )[0];
    // 找出所有的昨天的手动打分
    const yesterdayAssess =
      yesterdayScores?.assess?.scores?.filter(
        yesterdayIt => yesterdayIt.auto === false
      ) ?? [];

    // 当前时间
    const nowDate = new Date();
    let upsert = '';
    // 如果没有查询到, 说明还没有打过分,需要添加
    if (!todayScore) {
      const assessModelObj = await autoStaffAssess(
        ruleModels,
        'manual',
        todayScore?.assess
      );
      // 如果昨天的数据存在, 把昨天的手工分放到今天的手工分钟
      if (yesterdayAssess.length > 0) {
        for (const yesterdayIt of yesterdayAssess) {
          const index = assessModelObj?.ruleScores?.find(
            todayIt => todayIt.id === yesterdayIt.id
          );
          // 如果找到, 把昨天的分放到今天的数组中
          if (index) index.score = yesterdayIt.score;
        }
      }

      todayScore = {
        // 员工id
        id: staff,
        day: month,
        assess: {
          id: checkSystemModels[0].id,
          name: checkSystemModels[0].name,
          scores: assessModelObj?.ruleScores,
          //质量系数
          rate: null
        }
      };
      upsert = 'add';
    } else {
      // 如果存在,有两种情况, 1: 考核方案的没有数据(工分有数据), 2: 考核方案有数据
      const assessModelObj = await autoStaffAssess(
        ruleModels,
        'manual',
        todayScore?.assess
      );

      // 如果考核方案没有数据
      todayScore.assess = {
        id: checkSystemModels[0].id,
        name: checkSystemModels[0].name,
        scores: assessModelObj?.ruleScores,
        //质量系数
        rate: null
      };
      upsert = 'update';
    }

    // 获取总分(分母)
    const scoreDenominator = todayScore?.assess?.scores.reduce(
      (prev, curr) => Number(prev) + Number(curr?.total),
      0
    );

    // 获取得分(分子)
    const scoreNumerator = todayScore?.assess?.scores.reduce(
      (prev, curr) => Number(prev) + Number(curr?.score),
      0
    );
    todayScore.assess.rate =
      Number(scoreDenominator) > 0 ? scoreNumerator / scoreDenominator : 0;

    if (upsert === 'add') {
      // 执行添加语句
      return await appDB.execute(
        `insert into
              his_staff_result(id, day, assess, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
        ...[
          todayScore.id,
          todayScore.day,
          JSON.stringify(todayScore.assess),
          nowDate,
          nowDate
        ]
      );
    } else {
      // 执行修改语句
      return await appDB.execute(
        `
            update his_staff_result
              set assess = ?,
                updated_at = ?
            where id = ? and day = ?`,
        JSON.stringify(todayScore.assess),
        nowDate,
        staff,
        month
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
    //整理days
    const {start} = monthToRange(month);
    const end = getEndTime(month);
    const days = [];
    for (let i = 0; i <= dayjs(end).diff(start, 'd'); i++) {
      days.push(
        dayjs(start)
          .add(i, 'd')
          .toDate()
      );
    }
    //计算工分
    for (const staff of staffs) {
      log(`开始计算 ${staff.name} 工分`);
      await Promise.all(days.map(day => this.scoreStaff(staff.id, day)));
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
        param.source,
        start,
        end
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
   * @param id 员工id
   * @param day 日期
   */
  async scoreStaff(id, day) {
    await appDB.joinTx(async () => {
      const {start, end} = dayToRange(day);
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
        id,
        start,
        end
      );
      //本人的工分项目得分列表
      const self = scoreDetails
        .filter(it => it.staff === id)
        .map(it => ({
          id: it.item,
          name: it.item_name,
          score: it.score
        }));
      //本人的工分来源列表
      const staffs = scoreDetails.reduce((result, current) => {
        //过滤掉本人
        if (current.staff === id) return result;
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
      let resultModel: StaffWorkModel = (
        await appDB.execute(
          `
            select work
            from his_staff_result
            where id = ?
              and day = ? for update
          `,
          id,
          day
        )
      )[0]?.work;
      if (!resultModel) {
        resultModel = {
          self: [],
          staffs: []
        };
      }
      resultModel.self = self;
      resultModel.staffs = staffs;
      const resultValue = JSON.stringify(resultModel);
      await appDB.execute(
        //language=PostgreSQL
        `
          insert into his_staff_result(id, day, work)
          values (?, ?, ?)
          on conflict (id, day)
            do update set work       = ?,
                          updated_at = now()
        `,
        id,
        day,
        resultValue,
        resultValue
      );
    });
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
