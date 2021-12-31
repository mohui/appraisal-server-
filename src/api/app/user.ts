import * as config from 'config';
import * as dayjs from 'dayjs';
import {OpUnitType} from 'dayjs';
import {KatoCommonError, should, validate} from 'kato-server';
import {v4 as uuid} from 'uuid';
import {appDB} from '../../app';
import {Education, Gender} from '../../../common/his';
import {Context} from '../context';

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
  register = '注册'
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
   * 验证码短信发送
   *
   * @param phone 手机号码
   * @param usage 用途
   * @return {
   *   code: 验证码
   *   counts: 今日次数
   * }?
   */
  @validate(phoneValidate, should.string().required())
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
          code,
          CodeUsage.register
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
      //校验手机是否可用
      const usable = await this.validPhone(phone);
      if (!usable) {
        throw new KatoCommonError('该手机号码已被注册');
      }
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
   */
  @validate(should.string().required(), passwordValidate)
  async updatePassword(oldPassword, newPassword) {
    return;
  }

  /**
   * 更换手机号码
   *
   * @param phone 手机号码
   */
  @validate(phoneValidate)
  async updatePhone(phone) {
    return;
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
   *   reason?: 拒绝原因
   * }
   */
  async getRequest(id) {
    return {};
  }

  /**
   * 公卫概览
   *
   * @param area 机构编码
   * @return {
   *   name: 名称
   *   workpoints?: 参与校正工分
   *   rate?: 质量系数
   *   date: 更新时间
   *   people: [{
   *     id: 人群分类编码
   *     name: 人群名称
   *     amount: 不规范人数
   *   }]
   * }
   */
  async phOverview(area) {
    return {};
  }

  /**
   * 医疗概览
   *
   * @param area 机构编码
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
   *   checks: []
   * }
   */
  async hisOverview(area) {
    return {};
  }
}
