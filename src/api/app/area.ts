import {Context} from '../context';
import {appDB} from '../../app';
import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {imageSync} from 'qr-image';
import {getHospital} from '../his/service';
import {getHospitals} from '../group/common';
import {v4 as uuid} from 'uuid';
import {RequestStatus, UserType} from '../../../common/user';
import {sql as sqlRender} from '../../database/template';

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
     * 5: 检查是否在申请列表,如果在申请列表,查看最新一条的状态,有三种情况
     * 5.1: 待审核: 直接返回id
     * 5.2: 已通过: 直接返回id
     * 5.3: 未通过: 接着往下进行,可以接着申请
     * 6: 添加申请
     * */
    // 申请码是否合法
    const hospitals = await getHospitals(ticket.area);

    if (hospitals.length !== 1 && hospitals[0].code !== ticket.area)
      throw new KatoRuntimeError('机构id不合法');

    return await appDB.joinTx(async () => {
      const staffRequests = await appDB.execute(
        // language=PostgreSQL
        `
        select id, staff, status, created_at
        from staff_request
        where staff = ?
          and area = ?
        order by created_at desc
      `,
        Context.current.user.id,
        ticket.area
      );
      // 如果查询结果大于0,并且不是未通过状态, 返回id
      if (
        staffRequests.length > 0 &&
        staffRequests[0].status !== RequestStatus.REJECTED
      ) {
        return staffRequests[0].id;
      }

      // 查找机构是否在数组中
      const filterUser = Context.current.user.hospitals.filter(
        it => it.id === ticket.area
      );
      if (filterUser.length > 0) throw new KatoCommonError('员工已经在此机构');

      // 插入申请表中
      const requestId = uuid();
      await appDB.execute(
        // language=PostgreSQL
        `
        insert into staff_request(id, staff, area)
        values (?, ?, ?)
      `,
        requestId,
        Context.current.user.id,
        ticket.area
      );
      return requestId;
    });
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
    const [sql, sqlParams] = sqlRender(
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
        where request.area = {{? hospital}}
              {{#if status}}
                and request.status = {{? status}}
              {{/if}}
              {{#if name}}
                and staff.name like {{? name}}
              {{/if}}
        order by (
            case when status = '${RequestStatus.PENDING}' then 1
                when status = '${RequestStatus.SUCCESS}' then 2
                else 3 end
            ), created_at desc;
      `,
      {
        hospital,
        status: params?.status ?? null,
        name: params?.name ? `%${params.name}%` : null
      }
    );
    return await appDB.execute(sql, ...sqlParams);
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

    const staffRequest: {
      id;
      staff;
      area;
      status;
    } = (
      await appDB.execute(
        // language=PostgreSQL
        `
          select request.id,
                 request.staff,
                 request.area,
                 request.status
          from staff_request request
                 inner join staff on request.staff = staff.id
          where request.id = ?
        `,
        id
      )
    )[0];
    if (!staffRequest) throw new KatoCommonError('申请id不存在');

    if (staffRequest.status !== RequestStatus.PENDING)
      throw new KatoCommonError('已审核');

    if (staffRequest.area !== hospital)
      throw new KatoCommonError('没有审核权限');

    // 先修改状态,通过需要在mapping表中添加一条
    return await appDB.joinTx(async () => {
      await appDB.execute(
        // language=PostgreSQL
        `
          update staff_request
          set status     = ?,
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
            on conflict (staff, area)
              do update set updated_at = now()
          `,
          uuid(),
          staffRequest.staff,
          staffRequest.area
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
