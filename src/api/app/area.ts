import {appDB, originalDB} from '../../app';
import {
  BasicTagUsages,
  MarkTagUsages,
  TagAlgorithmUsages
} from '../../../common/rule-score';
import Decimal from 'decimal.js';
import Person from '../person';
import {documentTagList} from '../../../common/person-tag';
import {Context} from '../context';
import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {imageSync} from 'qr-image';
import {getHospital} from '../his/service';
import {getHospitals} from '../group/common';
import {v4 as uuid} from 'uuid';
import {RequestStatus} from '../../../common/user';
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
        code: hospital,
        name: Context.current.user.hospitals[0]['name']
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
          select id, staff, status, updated_at
          from staff_request
          where staff = ?
            and area = ?
          order by updated_at desc
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
      const filterUser = staffRequests.filter(
        it => it.status === RequestStatus.SUCCESS
      );
      if (filterUser.length > 0) return filterUser[0].id;

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
              {{#if status}} and request.status = {{? status}} {{/if}}
              {{#if name}}  and staff.name like {{? name}} {{/if}}
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
   * @param year 数据年份
   * @return 考核体系下的指标得分列表 [{
   *   id: 考核项编号,
   *   name: 考核项名称,
   *   tags: [{
   *      id: 对应指标编码,
   *      name: 对应指标名称,
   *      value: 指标检索值,
   *      algorithm: 计算方式编码,
   *      algorithm_name: 计算方式解释,
   *      baseline: 指标值,
   *      score: 指标分值,
   *      current_score: 得分,
   *   }]
   * }]
   */
  @validate(should.string().required(), should.number().required())
  async indicators(area, year) {
    /**
     * 机构当前年度考核规则
     */
    const checkSystem = (
      await appDB.execute(
        //language=PostgreSQL
        `
          select s.*
          from check_system s
                 inner join check_area a on a.check_system = s.check_id
          where a.area = ?
            and s.check_year = ?
        `,
        area,
        year
      )
    )[0];
    if (!checkSystem) return [];
    /**
     * 考核体系小项和细则
     */
    const checkRules = await appDB.execute(
      //language=PostgreSQL
      `
        select *
        from check_rule
        where check_id = ?
      `,
      checkSystem.check_id
    );
    /**
     * 规则对应指标设置
     */
    const ruleTags = await appDB.execute(
      //language=PostgreSQL
      `
        select t.*
        from rule_tag t
               inner join check_rule r on r.rule_id = t.rule
        where r.check_id = ?
          and t.algorithm not in (?, ?)
      `,
      checkSystem.check_id,
      TagAlgorithmUsages.empty.code,
      TagAlgorithmUsages.attach.code
    );
    /**
     * 机构细则打分设置
     */
    const ruleAreaScores = await appDB.execute(
      //language=PostgreSQL
      `
        select ras.*
        from rule_area_score ras
               inner join check_rule r on r.rule_id = ras.rule
        where r.check_id = ?
      `,
      checkSystem.check_id
    );
    /**
     * 机构手工基础数据
     */
    const basicTagData = await appDB.execute(
      //language=PostgreSQL
      `
        select *
        from basic_tag_data
        where hospital = ?
          and year = ?
      `,
      area,
      year
    );
    /**
     * 机构标记数据
     */
    const markData = (
      await originalDB.execute(
        //language=PostgreSQL
        `
          select *
          from mark_organization
          where id = ?
            and year = ?
        `,
        area,
        year
      )
    )[0];
    const tags = this.tags();
    return (
      await Promise.all(
        checkRules
          //考核规则对应的考核指标-parent_rule_id为空
          .filter(r => r.parent_rule_id === null)
          .map(async rule => {
            return {
              // eslint-disable-next-line @typescript-eslint/camelcase
              id: rule.rule_id,
              // eslint-disable-next-line @typescript-eslint/camelcase
              name: rule.rule_name,
              // eslint-disable-next-line @typescript-eslint/camelcase
              score: checkRules
                .filter(r => r.parent_rule_id === rule.rule_id)
                .reduce(
                  (result, current) => Decimal.add(result, current.rule_score),
                  0
                )
                .toNumber(),
              tags: (
                await Promise.all(
                  ruleTags
                    //查询考核项下属考核细则对应的考核指标
                    .filter(
                      tag =>
                        checkRules.filter(
                          r =>
                            r.parent_rule_id === rule.rule_id &&
                            r.rule_id === tag.rule
                        ).length > 0 &&
                        tag.tag.indexOf('HE') !== 0 && //排除健康教育指标
                        tag.tag.indexOf('SC') !== 0 //排除卫生监管协查
                    )
                    //计算指标对应的分值
                    .map(async tag => {
                      // eslint-disable-next-line @typescript-eslint/camelcase
                      let correct_score = 0;
                      const auto =
                        ruleAreaScores.filter(
                          ras => ras.area === area && ras.rule === tag.rule
                        )[0]?.auto ?? true;
                      if (auto === true) {
                        // 健康档案建档率
                        if (tag.tag === MarkTagUsages.S01.code) {
                          // 查询服务总人口数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.DocPeople
                            )[0]?.value ?? 0;
                          // 根据指标算法, 计算得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.S00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.S00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.S00
                          ) {
                            const rate =
                              markData?.S00 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }

                        // 健康档案规范率
                        if (tag.tag === MarkTagUsages.S23.code) {
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.S23
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.S23
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.S23 &&
                            markData?.S00
                          ) {
                            const rate =
                              markData.S23 / markData.S00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }

                        // 健康档案使用率
                        if (tag.tag === MarkTagUsages.S03.code) {
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.S03
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.S03
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.S03 &&
                            markData?.S00
                          ) {
                            const rate =
                              markData.S03 / markData.S00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }

                        // 老年人健康管理率
                        if (tag.tag === MarkTagUsages.O00.code) {
                          // 查询老年人人数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.OldPeople
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.O00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.O00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.O00
                          ) {
                            const rate =
                              markData.O00 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 老年人中医药健康管理率
                        if (tag.tag === MarkTagUsages.O02.code) {
                          // 查询老年人人数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.OldPeople
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.O02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.O02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            basicData &&
                            markData?.O02
                          ) {
                            const rate =
                              markData.O02 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }

                        // 高血压健康管理
                        if (tag.tag === MarkTagUsages.H00.code) {
                          // 查询高血压人数
                          const basicData =
                            basicTagData.filter(
                              bd =>
                                bd.code === BasicTagUsages.HypertensionPeople
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.H00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.H00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.H00
                          ) {
                            const rate =
                              markData.H00 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 高血压规范管理率
                        if (tag.tag === MarkTagUsages.H01.code) {
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.H01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.H01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.H00 &&
                            markData?.H01
                          ) {
                            const rate =
                              markData.H01 / markData.H00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 高血压控制率
                        if (tag.tag === MarkTagUsages.H02.code) {
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.H02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.H02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.H00 &&
                            markData?.H02
                          ) {
                            const rate =
                              markData.H02 / markData.H00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }

                        // 糖尿病健康管理
                        if (tag.tag === MarkTagUsages.D00.code) {
                          // 查询糖尿病人数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.DiabetesPeople
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.D00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.D00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.D00
                          ) {
                            const rate =
                              markData.D00 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 糖尿病规范管理率
                        if (tag.tag === MarkTagUsages.D01.code) {
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.D01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.D01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.D00 &&
                            markData?.D01
                          ) {
                            const rate =
                              markData.D01 / markData.D00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 糖尿病控制率
                        if (tag.tag === MarkTagUsages.D02.code) {
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.D02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.D02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.D00 &&
                            markData?.D02
                          ) {
                            const rate =
                              markData.D02 / markData.D00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }

                        // 其他慢病规范管理率
                        if (tag.tag === MarkTagUsages.CO01.code) {
                          // 查询其他慢病人数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.OCD00
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.CO01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.CO01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            basicData &&
                            markData?.CO01
                          ) {
                            const rate =
                              markData.CO01 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 高危人群规范管理率
                        if (tag.tag === MarkTagUsages.CH01.code) {
                          // 查询高危人群人数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.HR00
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.CH01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.CH01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            basicData &&
                            markData?.CH01
                          ) {
                            const rate =
                              markData.CH01 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }

                        // 早孕建册率
                        if (tag.tag === MarkTagUsages.MCH01.code) {
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.MCH01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.MCH01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.MCH01 &&
                            markData?.MCH00
                          ) {
                            const rate =
                              markData.MCH01 / markData.MCH00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 产后访视率
                        if (tag.tag === MarkTagUsages.MCH02.code) {
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.MCH02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.MCH02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.MCH02 &&
                            markData?.MCH00
                          ) {
                            const rate =
                              markData.MCH02 / markData.MCH00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 新生儿访视率
                        if (tag.tag === MarkTagUsages.MCH03.code) {
                          // 年度辖区内活产数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.Children00
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.MCH03
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.MCH03
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.MCH03
                          ) {
                            const rate =
                              markData.MCH03 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 儿童健康管理率
                        if (tag.tag === MarkTagUsages.MCH04.code) {
                          // 查询 年度辖区内0-6岁儿童数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.Children01
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.MCH04
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.MCH04
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.MCH04
                          ) {
                            const rate =
                              markData.MCH04 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }

                        // 签约服务覆盖率
                        if (tag.tag === MarkTagUsages.SN00.code) {
                          // 查询 服务人口数（基础数据中居民档案中的辖区内常驻人口数）
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.DocPeople
                            )[0]?.value ?? 0;

                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN00
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN00
                          ) {
                            const rate =
                              markData.SN00 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 重点人群签约服务覆盖率
                        if (tag.tag === MarkTagUsages.SN01.code) {
                          // 结果为”是“时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // 结果为“否”时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN01
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // “≥”时得满分，不足按比例得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN01
                          ) {
                            const rate =
                              markData.SN01 / markData?.focused / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 计划生育特扶人员签约率
                        if (tag.tag === MarkTagUsages.SN02.code) {
                          // 结果为”是“时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // 结果为“否”时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN02
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // “≥”时得满分，不足按比例得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN02
                          ) {
                            const rate =
                              markData.SN02 / markData?.C07 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 有偿签约率
                        if (tag.tag === MarkTagUsages.SN03.code) {
                          // 服务人口数
                          const basicData =
                            basicTagData.filter(
                              bd => bd.code === BasicTagUsages.DocPeople
                            )[0]?.value ?? 0;

                          // 结果为”是“时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN03
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // 结果为“否”时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN03
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // “≥”时得满分，不足按比例得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN03
                          ) {
                            const rate =
                              markData.SN03 / basicData / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 高血压病人有偿签约率
                        if (tag.tag === MarkTagUsages.SN04.code) {
                          // 结果为”是“时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN04
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // 结果为“否”时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN04
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // “≥”时得满分，不足按比例得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN04
                          ) {
                            const rate =
                              markData.SN04 / markData?.C02 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 糖尿病人有偿签约率
                        if (tag.tag === MarkTagUsages.SN05.code) {
                          // 结果为”是“时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN05
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // 结果为“否”时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN05
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // “≥”时得满分，不足按比例得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN05
                          ) {
                            const rate =
                              markData.SN05 / markData?.C03 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 续约率
                        if (tag.tag === MarkTagUsages.SN07.code) {
                          // 结果为”是“时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN07
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // 结果为“否”时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN07
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // “≥”时得满分，不足按比例得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN07
                          ) {
                            const rate =
                              markData.SN07 / markData?.SN00 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 有偿续约率
                        if (tag.tag === MarkTagUsages.SN08.code) {
                          // 结果为”是“时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN08
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // 结果为“否”时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN08
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // “≥”时得满分，不足按比例得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN08
                          ) {
                            const rate =
                              markData.SN08 / markData?.SN03 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                        // 履约率
                        if (tag.tag === MarkTagUsages.SN10.code) {
                          // 结果为”是“时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.Y01.code &&
                            markData?.SN10
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // 结果为“否”时，得满分
                          if (
                            tag.algorithm === TagAlgorithmUsages.N01.code &&
                            !markData?.SN10
                          )
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score;

                          // “≥”时得满分，不足按比例得分
                          if (
                            tag.algorithm === TagAlgorithmUsages.egt.code &&
                            markData?.SN10
                          ) {
                            const rate =
                              markData.SN10 / markData?.SN09 / tag.baseline;
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            correct_score = tag.score * (rate > 1 ? 1 : rate);
                          }
                        }
                      }
                      return {
                        id: tag.tag,
                        name: MarkTagUsages[tag.tag].name,
                        value:
                          tags.filter(t => t.id === tag.tag)[0]?.value ?? false,
                        auto,
                        algorithm: tag.algorithm,
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        algorithm_name: TagAlgorithmUsages[tag.algorithm].name,
                        baseline: tag.baseline,
                        score: tag.score,
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        correct_score
                      };
                    })
                )
              ).filter(tag => tag.auto === true)
            };
          })
      )
    ).filter(r => r.tags.length > 0);
  }

  /**
   * 档案问题标签列表
   *
   * @return 考核体系下的指标得分列表 [{
   *   id: 问题标签编码,
   *   name: 问题标签名称,
   *   crowd: 所属人群,
   *   value: 问题标签的检索值,
   *   }]
   */
  tags() {
    return documentTagList;
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
  @validate(should.string().required())
  async phDoctors(area) {
    return await originalDB.execute(
      //language=PostgreSQL
      `
        select id, name
        from ph_user
        where hospital = ?
          and states = true
      `,
      area
    );
  }

  /**
   * 问题档案列表
   *
   * 目前只考虑机构
   * @param params {
   *   area: 地区编码
   *   keyword: 姓名/身份证
   *   doctor: 录入医生
   *   tags: [{id: 问题标签编码, value: 问题标签的检索值}] 档案问题
   *   crowd: [{id: 人群分类编码, value: 人群分类的检索值}] 档案问题
   *   pageSize: 分页大小
   *   pageNo: 分页页码
   *   year: 数据年度
   * }
   * @return 居民档案列表[{
   *   id: 编号,
   *   name: 名称,
   *   idCard: 身份证号,
   *   genderName: 性别,
   *   age: 年龄,
   *   S03: 有动态记录的档案,
   *   S23: 档案是否规范,
   *   O00: 老年人,
   *   O02: 老年人中医药健康管理,
   *   H00: 高血压,
   *   H01: 高血压患者规范管理,
   *   H02: 高血压患者血压控制,
   *   D00: 糖尿病,
   *   D01: 糖尿病患者规范管理,
   *   D02: 糖尿病患者血压控制,
   *   MCH01: 孕早期健康管理,
   *   MCH02: 产后访视健康管理,
   *   C00: 普通人群,
   *   C01: 老年人,
   *   C02: 高血压,
   *   C03: 糖尿病,
   *   C04: 孕产妇,
   *   C05: 0-6岁儿童,
   *   C06: 脑卒中,
   *   C07: 计划生育特殊家庭对象,
   *   C08: 严重精神病患者,
   *   C09: 肺结核,
   *   C10: 残疾人,
   *   C11: 其他慢病,
   *   C13: 高危人群,
   *   C14: 高校,
   *   CH01: 高危管理规范,
   *   CO01: 其他慢病管理规范,
   *   E00: 人群标记错误,
   *   ai_2dm: ai检测糖尿病风险,
   *   ai_hua: ai检测糖尿病患者高血酸风险,
   *   operatorName: 录入人,
   *   content: [{id: 编号, tag: 问题标签编码, content: 不规范内容}] 不规范内容
   *   }]
   */
  @validate(
    should.object({
      area: should.string().required(),
      keyword: should.string().allow(''),
      doctor: should.string().allow(''),
      tags: should
        .array()
        .items(
          should.object({
            id: should.string().required(),
            value: should.required()
          })
        )
        .allow([]),
      crowd: should
        .array()
        .items(
          should.object({
            id: should.string().required(),
            value: should.required()
          })
        )
        .allow([]),
      pageSize: should.number().required(),
      pageNo: should.number().required(),
      year: should.number().required()
    })
  )
  async archives(params) {
    const tags = this.tags();
    const tagsObject = {};
    if (params.tags && params.tags.length > 0)
      params.tags.map(tag => {
        tagsObject[tag.id] = tag.value;
      });
    else
      tags.map(tag => {
        tagsObject[tag.id] = tag.value;
      });
    const crowdObject = {};
    if (params.crowd)
      params.crowd.map(c => {
        crowdObject[c.id] = c.value;
      });
    const {count, rows} = await new Person().list({
      region: params.area,
      keyword: params.keyword,
      doctor: params.doctor,
      tags: tagsObject,
      pageSize: params.pageSize,
      pageNo: params.pageNo,
      year: params.year,
      crowd: crowdObject,
      documentOr: true
    });
    // eslint-disable-next-line @typescript-eslint/camelcase
    let mark_contents = [];
    if (rows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/camelcase
      mark_contents = await originalDB.execute(
        `
                  select id, name as tag, content
                  from mark_content
                  where year = ?
                    and id in (${rows.map(() => '?')})
                    and name in (${Object.keys(tagsObject).map(() => '?')})
                `,
        params.year,
        ...rows.map(p => p.id),
        ...Object.keys(tagsObject)
      );
    }
    return {
      count,
      rows: rows.map(row => ({
        ...row,
        age: row.age?.years ?? 0,
        // eslint-disable-next-line @typescript-eslint/camelcase
        content: mark_contents.filter(c => c.id === row.id)
      }))
    };
  }

  //endregion
}
