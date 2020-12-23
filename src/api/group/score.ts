import * as dayjs from 'dayjs';
import {appDB} from '../../app';
import {KatoRuntimeError} from 'kato-server';

export default class Score {
  /**
   * 系统打分
   *
   * @param group 考核对象
   * @param year 年份
   */
  async score(group, year) {
    return appDB.transaction(async () => {
      // 判断group是否合法, 并上锁
      // language=PostgreSQL
      const groups = await appDB.execute(
        `
          select *
          from area
          where code = ? for update`,
        group
      );
      if (groups.length != 1) throw new KatoRuntimeError(`${group}不合法`);
      // 默认年份为当前年, 如果是1月1日, 则为上一年
      if (!year) {
        const now = dayjs();
        if (now.day() === 1 && now.month() === 1) {
          year = now
            .subtract(1, 'y')
            .year()
            .toString();
        } else {
          year = dayjs()
            .year()
            .toString();
        }
      }
      // 查询考核对象对应的考核体系的考核小项
      // language=PostgreSQL
      const parentRules: {id: string}[] = await appDB.execute(
        `
          select cr.rule_id as id
          from check_area cg
                 inner join check_system cs on cs.check_id = cg.check_system -- 关联考核体系
                 inner join check_rule cr on cg.check_system = cr.check_id -- 关联考核细则
          where cr.parent_rule_id is null
            and cs.check_year = ?
            and cg.area = ?`,
        year,
        group
      );
      // 根据考核小项, 进行打分
      for (const parentRule of parentRules) {
        // 根据考核小项查询考核细则
        // language=PostgreSQL
        const rules: {id: string}[] = await appDB.execute(
          `
            select rule_id as id
            from check_rule
            where parent_rule_id = ?`,
          parentRule.id
        );
        for (const rule of rules) {
          // 根据考核细则查询关联关系
          // language=PostgreSQL
          const formulas: {
            tag: string;
            algorithm: string;
            baseline: number;
            score: number;
            attachStartDate?: Date;
            attachEndDate?: Date;
          }[] = await appDB.execute(
            `
              select tag,
                     algorithm,
                     baseline,
                     score,
                     attach_start_date as attachStartDate,
                     attach_end_date   as attachEndDate
              from rule_tag
              where rule = ?`,
            rule.id
          );
          // 根据关联关系计算得分
          for (const formula of formulas) {
            console.log(formula);
          }
        }
      }
    });
  }
}
