import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {sql as sqlRender} from '../../database/template';
import {Gender, Education, HisStaffDeptType} from '../../../common/his';
import {
  dateValid,
  getHospital,
  getSettle,
  monthToRange,
  dayToRange
} from './service';

// 质量系数
type AssessModel = {
  id?: string;
  staffId: string;
  time: Date;
  systemId: string;
  systemName: string;
  ruleId: string;
  ruleName: string;
  score: number;
  // 满分
  total: number;
};

export default class HisStaff {
  // region 员工的增删改查新版

  /**
   * 员工绑定关系的修改
   * @param params {
   *   id: 员工id,
   *   phStaff: 公卫员工id,
   *   hisStaff: his员工id
   *   hospital: 机构id
   * }
   */
  @validate(
    should
      .object({
        id: should.string().required(),
        hospital: should.string().required(),
        phStaffs: should.array(),
        hisStaffs: should.array()
      })
      .required()
  )
  async updateStaffMapping(params) {
    // 取出所有的变量
    const {id, hospital, phStaffs, hisStaffs} = params;
    // 机构下的所有公卫员工
    const phStaffModels = await originalDB.execute(
      // language=PostgreSQL
      `
        select id, name username, states
        from ph_user
        where hospital = ?
      `,
      hospital
    );
    // 所有的公卫员工id
    const phStaffIds = phStaffModels.map(it => it.id);
    // 机构下的所有his员工
    const hisStaffModels = await originalDB.execute(
      // language=PostgreSQL
      `
        select id, name, hospital
        from his_staff
        where hospital = ?
      `,
      hospital
    );
    // 所有的his员工id
    const hisStaffIds = hisStaffModels.map(it => it.id);

    return appDB.transaction(async () => {
      if (hisStaffIds.length > 0) {
        // 先删除关联的his员工
        await appDB.execute(
          // language=PostgreSQL
          `
            delete
            from staff_his_mapping
            where staff = ?
              and his_staff in (${hisStaffIds.map(() => '?')})
          `,
          id,
          ...hisStaffIds
        );
      }

      if (phStaffIds.length > 0) {
        // 先删除关联的公卫员工
        await appDB.execute(
          // language=PostgreSQL
          `
            delete
            from staff_ph_mapping
            where staff = ?
              and ph_staff in (${phStaffIds.map(() => '?')})
          `,
          id,
          ...phStaffIds
        );
      }

      // 修改员工和his员工关联表
      if (hisStaffs.length > 0) {
        // 添加员工和his员工关联表
        for (const hisIt of hisStaffs) {
          await appDB.execute(
            // language=PostgreSQL
            `
              insert into staff_his_mapping(id, staff, his_staff)
              values (?, ?, ?)
            `,
            uuid(),
            id,
            hisIt
          );
        }
      }

      // 修改员工和公卫员工关联表
      if (phStaffs.length > 0) {
        for (const phIt of phStaffs) {
          // 修改员工和公卫员工关联表
          await appDB.execute(
            // language=PostgreSQL
            `
              insert into staff_ph_mapping(id, staff, ph_staff)
              values (?, ?, ?)
              on conflict (staff,ph_staff)
                do update set updated_at = now()
            `,
            uuid(),
            id,
            phIt
          );
        }
      }
    });
  }

  /**
   * 添加员工和机构绑定表
   *
   * @param params {
   *   id: 员工id,
   *   area: 地区编码,
   *   department: 科室
   * }
   */
  @validate(
    should
      .array()
      .items({
        id: should.string().required(),
        hospital: should.string().required(),
        department: should.string().allow(null)
      })
      .min(1)
      .required()
  )
  async addAreaMapping(params) {
    // 取出变量
    return appDB.transaction(async () => {
      for (const it of params) {
        await appDB.execute(
          // language=PostgreSQL
          `
            insert into staff_area_mapping(id, staff, area, department)
            values (?, ?, ?, ?)
          `,
          uuid(),
          it.id,
          it.hospital,
          it.department
        );
      }
    });
  }

