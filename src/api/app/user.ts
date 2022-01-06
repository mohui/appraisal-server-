import * as config from 'config';
import * as dayjs from 'dayjs';
import {OpUnitType} from 'dayjs';
import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {v4 as uuid} from 'uuid';
import {appDB, originalDB} from '../../app';
import {Education, Gender} from '../../../common/his';
import {Context} from '../context';
import HisHospital from '../his/hospital';
import HisStaff from '../his/staff';
import SystemArea from '../group/system_area';
import Decimal from 'decimal.js';
import {documentTagList} from '../../../common/person-tag';

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
 * 短信配置
 */
const smsConfig = config.get<{
  enabled: boolean;
  limit: number;
  expired: {value: number; unit: OpUnitType};
}>('sms');

/**
 * 验证码用途枚举
 */
enum CodeUsage {
  Register = '用户注册',
  UpdatePhone = '更换手机'
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
  return userModels.length == 0;
}

/**
 * 校验验证码是否正确
 *
 * @param code 验证码
 * @param phone 手机号
 * @param usage 验证码用途
 */
async function smsVerification(code, phone, usage) {
  //校验手机是否可用
  const usable = await validPhone(phone);
  if (!usable) {
    throw new KatoCommonError('该手机号码已被注册');
  }

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
  if (!codeModel) throw new KatoCommonError('验证码错误');
  //检验是否过期
  if (
    dayjs()
      .subtract(smsConfig.expired.value, smsConfig.expired.unit)
      .isAfter(codeModel.created_at)
  )
    throw new KatoCommonError('验证码已过期');
  //检验验证码是否失效
  if (codeModel.created_at.getTime() != codeModel.updated_at.getTime())
    throw new KatoCommonError('验证码已失效');
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
      //TODO: 发送短信

      return smsConfig.enabled
        ? {
            code,
            counts
          }
        : null;
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
    const token = (
      await appDB.execute(
        //language=PostgreSQL
        `
          select *
          from staff
          where phone = ?
            and password = ?
        `,
        phone,
        password
      )
    )[0]?.id;
    if (token) {
      return {token};
    } else {
      throw new KatoCommonError('密码错误');
    }
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
      // 校验验证码是否正确,校验手机号是否已经注册
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
        .only(Gender.values())
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
      set name      = ?,
          gender    = ?,
          major     = ?,
          title     = ?,
          education = ?,
          "isGP"    = ?,
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
   * @param password 密码
   * @param code 验证码
   */
  @validate(passwordValidate)
  async resetPassword(password, code) {
    return;
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
        throw new KatoCommonError(' 您的旧密码输入错误');
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
        throw new KatoCommonError(' 您的密码输入错误');

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
}
