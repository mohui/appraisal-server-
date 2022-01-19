import * as config from 'config';
import * as dayjs from 'dayjs';
import {OpUnitType} from 'dayjs';
import {
  KatoCommonError,
  KatoRuntimeError,
  KatoLogicError,
  should,
  validate
} from 'kato-server';
import {v4 as uuid} from 'uuid';
import {appDB, originalDB} from '../../app';
import {Education, Gender} from '../../../common/his';
import {Context} from '../context';
import HisHospital from '../his/hospital';
import HisStaff from '../his/staff';
import SystemArea from '../group/system_area';
import Decimal from 'decimal.js';
import {documentTagList} from '../../../common/person-tag';
import * as SMSClient from '@alicloud/sms-sdk';

/**
 * 短信配置
 */
const smsConfig = config.get<{
  key: string; //短信key
  secret: string; //短信secret
  enabled: boolean; //是否启用
  limit: number; //每日限额
  sign: string; //短信签名
  template: string; //短信模板
  expired: {value: number; unit: OpUnitType}; //过期策略
}>('sms');

/**
 * 短信服务客户端
 */
const sms = new SMSClient({
  accessKeyId: smsConfig.key,
  secretAccessKey: smsConfig.secret
});

/**
 * 发送短信
 *
 * @param phone 手机号码
 * @param code 验证码
 */
async function send(phone: string, code: string) {
  const res: {Code: string; message: string} = await sms.sendSMS({
    PhoneNumbers: phone,
    SignName: smsConfig.sign,
    TemplateCode: smsConfig.template,
    TemplateParam: JSON.stringify({code})
  });
  if (res.Code != 'OK') {
    throw new Error(res.message);
  }
}

/**
 * 手机号码参数校验
 */
const phoneValidate = should
  .string()
  .regex(/^1\d{10}$/)
  .required();

/**
 * 密码校验
 */
const passwordValidate = should
  .string()
  .min(8)
  .max(12)
  .required();

/**
 * 验证码用途枚举
 */
enum CodeUsage {
  Register = '用户注册',
  UpdatePhone = '更换手机',
  ResetPassword = '重置密码'
}

/**
 * 短信数据库模型
 */
type SMSCodeDBModel = {
  phone: string;
  usage: CodeUsage;
  code: string;
  counts: number;
  created_at: Date;
  updated_at: Date;
};

/**
 * 校验手机号是否已经被注册
 *
 * @param phone 手机号
 * @return bool
 */
async function validPhone(phone): Promise<boolean> {
  //language=PostgreSQL
  const userModels = await appDB.execute(
    `
      select 1
      from staff
      where phone = ?
    `,
    phone
  );
  return userModels.length === 0;
}

/**
 * 校验验证码是否正确
 *
 * @param code 验证码
 * @param phone 手机号
 * @param usage 验证码用途
 */
async function smsVerification(code, phone, usage) {
  //region 校验验证码
  const codeModel: SMSCodeDBModel = (
    await appDB.execute(
      //language=PostgreSQL
      `
        select phone, usage, code, created_at, updated_at
        from sms_code
        where phone = ?
          and usage = ?
          and code = ?
          for update
      `,
      phone,
      usage,
      code
    )
  )[0];
  //code是否正确
  if (!codeModel) throw new KatoLogicError('验证码错误', 10004);
  //检验是否过期
  if (
    dayjs()
      .subtract(smsConfig.expired.value, smsConfig.expired.unit)
      .isAfter(codeModel.created_at)
  )
    throw new KatoLogicError('验证码已过期', 10004);
  //检验验证码是否失效
  if (codeModel.created_at.getTime() != codeModel.updated_at.getTime())
    throw new KatoLogicError('验证码已失效', 10004);
  //验证码校验通过, 更新updated_at字段, 表示验证码已失效
  await appDB.execute(
    //language=PostgreSQL
    `
      update sms_code
      set updated_at = now()
      where phone = ?
        and usage = ?
    `,
    codeModel.phone,
    codeModel.usage
  );
  //endregion
}

