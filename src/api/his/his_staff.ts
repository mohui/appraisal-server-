import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {Context} from '../context';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {sql as sqlRender} from '../../database/template';
import {monthToRange} from './manual';

export async function getHospital() {
  if (
    Context.current.user.hospitals &&
    Context.current.user.hospitals.length > 1
  )
    throw new KatoRuntimeError(`没有查询his员工权限`);

  return Context.current.user.hospitals[0]['id'];
}

export default class HisStaff {
  /**
   * 查询his员工
   */
  async listHisStaffs() {
    const hospital = await getHospital();

    const hisStaffs = await originalDB.execute(
      `select id, name, hospital from his_staff where hospital = ?`,
      hospital
    );
    const staffs = await appDB.execute(
      `select staff from staff where hospital = ?`,
      hospital
    );
    return hisStaffs.map(it => {
      const index = staffs.find(item => it.id === item.staff);
      return {
        ...it,
        usable: !index
      };
    });
  }

  /**
   * 获取员工基本信息
   *
   * @param id 员工id
   * @return {
   *   id: 员工id
   *   name: 员工姓名
   *   sex?: 员工性别
   *   phone?: 员工联系方式
   *   birth? 员工出生日期
   * }
   */
  async get(id) {
    //查询员工
    // language=PostgreSQL
    const staffModel: {id: string; name: string; staff: string} = (
      await appDB.execute(
        `
          select id, name, staff
          from staff
          where id = ?
        `,
        id
      )
    )[0];
    if (!staffModel) throw new KatoRuntimeError(`该员工不存在`);
    //查询his信息
    // language=PostgreSQL
    const hisModel = (
      await originalDB.execute(
        `
          select d.name as sex, phone, birth
          from his_staff s
                 left join his_dict d on s.sex = d.code and d.category_code = '10101001'
          where id = ?
        `,
        staffModel.staff
      )
    )[0];
    return {
      ...staffModel,
      sex: hisModel.sex,
      phone: hisModel.phone,
      birth: hisModel.birth
    };
  }

