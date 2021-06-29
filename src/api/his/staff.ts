import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {sql as sqlRender} from '../../database/template';
import {HisWorkScoreType} from '../../../common/his';
import {
  dateValid,
  getEndTime,
  getHospital,
  getSettle,
  monthToRange,
  StaffAssessModel,
  StaffWorkModel
} from './service';

export default class HisStaff {
  // region 员工的增删改查
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
   * @param month 月份
   * @return {
   *   id: 员工id
   *   name: 员工姓名
   *   sex?: 员工性别
   *   phone?: 员工联系方式
   *   birth?: 员工出生日期
   *   extra?: 附加分
   *   settle: 结算状态
   * }
   */
  @validate(should.string().required(), dateValid)
  async get(id, month) {
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
    //查询附加分
    const {start} = monthToRange(month);
    // language=PostgreSQL
    const score = (
      await appDB.execute(
        `
          select score
          from his_staff_extra_score
          where staff = ?
            and month = ?
        `,
        id,
        start
      )
    )[0]?.score;
    //查询结算状态
    const hospital = await getHospital();
    const settle = await getSettle(hospital, start);
    return {
      ...staffModel,
      sex: hisModel?.sex ?? null,
      phone: hisModel?.phone ?? null,
      birth: hisModel?.birth ?? null,
      extra: score ?? null,
      settle
    };
  }