/**
 * 注销机构校验
 *
 * @param id 员工id
 * @param hospital 员工所属机构
 */
async function checkoutStaff(id, hospital) {
  // 先查询是否绑定过工分项
  const itemMappings: {
    id: string;
    staff: string;
    hospital: string;
  }[] = await appDB.execute(
    // language=PostgreSQL
    `
      select mapping.id, mapping.staff, item.hospital
      from his_staff_work_item_mapping mapping
             left join his_work_item item on mapping.item = item.id
      where mapping.staff = ?
    `,
    id
  );
  // 判断有没有传机构, 如果没有传机构, 校验员工, 如果有机构id,只校验员工此机构的
  if (hospital) {
    const staffItemFind = itemMappings.find(it => it.hospital === hospital);
    if (staffItemFind) throw new KatoCommonError(`员工在此机构已绑定工分项`);
  } else {
    if (itemMappings.length > 0) throw new KatoCommonError(`员工已绑定工分项`);
  }

  // 查询员工是否绑定过方案
  const checkMappings: {
    staff: string;
    check: string;
    hospital: string;
  }[] = await appDB.execute(
    // language=PostgreSQL
    `
      select checkMapping.staff, checkMapping."check", system.hospital
      from his_staff_check_mapping checkMapping
             inner join his_check_system system on checkMapping."check" = system.id
      where staff = ?
    `,
    id
  );

  // 判断有没有传机构, 如果没有传机构, 校验员工, 如果有机构id,只校验员工此机构的
  if (hospital) {
    const staffSystemFind = checkMappings.find(it => it.hospital === hospital);
    if (staffSystemFind) throw new KatoCommonError(`员工在此机构已绑定方案`);
  } else {
    if (checkMappings.length > 0) throw new KatoCommonError(`员工已绑定方案`);
  }
}

/**
 * App用户模块
 */
export default class AppUser {
  /**
   * 校验手机号码是否可用
   *
   * @param phone 手机号码
   * @return 是否可用
   */
  @validate(phoneValidate)
  async validPhone(phone): Promise<boolean> {
    return await validPhone(phone);
  }

  /**
   * 验证码短信发送
   *
   * @param phone 手机号码
   * @param usage 用途
   * @return {
   *   code: 验证码
   *   counts: 今日次数
   * }?
   */
  @validate(
    phoneValidate,
    should
      .string()
      .only(Object.values(CodeUsage))
      .required()
  )
  async sendSMS(phone, usage) {
    return appDB.transaction(async () => {
      const usable = await validPhone(phone);
      // 如果是用户注册 和 更换手机
      if (usage === CodeUsage.Register || usage === CodeUsage.UpdatePhone) {
        if (!usable) {
          throw new KatoLogicError('该手机号码已被注册', 10002);
        }
      }
      // 如果是重置密码
      if (usage === CodeUsage.ResetPassword && usable) {
        throw new KatoLogicError('该手机号码不存在', 10003);
      }

      const now = dayjs();
      const codeModel: SMSCodeDBModel = (
        await appDB.execute(
          //language=PostgreSQL
          `
            select *
            from sms_code
            where phone = ?
              and usage = ?
              for update
          `,
          phone,
          usage
        )
      )[0];
      //今日次数是否超过限额
      if (
        smsConfig.limit > 0 &&
        now.diff(codeModel?.created_at, 'd') == 0 &&
        codeModel?.counts >= smsConfig.limit
      )
        throw new KatoCommonError(`您已超过本日短信额度`);
      //生成新的验证码
      const code = Math.random()
        .toString()
        .slice(-6);
      const counts = (codeModel?.counts ?? 0) + 1;
      //upsert数据库
      await appDB.execute(
        //language=PostgreSQL
        `
          insert into sms_code(phone, usage, code, created_at, updated_at)
          values (?, ?, ?, ?, ?)
          on conflict (phone, usage) do update
            set counts     = ?,
                code       = excluded.code,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
        `,
        phone,
        usage,
        code,
        now.toDate(),
        now.toDate(),
        counts
      );
      // 发送短信
      if (smsConfig.enabled) {
        try {
          await send(phone, code);
        } catch (e) {
          const message = e.message ?? e;
          console.log(
            `${now.format(
              'YYYY-MM-DD HH:mm:ss'
            )} 发送 ${phone} 短信验证码 ${code} 异常: ${message}`
          );
          throw new KatoRuntimeError(message);
        }
      } else {
        return {
          code,
          counts
        };
      }
    });
  }

