import HisStaff from './staff';
import {appDB} from '../../app';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {
  dateValid,
  dayToRange,
  getHospital,
  getSettle,
  monthToRange,
  StaffWorkModel
} from './service';
import Decimal from 'decimal.js';
import {Context} from '../context';
import {UserType} from '../middleware/user';

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

    // 获取所传月份的开始时间 即所在月份的一月一号
    const monthTime = monthToRange(month);
    // 当天的开始时间和结束时间,前闭后开
    const {start, end} = dayToRange(monthTime.start);
    //查询员工工分结果
    // language=PostgreSQL
    const rows: {
      item_id: string;
      item_name: string;
      type_id: string;
      type_name: string;
      score: number;
    }[] = await appDB.execute(
      `
        select result.item_id,
               result.item_name,
               result.type_id,
               result.type_name,
               result.score
        from his_staff_work_result result
               inner join staff on result.staff_id = staff.id
          and staff.hospital = ?
        where result.time >= ?
          and result.time < ?
      `,
      hospital,
      start,
      end
    );
    //定义返回值
    const result: {
      id: string;
      name: string;
      typeId: string;
      typeName: string;
      score: number;
    }[] = [];
    //填充得分的工分项
    for (const row of rows) {
      const obj = result.find(it => it.id === row.item_id);
      if (obj) {
        obj.score += row.score;
      } else {
        result.push({
          id: row.item_id,
          name: row.item_name,
          typeId: row.type_id,
          typeName: row.type_name,
          score: row.score
        });
      }
    }
    //填充未得分的工分项
    // language=PostgreSQL
    const workItemModels: {
      id: string;
      name: string;
      item_type: string;
      type_type_name: string;
    }[] = await appDB.execute(
      `
        select item.id, item.name, item.item_type, type.name type_type_name
        from his_work_item item
               left join his_work_item_type type on item.item_type = type.id
        where item.hospital = ?`,
      hospital
    );
    for (const model of workItemModels) {
      const obj = result.find(it => it.id === model.id);
      if (!obj)
        result.push({
          id: model.id,
          name: model.name,
          typeId: model.item_type,
          typeName: model.type_type_name,
          score: 0
        });
    }
    return result;
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
    let hospital;
    if (Context.req.headers?.type === UserType.STAFF) {
      hospital = Context.current.user?.hospital;
    } else {
      hospital = await getHospital();
    }
    return Promise.all(
      (
        await appDB.execute(
          // language=PostgreSQL
          `
            select id, name
            from staff
            where hospital = ?
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

  // 机构详情
  @validate(should.date().required())
  async report(month) {
    const staffApi = new HisStaff();
    const hospital = await getHospital();
    // 根据机构id查询员工
    // language=PostgreSQL
    const staffs = await appDB.execute(
      `
        select staff.id, staff.name, dept.id "deptId", dept.name "deptName"
        from staff
               left join his_department dept on staff.department = dept.id
        where staff.hospital = ?
      `,
      hospital
    );

    const staffList = [];
    for (const staffIt of staffs) {
      const workScoreList = await staffApi.findWorkScoreList(staffIt.id, month);
      const gets = await staffApi.get(staffIt.id, month);
      staffList.push({
        extra: gets?.extra,
        id: staffIt.id,
        name: staffIt.name,
        deptId: staffIt.deptId,
        deptName: staffIt.deptName,
        ...workScoreList
      });
    }
    return staffList;
  }
}
