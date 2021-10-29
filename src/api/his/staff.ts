import {appDB, originalDB} from '../../app';
import {v4 as uuid} from 'uuid';
import * as dayjs from 'dayjs';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {sql as sqlRender} from '../../database/template';
import {
  Gender,
  Education,
  HisStaffDeptType,
  HisWorkMethod
} from '../../../common/his';
import {
  dateValid,
  getEndTime,
  getHospital,
  getSettle,
  monthToRange,
  dayToRange,
  StaffAssessModel,
  StaffWorkModel
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
      `select id, name username, states from ph_user where hospital = ?`,
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
        `insert into
            staff(
              id,
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
              updated_at
              )
            values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
   * @param id 主键
   * @param name 名称
   * @param password 密码
   * @param staff his员工
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
      .string()
      .allow(null)
      .description('备注'),
    should
      .string()
      .allow(null)
      .description('科室'),
    should
      .string()
      .allow(null)
      .description('公卫员工'),
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
  async update(
    id,
    name,
    password,
    staff,
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
    // language=PostgreSQL
    return await appDB.execute(
      `
        update staff set
          name = ?,
          password = ?,
          staff = ?,
          ph_staff = ?,
          remark = ?,
          department = ?,
          phone = ?,
          gender = ?,
          major = ?,
          title = ?,
          education = ?,
          "isGP" = ?,
          updated_at = ?
        where id = ?`,
      name,
      password,
      staff,
      phStaff,
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
      `select * from his_staff_work_item_mapping where staff = ?`,
      id
    );
    if (itemMapping.length > 0) throw new KatoRuntimeError(`员工已绑定工分项`);

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
      `select id, name username from ph_user where hospital = ?`,
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
    const rate =
      Number(scoreDenominator) > 0 ? scoreNumerator / scoreDenominator : 0;

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