  /**
   * 登录
   *
   * @param phone 手机号码
   * @param password 密码
   * @return {
   *   token: token
   * }
   */
  @validate(phoneValidate, passwordValidate)
  async login(phone, password) {
    const staffModel: {
      id: string;
      password: string;
    } = (
      await appDB.execute(
        //language=PostgreSQL
        `
          select id, password
          from staff
          where phone = ?
        `,
        phone
      )
    )[0];
    if (!staffModel) throw new KatoLogicError('手机号码不存在', 10003);
    if (staffModel.password !== password)
      throw new KatoLogicError('密码错误', 10001);

    return {token: staffModel.id};
  }

  /**
   * 注册
   *
   * @param phone 手机号码
   * @param code 验证码
   * @param password 密码
   */
  @validate(phoneValidate, should.string().required(), passwordValidate)
  async register(phone, code, password) {
    await appDB.transaction(async () => {
      //校验手机是否可用
      const usable = await validPhone(phone);
      if (!usable) {
        throw new KatoLogicError('该手机号码已被注册', 10002);
      }

      // 校验验证码是否正确
      await smsVerification(code, phone, CodeUsage.Register);
      //注册用户
      await appDB.execute(
        //language=PostgreSQL
        `
          insert into staff(id, phone, password)
          values (?, ?, ?)
        `,
        uuid(),
        phone,
        password
      );
    });
  }

  /**
   * 更新用户信息
   *
   * @param params {
   *   name: 姓名
   *   gender: 性别
   *   major: 专业
   *   title: 职称
   *   education: 学历
   *   isGP: 是否为全科医师
   * }
   */
  @validate(
    should.object({
      name: should.string().required(),
      gender: should
        .string()
        .only(Gender)
        .required(),
      major: should.string().required(),
      title: should.string().required(),
      education: should
        .string()
        .only(Object.values(Education))
        .required(),
      isGP: should.boolean().required()
    })
  )
  async update(params) {
    const id = Context.current.user.id;
    const {name, gender, major, title, education, isGP} = params;
    //language=PostgreSQL
    await appDB.execute(
      `
        update staff
        set name       = ?,
            gender     = ?,
            major      = ?,
            title      = ?,
            education  = ?,
            "isGP"     = ?,
            updated_at = now()
        where id = ?
      `,
      name,
      gender,
      major,
      title,
      education,
      isGP,
      id
    );
  }

  /**
   * 重置密码
   *
   * @param phone 手机号
   * @param code 验证码
   * @param password 密码
   */
  @validate(phoneValidate, should.string().required(), passwordValidate)
  async resetPassword(phone, code, password) {
    await appDB.transaction(async () => {
      //校验手机是否可用
      const usable = await validPhone(phone);
      if (usable) {
        throw new KatoLogicError('手机号码不存在', 10003);
      }

      // 校验验证码是否正确
      await smsVerification(code, phone, CodeUsage.ResetPassword);

      // 重置密码
      await appDB.execute(
        //language=PostgreSQL
        `
          update staff
          set password   = ?,
              updated_at = now()
          where phone = ?
        `,
        password,
        phone
      );
    });
  }