  /**
   * 添加员工
   *
   * @param staff
   * @param account
   * @param password
   * @param name
   * @param virtual 是否是虚拟账户
   * @param remark 备注
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
      .description('名称'),
    should
      .bool()
      .required()
      .description('是否是虚拟账户'),
    should
      .string()
      .allow(null)
      .description('备注'),
    should
      .string()
      .allow(null)
      .description('科室')
  )
  async add(staff, account, password, name, virtual, remark, department) {
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
    return appDB.transaction(async () => {
      const staffId = uuid();
      await appDB.execute(
        `insert into
            staff(
              id,
              hospital,
              staff,
              account,
              password,
              name,
              virtual,
              remark,
              department,
              created_at,
              updated_at
              )
            values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        staffId,
        hospital,
        staff,
        account,
        password,
        name,
        virtual,
        remark,
        department,
        dayjs().toDate(),
        dayjs().toDate()
      );

      return await appDB.execute(
        ` insert into
              his_staff_work_source(id, staff, sources, rate, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?)`,
        uuid(),
        staffId,
        `{${staffId}}`,
        1,
        dayjs().toDate(),
        dayjs().toDate()
      );
    });
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
      .description('密码'),
    should
      .string()
      .allow(null)
      .description('his员工'),
    should
      .bool()
      .required()
      .description('是否是虚拟账户'),
    should
      .string()
      .allow(null)
      .description('备注'),
    should
      .string()
      .allow(null)
      .description('科室')
  )
  /**
   * 修改员工信息
   */
  async update(id, name, password, staff, virtual, remark, department) {
    // 如果his员工不为空,判断该his员工是否绑定过员工,如果绑定过不让再绑了
    if (staff) {
      const selStaff = await appDB.execute(
        `select * from staff where id != ? and staff = ?`,
        id,
        staff
      );
      if (selStaff.length > 0)
        throw new KatoRuntimeError(`该his用户已绑定过员工`);
    }
    return await appDB.execute(
      `
        update staff set
          name = ?,
          password = ?,
          staff = ?,
          virtual = ?,
          remark = ?,
          department = ?,
          updated_at = ?
        where id = ?`,
      name,
      password,
      staff,
      virtual,
      remark,
      department,
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
    // 先查询是否绑定过工分项
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
    if (staffWorkSource.length > 0)
      throw new KatoRuntimeError(`员工绑定过工分来源`);

    // 查询员工是否绑定过方案
    const checkMapping = await appDB.execute(
      `select * from his_staff_check_mapping where staff = ?`,
      id
    );
    if (checkMapping.length > 0) throw new KatoRuntimeError(`员工已绑定方案`);

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
        select
          id,
          hospital,
          staff,
          account,
          password,
          name,
          virtual,
          remark,
          department,
          created_at,
          updated_at
        from staff
        where hospital = {{? hospital}}
        {{#if account}}
            AND account like {{? account}}
        {{/if}}
        {{#if name}}
            AND name like {{? name}}
        {{/if}}
        order by created_at
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

    const dept = await appDB.execute(
      `
        select id, hospital, name, created_at
        from his_department
        where hospital = ?
        order by created_at
      `,
      hospital
    );
    return staffList.map(it => {
      const index = hisStaffs.find(item => it.staff === item.id);
      const deptIndex = dept.find(item => item.id === it.department);
      return {
        ...it,
        staffName: index?.name ?? '',
        departmentName: deptIndex?.name ?? ''
      };
    });
  }

  /**
   * 员工关联员工列表
   */
  async workSourceStaffList() {
    const hospital = await getHospital();

    const workSourceStaffs = await appDB.execute(
      `select distinct staff from  his_staff_work_source`
    );
    // 获取可选择的员工列表
    const staffList = await appDB.execute(
      `select id, account, name, remark
            from staff
            where hospital = ?`,
      hospital
    );

    return staffList.map(it => {
      const index = workSourceStaffs.find(item => it.id === item.staff);
      return {
        ...it,
        usable: !index
      };
    });
  }

  // endregion

  // region 员工绑定的增删改查
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
          .description('权重系数'),
        avg: should
          .boolean()
          .required()
          .description('是否平均分配')
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
              his_staff_work_source(id, staff, sources, rate, avg, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?)`,
          uuid(),
          staff,
          `{${it.source.map(item => `"${item}"`).join()}}`,
          it.rate,
          it.avg,
          dayjs().toDate(),
          dayjs().toDate()
        );
      }
    });
  }

  /**
   * 根据id删除员工绑定
   */
  async delWorkSourceById(id) {
    // language=PostgreSQL
    return await appDB.execute(
      `
        delete
        from his_staff_work_source
        where id = ?
      `,
      id
    );
  }

  /**
   * 根据考核员工id删除员工绑定
   */
  async delWorkSources(staff) {
    // language=PostgreSQL
    return await appDB.execute(
      `
        delete
        from his_staff_work_source
        where staff = ?
      `,
      staff
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
      .description('关联员工[]'),
    should
      .number()
      .required()
      .description('权重系数'),
    should
      .boolean()
      .required()
      .description('是否平均分配')
  )
  async updateHisStaffWorkSource(id, sources, rate, avg) {
    return appDB.transaction(async () => {
      await appDB.execute(
        ` update his_staff_work_source
                set
                sources = ?,
                rate = ?,
                avg = ?,
                updated_at = ?
              where id = ?`,
        `{${sources.map(item => `"${item}"`).join()}}`,
        rate,
        avg,
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
          ,source.avg
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
          ,source.avg
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

  // endregion

  // region 员工工分
  /**
   * 获取指定月份员工工分列表
   *
   * @param id 员工id
   * @param month 月份
   * @return {
   *   items: 工分项目列表 [
   *     {
   *       id: id
   *       name: 名称
   *       score?: 得分
   *       type: 工分项目/员工
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
    items: {id: string; name: string; score: number; type: string}[];
    rate?: number;
  }> {
    const rows: {
      day: Date;
      items: {
        id: string;
        name: string;
        score: number;
        type: string;
      }[];
      rate?: number;
    }[] = await this.findWorkScoreDailyList(id, month);

    return rows.reduce(
      (result, current) => {
        result.day = current.day;
        result.rate = current.rate;

        //累加items
        for (const item of result.items) {
          const currentItem = current.items.find(it => it.id === item.id);
          if (currentItem) {
            item.score += currentItem.score;
          }
        }
        for (const item of current.items) {
          const currentItem = result.items.find(it => it.id === item.id);
          if (!currentItem) {
            result.items.push(item);
          }
        }

        return result;
      },
      {
        day: month,
        rate: null,
        items: []
      }
    );
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
  async findWorkScoreDailyList(
    id,
    month
  ): Promise<
    {
      day: Date;
      items: {
        id: string;
        name: string;
        score: number;
        type: string;
      }[];
      rate?: number;
    }[]
  > {
    const {start} = monthToRange(month);
    const end = getEndTime(month);
    const rows: {
      day: Date;
      work: StaffWorkModel;
      assess: StaffAssessModel;
    }[] = await appDB.execute(
      // language=PostgreSQL
      `
        select work, assess, day
        from his_staff_result
        where id = ?
          and day >= ?
          and day <= ?
        order by day
      `,
      id,
      start,
      end
    );
    return rows.map(it => ({
      day: dayjs(it.day).toDate(),
      items: [
        ...(it?.work?.self ?? []).map(item => ({
          ...item,
          type: HisWorkScoreType.WORK_ITEM
        })),
        ...(it?.work?.staffs ?? []).map(item => ({
          ...item,
          type: HisWorkScoreType.STAFF
        }))
      ],
      rate: it?.assess?.rate ?? null
    }));
  }

  // endregion

  // region 员工考核详情
  /**
   * 员工考核详情
   * @param staff 考核员工
   * @param month 时间
   */
  @validate(
    should
      .string()
      .required()
      .description('考核员工id'),
    should
      .date()
      .required()
      .description('时间')
  )
  async staffCheck(staff, month) {
    // 查询员工和方案绑定
    const checks = await appDB.execute(
      `select "check" "checkId",  staff from his_staff_check_mapping where staff = ?`,
      staff
    );
    if (checks.length === 0) throw new KatoRuntimeError(`该员工没有考核方案`);
    const checkId = checks[0]?.checkId;

    // 查询方案是否存在
    const hisSystems = await appDB.execute(
      `select id, name
            from his_check_system
            where id = ?`,
      checkId
    );
    if (hisSystems.length === 0) throw new KatoRuntimeError(`方案不存在`);

    // 根据方案查询细则
    const hisRules = await appDB.execute(
      `select * from his_check_rule
              where "check" = ?
        `,
      checkId
    );
    if (hisRules.length === 0) throw new KatoRuntimeError(`方案细则不存在`);
    // const ruleIds = hisRules.map(it => it.id);

    // 根据时间,员工,细则查询得分
    const scoreDate = getEndTime(month);
    const staffResults = await appDB.execute(
      `select id, day, assess
            from his_staff_result
            where id = ?
             and day = ?
        `,
      staff,
      scoreDate
    );
    const ruleScores = staffResults[0]?.assess?.scores ?? [];

    // 把分值放到细则中
    const newHisRules = hisRules.map(it => {
      const scoreIndex = ruleScores.find(item => it.id === item.id);
      return {
        ...it,
        staffScore: scoreIndex ? scoreIndex.score : null
      };
    });
    const automations = newHisRules.filter(it => it.auto);
    const manuals = newHisRules.filter(it => !it.auto);

    return {
      id: hisSystems[0]?.id,
      name: hisSystems[0]?.name,
      automations,
      manuals
    };
  }
  // endregion
}
