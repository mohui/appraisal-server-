import HisStaff from './staff';
import {appDB} from '../../app';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {
  dateValid,
  dayToRange,
  getHospital,
  getSettle,
  monthToRange
} from './service';
import Decimal from 'decimal.js';
import {getStaffExtraScore} from './common';
import {HisSetting} from '../../../common/his';

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
               inner join staff_area_mapping areaMapping on staff.id = areaMapping.staff
        where areaMapping.area = ?
          and result.time >= ?
          and result.time < ?
          and staff.status = true
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
    const hospital = await getHospital();
    return Promise.all(
      (
        await appDB.execute(
          // language=PostgreSQL
          `
            select staff.id,
                   staff.name,
                   areaMapping.area
            from staff
                   left join staff_area_mapping areaMapping on staff.id = areaMapping.staff
            where areaMapping.area = ?
              and staff.status = true
            order by staff.created_at
          `,
          hospital
        )
      ).map(async it => {
        const result = await staffApi.findWorkScoreList(it.id, month, hospital);
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

  /**
   * 报表
   *
   * 员工工分项得分结果对象添加动态属性(key: 工分项/工分项分类id, value: 相应的汇总得分)
   * 并且, 未分类的工分项, 默认分配一个({id: '其他(未分类)', name: '其他(未分类)'})工分项分类
   *
   * 工分项数组根据创建时间排序, 工分项分类根据排序权重排序
   * @param month 考核月份
   * @returns {
   *   // 报表工分项相关列
   *   cols: [{
   *     id: 工分项分类id
   *     name: 工分项分类名称
   *     children: [{
   *       id: 工分项id
   *       name: 工分项名称
   *     }]
   *   }],
   *   // 报表工分项数据
   *   data: [{
   *     id: 员工id,
   *     name: 员工名称,
   *     deptId: 科室id,
   *     deptName: 科室名称,
   *     rate?: 质量系数
   *     extra?: 附加分
   *     items?: [{  工分项得分
   *       id: 工分项id
   *       name: 工分项名称
   *       typeId: 工分项分类id
   *       typeName: 工分项分类名称
   *       score?: 得分(校正前得分)
   *       order: 排序权重
   *     }],
   *     day: 打分时间,
   *     [工分项/工分项分类id]: 得分
   *   }]
   * }
   *
   */
  @validate(should.date().required())
  async report(month) {
    const staffApi = new HisStaff();
    const hospital = await getHospital();
    // 根据机构id查询员工
    // language=PostgreSQL
    const staffs: {
      id: string;
      name: string;
      deptId?: string;
      deptName?: string;
    }[] = await appDB.execute(
      `
        select staff.id, staff.name, dept.id "deptId", dept.name "deptName"
        from staff
               inner join staff_area_mapping areaMapping on staff.id = areaMapping.staff
               left join his_department dept on areaMapping.department = dept.id
        where areaMapping.area = ?
          and staff.status = true
      `,
      hospital
    );
    const array = await Promise.all(
      staffs.map(async staffIt => {
        const workScoreList = await staffApi.findWorkScoreList(
          staffIt.id,
          month,
          hospital
        );
        const score = await getStaffExtraScore(staffIt.id, hospital, month);
        return {
          extra: score,
          id: staffIt.id,
          name: staffIt.name,
          deptId: staffIt.deptId,
          deptName: staffIt.deptName,
          ...workScoreList
        };
      })
    );
    const now = new Date();
    return {
      cols: array
        .reduce(
          (
            result: {
              id: string;
              name: string;
              order?: number;
              children: {id: string; name: string; created_at?: Date}[];
            }[],
            current
          ) => {
            for (const item of current.items) {
              // 分类id和name赋默认值
              item.typeId = item?.typeId ?? '其他(未分类)';
              item.typeName = item?.typeName ?? '其他(未分类)';
              // 匹配分类
              const category = result.find(it => it.id === item.typeId);
              if (category) {
                const record = category.children.find(it => it.id === item.id);
                if (!record) {
                  category.children.push({
                    id: item.id,
                    name: item.name,
                    created_at: item.created_at
                  });
                }
              } else {
                result.push({
                  order: item.order,
                  id: item.typeId,
                  name: item.typeName,
                  children: [
                    {id: item.id, name: item.name, created_at: item.created_at}
                  ]
                });
              }
            }

            return result;
          },
          []
        )
        // 工分项数组根据创建时间排序
        .map(it => ({
          ...it,
          children: it.children.sort(
            (a, b) =>
              (a.created_at || now).getTime() - (b.created_at || now).getTime()
          )
        }))
        // 工分项分类根据排序权重排序
        .sort(
          (a, b) =>
            (a.order || Number.MAX_VALUE) - (b.order || Number.MAX_VALUE)
        ),
      data: array.map(it => {
        const items = it.items.reduce((result, current) => {
          result[current.typeId] =
            (result[current.typeId] || 0) + current.score;
          result[current.id] = current.score;
          return result;
        }, {});

        return {
          ...it,
          ...items
        };
      })
    };
  }

  /**
   * 医疗绩效功能配置
   */
  @validate(
    should.string().only(Object.values(HisSetting)),
    should.bool().required()
  )
  async upsertHisSetting(code, enabled) {
    const hospital = await getHospital();
    await appDB.execute(
      //language=PostgreSQL
      `
        insert into his_setting(hospital, code, enabled)
        values (?, ?, ?)
        on conflict (hospital, code)
          do update set enabled    = ?,
                        updated_at = now()
      `,
      hospital,
      code,
      enabled,
      enabled
    );
  }

  /**
   * 查看医疗绩效功能配置
   *
   * @return {
   *   his功能枚举: true(开启)/false(不开启)
   * }
   */
  async selectHisSetting() {
    const hospital = await getHospital();

    // 查询医疗绩效功能配置明细
    const hisSettingModel = (
      await appDB.execute(
        //language=PostgreSQL
        `
          select code, enabled
          from his_setting
          where hospital = ?
        `,
        hospital
      )
    ).reduce((result, current) => {
      result[current.code] = current.enabled;
      return result;
    }, {});
    for (const key of Object.values(HisSetting)) {
      hisSettingModel[key] = hisSettingModel[key] ?? true;
    }

    return hisSettingModel;
  }
}