  /**
   * 更新密码
   *
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   * @param confirmPassword 确认密码
   */
  @validate(should.string().required(), passwordValidate, passwordValidate)
  async updatePassword(oldPassword, newPassword, confirmPassword) {
    await appDB.transaction(async () => {
      // 校验密码是否正确
      if (Context.current.user.password !== oldPassword)
        throw new KatoLogicError('您的旧密码输入错误', 10001);
      if (newPassword !== confirmPassword)
        throw new KatoCommonError('您输入的新密码不一致');
      await appDB.execute(
        // language=PostgreSQL
        `
          update staff
          set password   = ?,
              updated_at = now()
          where id = ?
        `,
        newPassword,
        Context.current.user.id
      );
    });
  }

  /**
   * 更换手机号码
   *
   * @param phone 手机号码
   * @param code 验证码
   * @param password 密码
   */
  @validate(phoneValidate, should.string().required(), passwordValidate)
  async updatePhone(phone, code, password) {
    await appDB.transaction(async () => {
      // 校验密码是否正确
      if (Context.current.user.password !== password)
        throw new KatoLogicError('您的密码输入错误', 10001);

      //校验手机是否可用
      const usable = await validPhone(phone);
      if (!usable) {
        throw new KatoLogicError('该手机号码已被注册', 10002);
      }

      // 校验验证码是否正确,校验手机号是否已经注册
      await smsVerification(code, phone, CodeUsage.UpdatePhone);

      //注册用户
      await appDB.execute(
        //language=PostgreSQL
        `
          update staff
          set phone      = ?,
              updated_at = now()
          where id = ?
        `,
        phone,
        Context.current.user.id
      );
    });
  }

  /**
   * 注销机构
   *
   * @param area 机构id
   */
  @validate(should.string().required())
  async resign(area) {
    return;
  }

  /**
   * 获取申请状态
   *
   * @param id 申请id
   * @return {
   *   id: id
   *   status: 状态
   * }
   */
  @validate(should.string().required())
  async getRequest(id) {
    const staffRequests = await appDB.execute(
      // language=PostgreSQL
      `
        select request.id,
               request.status
        from staff_request request
        where request.id = ?
      `,
      id
    );
    if (staffRequests.length === 0) throw new KatoRuntimeError('申请id不合法');
    return staffRequests[0];
  }

  /**
   * 公卫概览
   *
   * @param area 机构编码
   * @param year 年份
   * @return {
   *   name: 名称
   *   workPoints?: 参与校正工分
   *   rate?: 质量系数
   *   date: 更新时间
   *   people: [{
   *     id: 人群分类编码
   *     name: 人群名称
   *     amount: 不规范人数,
   *     tags: [{
   *       id: 对应指标
   *       value: true(规范)/false(不规范)
   *     }]
   *   }]
   * }
   */
  @validate(should.string().required(), should.number().required())
  async phOverview(area, year) {
    // 实例化
    const SystemAreaApi = new SystemArea();
    // 调用total接口,获取机构公分等信息
    const total = await SystemAreaApi.total(area, year);
    // 智慧公卫人群列表
    const markPersons: {
      C01: number;
      C02: number;
      C03: number;
      C13: number;
      C11: number;
      C04: number;
    } = (
      await originalDB.execute(
        // language=PostgreSQL
        `
          select sum(case when ("O00" = false or "O02" = false) and "C01" = true then 1 else 0 end) as "C01",
                 sum(case
                       when ("H00" = false or "H01" = false or "H02" = false) and mp."C02" = true then 1
                       else 0 end)                                                                  as "C02",
                 sum(case
                       when ("D00" = false or "D01" = false or "D02" = false) and mp."C03" = true then 1
                       else 0 end)                                                                  as "C03",
                 sum(case when "CH01" = false and mp."C13" = true then 1 else 0 end)                as "C13",
                 sum(case when "CO01" = false and mp."C11" = true then 1 else 0 end)                as "C11",
                 sum(case
                       when ("MCH01" = false or "MCH02" = false) and mp."C04" = true then 1
                       else 0 end)                                                                  as "C04"
          from ph_person vp
                 left join mark_person mp on mp.id = vp.id and mp.year = ?
          where vp.adminorganization = ?
        `,
        year,
        area
      )
    )[0];
    const people = [
      {
        id: 'C01',
        name: '老年人',
        amount: new Decimal(markPersons.C01).toNumber()
      },
      {
        id: 'C02',
        name: '高血压患者',
        amount: new Decimal(markPersons.C02).toNumber()
      },
      {
        id: 'C03',
        name: '糖尿病患者',
        amount: new Decimal(markPersons.C03).toNumber()
      },
      {
        id: 'C13',
        name: '高危人群',
        amount: new Decimal(markPersons.C13).toNumber()
      },
      {
        id: 'C11',
        name: '其他慢病患者',
        amount: new Decimal(markPersons.C11).toNumber()
      },
      {
        id: 'C04',
        name: '孕产妇人群',
        amount: new Decimal(markPersons.C04).toNumber()
      }
    ].map(it => {
      const tags = documentTagList
        .filter(tagIt => tagIt.crowd === it.id)
        .map(tagIt => ({
          id: tagIt.id,
          name: tagIt.name,
          value: tagIt.value
        }));
      return {
        ...it,
        tags: tags
      };
    });
    return {
      name: total.name,
      workPoints: total.workPoint,
      rate: total.rate,
      date: dayjs(dayjs().format('YYYY-MM-DD 03:00:00')).toDate(),
      people: people
    };
  }

