import {KatoRuntimeError, should, validate} from 'kato-server';
import {appDB} from '../../app';

const phoneValidate = should.string().regex(/^1\d{10}$/);
/**
 * App用户模块
 */
export default class AppUser {
  /**
   * 校验手机号码是否合法
   *
   * @param phone 手机号码
   * @return {
   *   valid: 是否合法
   *   usable: 是否可用
   * }
   */
  @validate(phoneValidate)
  async validPhone(phone) {
    return {
      valid: true,
      usable: true
    };
  }

  /**
   * 验证码短信发送
   *
   * @param phone 手机号码
   * @param module 功能模块
   */
  @validate(phoneValidate, should.string().required())
  async sendSMS(phone, module) {
    return;
  }

  /**
   * 注册
   *
   * @param phone 手机号码
   * @param code 验证码
   */
  @validate(phoneValidate, should.string().required())
  async register(phone, code) {
    return;
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
  async update(params) {
    return;
  }

  /**
   * 重置密码
   *
   * @param password 密码
   * @param code 验证码
   */
  async resetPassword(password, code) {
    return;
  }

  /**
   * 更新密码
   *
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
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
