import HisStaff from './staff';
import {appDB} from '../../app';
import {KatoRuntimeError, validate} from 'kato-server';
import {dateValid, getHospital, getSettle, monthToRange} from './service';
import Decimal from 'decimal.js';

/**
 * 机构模块
 */
export default class HisHospital {
  /**
   * 结算指定月份
   *
   * @param month 月份
   */
  @validate(dateValid)
  async settle(month) {
    const hospital = await getHospital();
    const {start} = monthToRange(month);
    await appDB.execute(
      //language=PostgreSQL
      `
        insert into his_hospital_settle(hospital, month, settle)
        values (?, ?, true)
        on conflict (hospital, month)
          do update set settle     = true,
                        updated_at = now()
      `,
      hospital,
      start
    );
  }

  /**
   * 机构考核结果概览
   *
   * @param month 月份
   * @return {
   *   id: 机构id
   *   name: 机构名称
   *   settle: 是否结算
   *   date: 考核时间
   *   originalScore: 校正前工分
   *   correctScore: 校正后工分
   * }
   */
  @validate(dateValid)
  async overview(month) {
    const hospital = await getHospital();
    //查询机构
    // language=PostgreSQL
    const hospitalModel: {id: string; name: string} = (
      await appDB.execute(
        `
          select code as id, name
          from area
          where code = ?
        `,
        hospital
      )
    )[0];
    if (!hospitalModel) throw new KatoRuntimeError(`该机构不存在`);
    //查询是否结算
    const settle = await getSettle(hospital, month);
    //查询员工工分结果
    const staffs = await this.findStaffCheckList(month);
    //累计工分
    const scores = staffs.reduce(
      (result, current) => {
        //校正前工分
        result.originalScore += current.score;
        //校正后工分
        if (current.rate && current.score) {
          result.correctScore = new Decimal(current.score)
            .mul(current.rate)
            .toNumber();
        }
        return result;
      },
      {originalScore: 0, correctScore: 0}
    );
    return {
      id: hospitalModel.id,
      name: hospitalModel.name,
      settle: settle,
      date: month,
      ...scores
    };
  }

  /**
   * 工分项目列表
   *
   * @param month 月份
   * @return {
   *   id: 工分项目id
   *   name: 工分项目名称
   *   score: 工分项目分数(校正前)
   * }
   */
  @validate(dateValid)
  async findWorkScoreList(month) {
    const hospital = await getHospital();
    const {start, end} = monthToRange(month);
    return await appDB.execute(
      // language=PostgreSQL
      `
        select m.item as id, max(wi.name) as name, sum(d.score) as score
        from his_staff_work_item_mapping m
               inner join his_work_item wi on m.item = wi.id
               inner join staff s on m.staff = s.id and s.hospital = ?
               left join his_staff_work_score_detail d on d.item = m.item and d.date >= ? and d.date < ?
        group by m.item
      `,
      hospital,
      start,
      end
    );
  }

  /**
   * 员工考核结果列表
   *
   * @param month 月份
   * @return [
   *   {
   *     id: 员工id
   *     name: 姓名
   *     score: 校正前工分值
   *     rate?: 质量系数
   *   }
   * ]
   */
  @validate(dateValid)
  async findStaffCheckList(
    month
  ): Promise<{id: string; name: string; score: number; rate: number}[]> {
    const staffApi = new HisStaff();
    const hospital = await getHospital();
    return Promise.all(
      (
        await appDB.execute(
          // language=PostgreSQL
          `
            select id, name
            from staff
            where hospital = ?
            and virtual = false
            order by created_at
          `,
          hospital
        )
      ).map(async it => {
        const result = await staffApi.findWorkScoreList(it.id, month);
        return {
          ...it,
          rate: result.rate,
          score: result.items.reduce((result, current) => {
            if (current.score) {
              result = new Decimal(result).add(current.score).toNumber();
            }
            return result;
          }, 0)
        };
      })
    );
  }
}