  /**
   * 添加员工
   *
   * @param staff
   * @param account
   * @param password
   * @param name
   */
  @validate(
    should
      .string()
      .allow(null)
      .description('绑定his员工id'),
    should
      .string()
      .required()
      .description('登录名'),
    should
      .string()
      .required()
      .description('密码'),
    should
      .string()
      .required()
      .description('名称')
  )
  async add(staff, account, password, name) {
    const hospital = await getHospital();
    if (staff) {
      // 查询his员工是否已经被绑定
      const accountOne = await appDB.execute(
        `select * from staff where staff = ?`,
        staff
      );
      if (accountOne.length > 0) throw new KatoRuntimeError(`his员工已经存在`);
    } else {
      staff = null;
    }
    return await appDB.execute(
      `insert into
            staff(
              id,
              hospital,
              staff,
              account,
              password,
              name,
              created_at,
              updated_at
              )
            values(?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(),
      hospital,
      staff,
      account,
      password,
      name,
      dayjs().toDate(),
      dayjs().toDate()
    );
  }

  @validate(
    should
      .string()
      .required()
      .description('主键'),
    should
      .string()
      .required()
      .description('名称'),
    should
      .string()
      .required()
      .description('密码')
  )
  /**
   * 修改员工信息
   */
  async update(id, name, password) {
    return await appDB.execute(
      `
        update staff set
          name = ?,
          password = ?,
          updated_at = ?
        where id = ?`,
      name,
      password,
      dayjs().toDate(),
      id
    );
  }

  /**
   * 删除员工信息
   */
  @validate(
    should
      .string()
      .required()
      .description('主键')
  )
  async delete(id) {
    // 先查询是否绑定过
    const itemMapping = await appDB.execute(
      `select * from his_staff_work_item_mapping where staff = ?`,
      id
    );
    if (itemMapping.length > 0) throw new KatoRuntimeError(`员工已绑定工分项`);

    const staffWorkSource = await appDB.execute(
      `select * from his_staff_work_source where staff = ? or ? = ANY(sources)`,
      id,
      id
    );
    if (staffWorkSource.length > 0) throw new KatoRuntimeError(`员工添加考核`);

    return await appDB.execute(
      `
        delete from staff where id = ?`,
      id
    );
  }

  /**
   * 员工列表
   */
  @validate(
    should
      .string()
      .allow(null)
      .description('账号'),
    should
      .string()
      .allow(null)
      .description('用户名')
  )
  async list(account, name) {
    const hospital = await getHospital();
    // 用户名查询模糊查询
    if (account) account = `%${account}%`;
    if (name) name = `%${name}%`;

    const [sql, params] = sqlRender(
      `
        select id, hospital, staff, account, password, name, created_at, updated_at
        from staff
        where hospital = {{? hospital}}
        {{#if account}}
            AND account like {{? account}}
        {{/if}}
        {{#if name}}
            AND name like {{? name}}
        {{/if}}
      `,
      {
        hospital,
        account,
        name
      }
    );
    const staffList = await appDB.execute(sql, ...params);
    const hisStaffs = await originalDB.execute(
      `select id, name from his_staff where hospital = ?`,
      hospital
    );
    return staffList.map(it => {
      const index = hisStaffs.find(item => it.staff === item.id);
      if (index) {
        return {
          ...it,
          staffName: index.name
        };
      } else {
        return {
          ...it,
          staffName: ''
        };
      }
    });
  }

  /**
   * 员工绑定
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .array()
      .items({
        source: should
          .array()
          .required()
          .description('关联员工id'),
        rate: should
          .number()
          .required()
          .description('权重系数')
      })
      .required()
      .description('关联员工[]')
  )
  async addHisStaffWorkSource(staff, sourceRate) {
    return appDB.transaction(async () => {
      // 添加员工关联
      for (const it of sourceRate) {
        await appDB.execute(
          ` insert into
              his_staff_work_source(id, staff, sources, rate, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?)`,
          uuid(),
          staff,
          `{${it.source.map(item => `"${item}"`).join()}}`,
          it.rate,
          dayjs().toDate(),
          dayjs().toDate()
        );
      }
    });
  }

  /**
   * 删除员工绑定
   */
  async delHisStaffWorkSource(id) {
    return await appDB.execute(
      `
        delete from his_staff_work_source where id = ?`,
      id
    );
  }

  /**
   * 修改考核员工
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .array()
      .required()
      .description('关联员工[]')
  )
  async updateHisStaffWorkSource(id, sources, rate) {
    return appDB.transaction(async () => {
      await appDB.execute(
        ` update his_staff_work_source
                set
                sources = ?,
                rate = ?,
                updated_at = ?
              where id = ?`,
        `{${sources.map(item => `"${item}"`).join()}}`,
        rate,
        dayjs().toDate(),
        id
      );
    });
  }

  /**
   * 查询员工绑定
   */
  async selHisStaffWorkSource() {
    const hospital = await getHospital();
    const list = await appDB.execute(
      `
        select
          source.id
          ,source.staff
          ,source.sources
          ,source.rate
          ,staff.name "staffName"
        from his_staff_work_source source
        left join staff on source.staff = staff.id
        where staff.hospital = ?
        order by source.created_at desc`,
      hospital
    );

    const staffList = await appDB.execute(
      `select id, name from staff where hospital = ?`,
      hospital
    );
    const staffListObj = {};

    for (const it of staffList) {
      staffListObj[it.id] = it.name;
    }

    return list.map(it => {
      const sourcesName = it.sources.map(item => {
        return staffListObj[item];
      });
      return {
        ...it,
        sourcesName: sourcesName
      };
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('考核员工id')
  )
  // 根据id获取员工绑定
  async searchHisStaffWorkSource(staff) {
    const hospital = await getHospital();
    const list = await appDB.execute(
      `
        select
          source.id
          ,source.staff
          ,source.sources
          ,source.rate
          ,staff.name "staffName"
        from his_staff_work_source source
        left join staff on source.staff = staff.id
        where staff.hospital = ? and source.staff = ?
        `,
      hospital,
      staff
    );

    const staffList = await appDB.execute(
      `select id, name from staff where hospital = ?`,
      hospital
    );
    const staffListObj = {};

    for (const it of staffList) {
      staffListObj[it.id] = it.name;
    }

    return list.map(it => {
      const sourcesName = it.sources.map(item => {
        return {
          id: item,
          name: staffListObj[item]
        };
      });
      return {
        ...it,
        sources: sourcesName
      };
    });
  }

  /**
   * 获取指定月份员工工分项目得分列表
   *
   * @param id 员工id
   * @param month 月份
   * @return {
   *   items: 工分项目列表 [
   *     {
   *       id: 工分项目id
   *       name: 工分项目名称
   *       score: 得分
   *     }
   *   ],
   *   rate?: 质量系数
   * }
   */
  @validate(should.string().required(), should.date().required())
  async findWorkScoreList(
    id,
    month
  ): Promise<{
    items: {id: string; name: string; score: number}[];
    rate?: number;
  }> {
    const {start, end} = monthToRange(month);
    //获取工分列表
    // language=PostgreSQL
    const items = await appDB.execute(
      `
        select d.item as id, max(wi.name) as name, sum(s.rate * d.score) as score
        from his_staff_work_score_detail d
               inner join (
          select unnest(sources) as staff, rate
          from his_staff_work_source
          where staff = ?
        ) as s on d.staff = s.staff
               inner join his_work_item wi on d.item = wi.id
               inner join his_staff_work_item_mapping swm on swm.item = d.item and swm.staff = ?
        where d.date >= ?
          and d.date < ?
        group by d.item
      `,
      id,
      id,
      start,
      end
    );
    //绑定工分项目
    // language=PostgreSQL
    const workItems = await appDB.execute(
      `
        select w.id, w.name, m.score
        from his_staff_work_item_mapping m
               inner join his_work_item w on m.item = w.id
        where staff = ?
      `,
      id
    );
    //获取质量系数
    const rate = await this.getRate(id, month);
    return {
      items: workItems.map(it => ({
        ...it,
        score: items.find(item => item.id === it.id)?.score ?? 0
      })),
      rate
    };
  }

  /**
   * 获取指定月份员工工分项目的每日得分列表
   *
   * @param id 员工id
   * @param month 月份
   * @return [
   *   day: 日期,
   *   items: 工分项目列表 [
   *     {
   *       id: 工分项目id
   *       name: 工分项目名称
   *       score: 得分
   *     }
   *   ],
   *   rate?: 质量系数
   * ]
   */
  @validate(should.string().required(), should.date().required())
  async findWorkScoreDailyList(id, month) {
    //工分员工来源
    // language=PostgreSQL
    const sources: {staff: string; rate: number}[] = await appDB.execute(
      `
        select unnest(sources) as staff, rate
        from his_staff_work_source
        where staff = ?
      `,
      id
    );
    //绑定工分项目
    // language=PostgreSQL
    const workItems = await appDB.execute(
      `
        select w.id, w.name, m.score
        from his_staff_work_item_mapping m
               inner join his_work_item w on m.item = w.id
        where staff = ?
      `,
      id
    );

    const {start, end} = monthToRange(month);
    // 查询工分值
    // language=PostgreSQL
    const scoreList: {
      id: string;
      name: string;
      staff: string;
      day: Date;
      score: number;
    }[] = await appDB.execute(
      `
        select d.item                    as id,
               max(wi.name)              as name,
               max(d.staff)              as staff,
               date_trunc('day', d.date) as day,
               sum(d.score)              as score
        from his_staff_work_score_detail d
               inner join his_work_item wi on d.item = wi.id
               inner join his_staff_work_item_mapping swm on swm.item = d.item
        where d.date >= ?
          and d.date < ?
          and d.staff in (${sources.map(() => '?')})
          and swm.staff = ?
        group by day, d.item, d.staff
      `,
      start,
      end,
      ...sources.map(it => it.staff),
      id
    );
    //定义返回值
    const result: {
      day: Date;
      items: {id: string; name: string; score: number}[];
      rate?: number;
    }[] = [];
    //当前月份的天数
    const days = dayjs(end).diff(start, 'd');
    //占坑
    for (let i = 0; i < days; i++) {
      result.push({
        day: dayjs(start)
          .add(i, 'd')
          .toDate(),
        items: workItems.map(it => ({
          ...it,
          score: 0
        })),
        rate: null
      });
    }
    return result;
  }

  /**
   * 获取指定日期的质量系数
   *
   * @param id 员工id
   * @param day 日期
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .date()
      .required()
      .description('指定的日期')
  )
  async getRateByDay(id, day) {
    day = dayjs(day).startOf('d');
    // 获取质量系数列表
    const list = await this.getRateList(id, day);
    if (list.length === 0) return null;
    // 查找当天的质量系数
    const item = list.find(it => dayjs(it.day).diff(day, 'day') === 0);
    if (item) return item?.rate;
    return null;
  }

  /**
   * 获取指定月份的质量系数(查询月份有记录最后一天的质量系数)
   *
   * @param id 员工id
   * @param month 月份
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .date()
      .required()
      .description('指定的月份')
  )
  async getRate(id, month) {
    const list = await this.getRateList(id, month);
    if (list.length === 0) return null;
    return list.pop()?.rate;
  }

  /**
   * 获取指定月份的质量系数列表
   *
   * @param id 员工id
   * @param month 月份
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .date()
      .required()
      .description('指定的月份')
  )
  async getRateList(id, month): Promise<{rate: number; day: Date}[]> {
    const {start, end} = monthToRange(month);
    // 先根据员工查询考核
    const mapping = await appDB.execute(
      `select staff, "check" from his_staff_check_mapping
        where staff = ?`,
      id
    );
    if (mapping.length === 0) return [];
    // 取出考核id
    const check = mapping[0]?.check;

    // 根据考核id查询细则分数
    const rules = await appDB.execute(
      `select id, name, metric, score, auto
          from his_check_rule
          where "check" = ?`,
      check
    );
    const ruleId = rules.map(it => it.id);

    // 查询指定日期的得分
    const staffScores = await appDB.execute(
      `select date, sum(score) score
            from his_rule_staff_score
            where staff = ?
              and date >= ? and date < ?
              and rule in (${ruleId.map(() => '?')})
            group by date`,
      id,
      start,
      end,
      ...ruleId
    );

    if (staffScores.length === 0) return [];
    // 得出总分
    const totalScore = rules.reduce(
      (prev, curr) => Number(prev) + Number(curr.score),
      0
    );

    return staffScores.map(it => {
      return {
        day: dayjs(it.date).toDate(),
        rate: totalScore ? it.score / totalScore : 0
      };
    });
  }

  /**
   *
   * @param staff
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id')
  )
  async staffCheck(staff) {
    const checks = await appDB.execute(
      `select "check" "checkId",  staff from his_staff_check_mapping where staff = ?`,
      staff
    );
    if (checks.length === 0) throw new KatoRuntimeError(`该员工没有考核方案`);
    const checkId = checks[0]?.checkId;

    const hisSystems = await appDB.execute(
      `select id, name
            from his_check_system
            where id = ?`,
      checkId
    );
    if (hisSystems.length === 0) throw new KatoRuntimeError(`方案不存在`);
    const hisRules = await appDB.execute(
      `select * from his_check_rule
              where "check" = ?
        `,
      checkId
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

  /**
   * 手动打分
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
      .number()
      .required()
      .description('分值')
  )
  async setScore(ruleId, staff, score) {
    // 查询考核细则
    const rules = await appDB.execute(
      `select id, auto, "check", score
            from his_check_rule where id = ?`,
      ruleId
    );
    if (rules.length === 0) throw new KatoRuntimeError(`无此考核细则`);
    // 自动打分的不能手动打分
    if (rules[0].auto === true)
      throw new KatoRuntimeError(`此考核细则不能手动打分`);

    const staffSystem = await appDB.execute(
      `select staff, "check" from his_staff_check_mapping where staff = ?`,
      staff
    );
    if (staffSystem.length === 0) throw new KatoRuntimeError(`该员工无考核`);

    if (rules[0].check !== staffSystem[0].check)
      throw new KatoRuntimeError(`考核员工考核项目和细则考核项目不一致`);

    if (rules[0].score < score)
      throw new KatoRuntimeError(`分数不能高于细则的满分`);
    const now = new Date();

    // 查询今天是否有分值
    const todayScore = await appDB.execute(
      `select *
            from his_rule_staff_score
            where rule = ? and staff = ? and date = ?`,
      ruleId,
      staff,
      now
    );
    // 如果查找到,执行修改,没有查到到:添加
    if (todayScore.length === 0) {
      await appDB.execute(
        `insert into
              his_rule_staff_score(rule, staff, date, score, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?)`,
        ...[ruleId, staff, now, score, now, now]
      );
    }
    return await appDB.execute(
      `update his_rule_staff_score
            set score = ?, updated_at = ?
            where rule = ? and staff = ? and date = ?`,
      score,
      now,
      ruleId,
      staff,
      now
    );
  }
}