  /**
   * 医疗概览
   *
   * @param area 机构编码
   * @param month 时间
   * @return {
   *   work?: {
   *     value: 工作量
   *     rank: 排名
   *   }
   *   rate?: {
   *     value: 质量系数
   *     rank: 排名
   *   }
   *   items: [{
   *     id: id
   *     name: 名称
   *     value: 工作量
   *   }],
   *   checks: [{
   *     name: 方案名称,
   *     staffScore: 员工得分,
   *     score: 总分
   *   }]
   * }
   */
  @validate(should.string().required(), should.date().required())
  async hisOverview(area, month) {
    const staffId = Context.current.user.id;
    // region 工分排名

    const hospitalApi = new HisHospital();
    // 员工考核结果列表
    const works = await hospitalApi.findStaffCheckList(month);
    // 定义初始分数
    let rankScore = -1;
    // 预定义排名
    let rank = 0;
    // 按照校正前工分排名
    const checkScores = works
      .sort((a, b) => b.score - a.score)
      .map(it => {
        if (it.score === rankScore) {
          return {
            ...it,
            rank: rank
          };
        } else {
          rank++;
          rankScore = it.score;
          return {
            ...it,
            rank: rank
          };
        }
      });
    // 查找此员工矫正前工分
    const scoreFind = checkScores.find(it => it.id === staffId);

    // 初始化分数
    rankScore = -1;
    // 初始化排名
    rank = 0;
    // 按照质量系数排名
    const checkRates = works
      .sort((a, b) => b.rate - a.rate)
      .map(it => {
        if (it.rate === rankScore) {
          return {
            ...it,
            rank: rank
          };
        } else {
          rank++;
          rankScore = it.rate;
          return {
            ...it,
            rank: rank
          };
        }
      });
    // 查找此员工占比
    const rateFind = checkRates.find(it => it.id === staffId);
    // endregion

    // 实例化hisStaff接口
    const staffApi = new HisStaff();
    // 获取员工公分项详情
    const workItems = await staffApi.findWorkScoreList(staffId, month, area);

    let checks = null;
    try {
      // 获取考核方案
      checks = await staffApi.staffCheck(staffId, month, area);
    } catch (e) {
      // 考核方案异常不处理
    }
    const checkList = [
      ...(checks?.automations ?? []),
      ...(checks?.manuals ?? [])
    ];

    return {
      work: scoreFind
        ? {
            value: scoreFind.score,
            rank: scoreFind.rank
          }
        : null,
      rate: rateFind
        ? {
            value: rateFind.rate,
            rank: rateFind.rank
          }
        : null,
      items: workItems.items.map(it => ({
        id: it?.id,
        name: it?.name,
        value: it?.score
      })),
      checks: checkList
    };
  }

