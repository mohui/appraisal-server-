import {Context} from '../context';
import {appDB} from '../../app';
import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {imageSync} from 'qr-image';
import {getStaff} from '../his/common';
import {getHospital} from '../his/service';
import {getHospitals} from '../group/common';
import {v4 as uuid} from 'uuid';
import {RequestStatus} from '../../../common/user';

/**
 * App机构模块
 */
export default class AppArea {
  //region 员工申请相关
  /**
   * 生成机构邀请码
   *
   * 格式: {area: ${area}}
   * @return 二维码地址
   */
  async invite() {
    const hospital = await getHospital();
    // 生成机构邀请码
    const imageBuffer = imageSync(
      JSON.stringify({
        code: hospital
      }),
      {type: 'png'}
    );
    return {
      image: `data:image/png;base64,${imageBuffer.toString('base64')}`
    };
  }

  /**
   * 扫码申请加入
   *
   * @param ticket {
   *   area: 机构编码
   * }
   * @return 申请id
   */
  @validate(
    should
      .object({
        area: should.string().required()
      })
      .required()
  )
  async joinUs(ticket) {
    /**
     * 1: 校验机构id是否合法
     * 2: 获取员工id
     * 3: 根据员工id获取员工信息
     * 4: 判断此员工信息是否合法, 判断员工是否绑定过此机构
     * 5: 检查是否在申请列表,避免重复申请,
     * 6: 添加申请
     * */
    // 申请码是否合法
    const hospitals = await getHospitals(ticket.area);

    if (hospitals.length !== 1 && hospitals[0].code !== ticket.area)
      throw new KatoRuntimeError('机构id不合法');

    // 取出员工id
    const staffId = Context.current.user.id;
    // 获取员工信息
    const staffs = await getStaff(staffId);
    if (staffs.length === 0) throw new KatoCommonError('不是员工账号');

    // 查找机构是否在数组中
    const filterUser = staffs.filter(it => it.area === ticket.area);
    if (filterUser.length > 0) throw new KatoCommonError('员工已经在此机构');

    const staffRequests = await appDB.execute(
      // language=PostgreSQL
      `
        select id, staff
        from staff_request
        where staff = ?
          and area = ?
          and status != ?
      `,
      staffId,
      ticket.area,
      RequestStatus.REJECTED
    );
    if (staffRequests.length > 0) throw new KatoCommonError('已在申请列表');

    // 插入申请表中
    const requestId = uuid();
    await appDB.execute(
      // language=PostgreSQL
      `
        insert into staff_request(id, staff, area)
        VALUES (?, ?, ?)
      `,
      requestId,
      staffId,
      ticket.area
    );
    return requestId;
  }

  /**
   * 获取指定状态的申请列表
   *
   * @param params {
   *   status? 状态
   *   name? 姓名
   * }
   * @return []
   */
  @validate(
    should.object({
      status: should
        .string()
        .only(
          RequestStatus.PENDING,
          RequestStatus.REJECTED,
          RequestStatus.SUCCESS
        )
        .allow(null),
      name: should.string().allow(null)
    })
  )
  async requests(params) {
    const hospital = await getHospital();
    let where = '';
    // 如果审核状态有值
    if (params?.status) where += ` and request.status = '${params.status}'`;
    if (params?.name) where += ` and staff.name like '%${params.name}%'`;
    return await appDB.execute(
      // language=PostgreSQL
      `
        select request.id,
               request.staff,
               request.area,
               request.status,
               request.updated_at,
               request.created_at,
               staff.name,
               staff.gender,
               staff.phone,
               staff.major,
               staff.title,
               staff.education,
               staff."isGP",
               staff.created_at "staffCreatedAt"
        from staff_request request
               left join staff on request.staff = staff.id
        where request.area = ? ${where}
      `,
      hospital
    );
  }

  /**
   * 修改指定申请
   *
   * @param id 申请id
   * @param status 状态
   */
  @validate(
    should.string().required(),
    should
      .string()
      .only(RequestStatus.REJECTED, RequestStatus.SUCCESS)
      .required()
  )
  async updateRequest(id, status) {
    const hospital = await getHospital();

    const staffRequests = await appDB.execute(
      // language=PostgreSQL
      `
        select request.id,
               request.staff,
               request.area,
               request.status,
               request.updated_at,
               request.created_at
        from staff_request request
        where request.id = ?
      `,
      id
    );
    if (staffRequests.length === 0) throw new KatoCommonError('申请id不存在');

    if (staffRequests[0].status !== RequestStatus.PENDING)
      throw new KatoCommonError('已审核');

    if (staffRequests[0].area !== hospital)
      throw new KatoCommonError('没有审核权限');

    const staffs = await getStaff(staffRequests[0].staff);
    if (staffs.length === 0) throw new KatoCommonError('此员工账号不存在');

    // 先修改状态,通过需要在mapping表中添加一条
    return await appDB.joinTx(async () => {
      await appDB.execute(
        // language=PostgreSQL
        `
          update staff_request
          set status = ?,
              updated_at = ?
          where id = ?
        `,
        status,
        new Date(),
        id
      );
      // 如果通过, 在 staff_area_mapping 表中添加一条
      if (status === RequestStatus.SUCCESS)
        await appDB.execute(
          // language=PostgreSQL
          `
            insert into staff_area_mapping(id, staff, area)
            values (?, ?, ?)
          `,
          uuid(),
          staffRequests[0].staff,
          staffRequests[0].area
        );
    });
  }

  //endregion

  //region 公卫相关
  /**
   * 考核指标得分列表
   *
   * 目前只考虑机构
   * @param area 地区编码
   * @return 考核体系下的指标得分列表[]
   */
  async indicators(area) {
    return [];
  }

  /**
   * 档案问题标签列表
   */
  async tags() {
    return [];
  }

  /**
   * 公卫医生列表
   *
   * @param area 机构编码
   * @return [{
   *   id: id
   *   name: 姓名
   * }]
   */
  async phDoctors(area) {
    return [];
  }

  /**
   * 问题档案列表
   *
   * 目前只考虑机构
   * @param params {
   *   area: 地区编码
   *   keyword: 姓名/身份证
   *   doctor: 录入医生
   *   tags: []档案问题
   *   pageSize: 分页大小
   *   pageNo: 分页页码
   * }
   * @return 居民档案列表[]
   */
  async archives(params) {
    return [];
  }

  //endregion
}