  /**
   * 注册员工
   *
   * @param params {
   *   name 名称
   *   password 密码
   *   major 专业类别
   *   staff his员工
   *   remark 备注
   *   department 科室
   *   phStaff 公卫员工
   *   phone 联系电话
   *   gender 性别
   *   title 职称名称
   *   education 学历
   *   isGP 是否为全科医师
   * }
   */
  @validate(
    should
      .object({
        account: should.string().required(),
        name: should.string().required(),
        password: should.string().required(),
        isGP: should.boolean().required(),
        education: should
          .string()
          .only(
            Education.COLLEGE,
            Education.BACHELOR,
            Education.MASTER,
            Education.DOCTOR
          )
          .required(),
        gender: should
          .string()
          .only(Gender[0], Gender[1], Gender[2], Gender[3])
          .required(),
        major: should.string().allow(null),
        remark: should.string().allow(null),
        phone: should.string().allow(null),
        title: should.string().allow(null)
      })
      .required()
  )
  async register(params) {
    const {
      account,
      name,
      password,
      isGP,
      education,
      gender,
      major,
      remark,
      phone,
      title
    } = params;
    // 添加之前先排查账号是否已经存在
    const findAccounts = await appDB.execute(
      // language=PostgreSQL
      `
        select account
        from staff
        where account = ?
      `,
      account
    );
    if (findAccounts.length > 0) throw new KatoRuntimeError(`账号已经存在`);

    return await appDB.execute(
      // language=PostgreSQL
      `
        insert into staff(id,
                          account,
                          password,
                          name,
                          remark,
                          phone,
                          gender,
                          major,
                          title,
                          education,
                          "isGP")
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      uuid(),
      account,
      password,
      name,
      remark,
      phone,
      gender,
      major,
      title,
      education,
      isGP
    );
  }

  /**
   * 非本机构员工列表
   */
  async staffList() {
    const hospital = await getHospital();
    // 获取非本机构的员工
    return appDB.execute(
      // language=PostgreSQL
      `
        select id,
               hospital,
               account,
               password,
               name,
               remark,
               department,
               phone,
               gender,
               major,
               title,
               education,
               "isGP",
               created_at,
               updated_at
        from staff
        where COALESCE(hospital, '') != ?
      `,
      hospital
    );
  }

  // endregion

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
   * 查询公卫员工
   */
  async listPhStaffs() {
    const hospital = await getHospital();

    // 根据绑定关系查询公卫机构下的所有员工
    // language=PostgreSQL
    const sysUserList = await originalDB.execute(
      `
        select id, name username, states
        from ph_user
        where hospital = ?
      `,
      hospital
    );

    const staffs = await appDB.execute(
      `select ph_staff "phStaff" from staff where hospital = ?`,
      hospital
    );
    return sysUserList.map(it => {
      const index = staffs.find(item => it.id === item.phStaff);
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
          where s.id = ?
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
   * @param remark 备注
   * @param department 科室
   * @param phStaff 公卫员工
   * @param phone 联系电话
   * @param gender 性别
   * @param major 专业类别
   * @param title 职称名称
   * @param education 学历
   * @param isGP 是否为全科医师
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
      .string()
      .allow(null)
      .description('备注'),
    should
      .string()
      .allow(null)
      .description('科室'),
    should.string().allow(null),
    should.string().allow(null),
    should
      .string()
      .only(Gender[0], Gender[1], Gender[2], Gender[3])
      .required(),
    should.string().allow(null),
    should.string().allow(null),
    should
      .string()
      .only(
        Education.COLLEGE,
        Education.BACHELOR,
        Education.MASTER,
        Education.DOCTOR
      )
      .required()
      .description('学历'),
    should.boolean().required()
  )
  async add(
    staff,
    account,
    password,
    name,
    remark,
    department,
    phStaff,
    phone,
    gender,
    major,
    title,
    education,
    isGP
  ) {
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
    // 校验公卫员工
    if (phStaff) {
      // 查询his员工是否已经被绑定
      const phStaffOne = await appDB.execute(
        `select * from staff where ph_staff = ?`,
        phStaff
      );
      if (phStaffOne.length > 0) throw new KatoRuntimeError(`his员工已经存在`);
    } else {
      phStaff = null;
    }

    return appDB.transaction(async () => {
      const staffId = uuid();
      // language=PostgreSQL
      return await appDB.execute(
        `
          insert into staff(id,
                            hospital,
                            staff,
                            ph_staff,
                            account,
                            password,
                            name,
                            remark,
                            department,
                            phone,
                            gender,
                            major,
                            title,
                            education,
                            "isGP",
                            created_at,
                            updated_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        staffId,
        hospital,
        staff,
        phStaff,
        account,
        password,
        name,
        remark,
        department,
        phone,
        gender,
        major,
        title,
        education,
        isGP,
        dayjs().toDate(),
        dayjs().toDate()
      );
    });
  }

  /**
   * 修改员工信息
   *
   * @param params {
   *   id 主键
   *   name 名称
   *   password 密码
   *   major 专业类别
   *   staff his员工
   *   remark 备注
   *   department 科室
   *   phStaff 公卫员工
   *   phone 联系电话
   *   gender 性别
   *   title 职称名称
   *   education 学历
   *   isGP 是否为全科医师
   * }
   */
  @validate(
    should
      .object({
        id: should.required(),
        name: should.required(),
        password: should.required(),
        isGP: should.boolean().required(),
        education: should
          .string()
          .only(
            Education.COLLEGE,
            Education.BACHELOR,
            Education.MASTER,
            Education.DOCTOR
          )
          .required(),
        major: should.string().allow(null),
        remark: should.string().allow(null),
        department: should.string().allow(null),
        phone: should.string().allow(null),
        gender: should
          .string()
          .only(Gender[0], Gender[1], Gender[2], Gender[3])
          .required(),
        title: should.string().allow(null)
      })
      .required()
  )
  async update(params) {
    const {
      id,
      name,
      password,
      isGP,
      education,
      major,
      remark,
      department,
      phone,
      gender,
      title
    } = params;
    // language=PostgreSQL
    return await appDB.execute(
      `
        update staff
        set name       = ?,
            password   = ?,
            remark     = ?,
            department = ?,
            phone      = ?,
            gender     = ?,
            major      = ?,
            title      = ?,
            education  = ?,
            "isGP"     = ?,
            updated_at = ?
        where id = ?`,
      name,
      password,
      remark,
      department,
      phone,
      gender,
      major,
      title,
      education,
      isGP,
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
      // language=PostgreSQL
      `
        select *
        from his_staff_work_item_mapping
        where staff = ?
      `,
      id
    );
    if (itemMapping.length > 0) throw new KatoRuntimeError(`员工已绑定工分项`);

    // 查询员工是否绑定过方案
    const checkMapping = await appDB.execute(
      // language=PostgreSQL
      `
        select *
        from his_staff_check_mapping
        where staff = ?
      `,
      id
    );
    if (checkMapping.length > 0) throw new KatoRuntimeError(`员工已绑定方案`);

    return appDB.transaction(async () => {
      // 删除员工和地区关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_area_mapping
          where staff = ?`,
        id
      );

      // 删除员工和公卫员工关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_ph_mapping
          where staff = ?`,
        id
      );

      // 删除员工和his员工关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_his_mapping
          where staff = ?`,
        id
      );

      // 删除员工主表
      return await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff
          where id = ?`,
        id
      );
    });
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
          ph_staff "phStaff",
          account,
          password,
          name,
          remark,
          department,
          phone,
          gender,
          major,
          title,
          education,
          "isGP",
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

    // 根据绑定关系查询公卫机构下的所有员工
    // language=PostgreSQL
    const sysUserList = await originalDB.execute(
      `
        select id, name username
        from ph_user
        where hospital = ?
      `,
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
      // 公卫员工
      const phStaffIndex = sysUserList.find(item => it.phStaff === item.id);
      return {
        ...it,
        staffName: index?.name ?? '',
        departmentName: deptIndex?.name ?? '',
        phStaffName: phStaffIndex?.username ?? ''
      };
    });
  }

  async staffTree() {
    const hospital = await getHospital();
    // 获取可选择的员工列表
    const staffList = await appDB.execute(
      `select staff.id, staff.name, staff.department, dept.name "deptName"
            from staff
            left join his_department dept on staff.department = dept.id
            where staff.hospital = ?`,
      hospital
    );

    const trees = [];
    staffList.forEach(it => {
      if (it.department) {
        const index = trees.find(deptId => deptId.value === it.department);
        if (index) {
          index.children.push({
            value: it.id,
            label: it.name,
            type: `${HisStaffDeptType.Staff}`,
            parent: it.department
          });
        } else {
          trees.push({
            value: it.department,
            label: it.deptName ?? '',
            type: `${HisStaffDeptType.DEPT}`,
            parent: null,
            children: [
              {
                value: it.id,
                label: it.name,
                type: `${HisStaffDeptType.Staff}`,
                parent: it.department
              }
            ]
          });
        }
      } else {
        trees.push({
          value: it.id,
          label: it.name,
          type: `${HisStaffDeptType.Staff}`,
          parent: null
        });
      }
    });
    return trees;
  }

  // endregion

  // region 员工工分
  /**
   * 获取指定月份员工工分列表
   *
   * 员工无考核,质量系数返回null
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
    day: Date;
    items: {id: string; name: string; score: number}[];
    rate?: number;
  }> {
    // 获取所传月份的开始时间 即所在月份的一月一号
    const monthTime = monthToRange(month);
    // 当天的开始时间和结束时间
    const {start, end} = dayToRange(monthTime.start);

    // 工分只存储在一号那一天,所以只查询一号
    // language=PostgreSQL
    const workItems: {
      id: string;
      name: string;
      typeId: string;
      typeName: string;
      order: number;
      score: number;
    }[] = await appDB.execute(
      `
        select result.item_id   "id",
               result.item_name "name",
               result.type_id   "typeId",
               result.type_name "typeName",
               result."order",
               result.score
        from his_staff_work_result result
        where result.staff_id = ?
          and result.time >= ?
          and result.time < ?
      `,
      id,
      start,
      end
    );

    // 查询质量系数
    // language=PostgreSQL
    const assessResultModel: AssessModel[] = await appDB.execute(
      `select id,
                staff_id    "staffId",
                time,
                system_id   "systemId",
                system_name "systemName",
                rule_id     "ruleId",
                rule_name   "ruleName",
                score,
                total
         from his_staff_assess_result
         where staff_id = ?
           and time >= ?
           and time < ?`,
      id,
      start,
      end
    );

    // 获取总分(分母)
    const scoreDenominator = assessResultModel.reduce(
      (prev, curr) => Number(prev) + Number(curr?.total),
      0
    );

    // 获取得分(分子)
    const scoreNumerator = assessResultModel.reduce(
      (prev, curr) => Number(prev) + Number(curr?.score),
      0
    );

    // 质量系数
    let rate = null;
    // 如果员工有考核,打分结果查询大于0,算出质量系数
    if (assessResultModel.length > 0) {
      rate =
        Number(scoreDenominator) > 0 ? scoreNumerator / scoreDenominator : 0;
    }

    return {
      day: start,
      rate: rate,
      items: workItems
    };
  }

  // endregion

  // region 员工考核详情之质量系数详情
  /**
   * 员工考核详情之质量系数详情
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
    const checkRuleModels = await appDB.execute(
      `select * from his_check_rule
              where "check" = ?
        `,
      checkId
    );
    if (checkRuleModels.length === 0)
      throw new KatoRuntimeError(`方案细则不存在`);

    // 获取所传月份的开始时间 即所在月份的一月一号零点零分零秒
    const monthTime = monthToRange(month);
    // 当天的开始时间和结束时间
    const {start, end} = dayToRange(monthTime.start);
    // 开始之前先查询此员工本月是否打过分
    // language=PostgreSQL
    const assessResultModel: AssessModel[] = await appDB.execute(
      `select id,
                staff_id    "staffId",
                time,
                system_id   "systemId",
                system_name "systemName",
                rule_id     "ruleId",
                rule_name   "ruleName",
                score,
                total
         from his_staff_assess_result
         where staff_id = ?
           and time >= ?
           and time < ?`,
      staff,
      start,
      end
    );

    // 把分值放到细则中
    const newHisRules = checkRuleModels.map(it => {
      const scoreIndex = assessResultModel.find(
        scoreIt => it.id === scoreIt.ruleId
      );
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