  // region 用户临时接口

  // 接触绑定
  async review(id, hospital) {
    await checkoutStaff(id, hospital);

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

    /**
     * 1: 查询员工信息
     * 2: 判断要注销的机构是不是主机构
     * 2.1: 是主机构: 查询员工的所有机构,如果有多家,把最后一次绑定的为主机构
     * 2.2: 非主机构: 对员工主表不做处理
     * 3: 删除员工和此机构的绑定
     * 4: 删除员工和此机构公卫员工的绑定
     * 5: 删除员工和此机构HIS员工的绑定
     */
    return appDB.transaction(async () => {
      // 查询员工信息
      const staffModel: {
        id: string;
        hospital: string;
        department: string;
      } = (
        await appDB.execute(
          // language=PostgreSQL
          `
            select id, hospital, department
            from staff
            where id = ?
          `,
          id
        )
      )[0];
      // 判断要注销的机构是不是主机构
      if (staffModel.hospital === hospital) {
        // 是主机构, 查询员工的所有机构
        const areaMappings: {
          staff: string;
          area: string;
          department: string;
          created_at: Date;
        }[] = await appDB.execute(
          // language=PostgreSQL
          `
            select staff, area, department, created_at
            from staff_area_mapping
            where staff = ?
              and area != ?
            order by created_at desc
          `,
          id,
          hospital
        );
        // 如果有其他机构, 把第一条设置为主机构,否则主机构设置为null
        await appDB.execute(
          // language=PostgreSQL
          `
            update staff
            set hospital   = ?,
                department = ?,
                updated_at = now()
            where id = ?
          `,
          areaMappings[0]?.area ?? null,
          areaMappings[0]?.department ?? null,
          id
        );
      }

      // 如果不是主机构, 直接删除掉这条记录
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_area_mapping
          where staff = ?
            and area = ?`,
        id,
        hospital
      );
      if (phStaffIds.length > 0) {
        // 删除员工和公卫员工关联表
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

      if (hisStaffIds.length > 0) {
        // 删除员工和his员工关联表
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
    });
  }

  /**
   * 初始化用户
   * @param id
   */
  async initialization(id) {
    await checkoutStaff(id, null);

    return appDB.transaction(async () => {
      // 删除员工和地区关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_area_mapping
          where staff = ?
        `,
        id
      );

      // 删除员工和公卫员工关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_ph_mapping
          where staff = ?
        `,
        id
      );

      // 删除员工和his员工关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_his_mapping
          where staff = ?
        `,
        id
      );

      // 把主机构,主科室为空
      return await appDB.execute(
        // language=PostgreSQL
        `
          update staff
          set hospital   = null,
              department = null,
              name       = null,
              remark     = null,
              major      = null,
              title      = null,
              education  = null,
              updated_at = now()
          where id = ?
        `,
        id
      );
    });
  }

  @validate(should.string().required(), should.string().required())
  async delete(id) {
    await checkoutStaff(id, null);

    return appDB.transaction(async () => {
      // 删除员工和地区关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_area_mapping
          where staff = ?
        `,
        id
      );

      // 删除员工和公卫员工关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_ph_mapping
          where staff = ?
        `,
        id
      );

      // 删除员工和his员工关联表
      await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff_his_mapping
          where staff = ?
        `,
        id
      );

      // 执行删除操作
      return await appDB.execute(
        // language=PostgreSQL
        `
          delete
          from staff
          where id = ?
        `,
        id
      );
    });
  }

  // endregion
}
