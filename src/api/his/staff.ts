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
import {Context} from '../context';
import {getStaffExtraScore, getHisStaff, getPhStaff} from './common';

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
   *   department: 科室
   *   remark: 备注
   * }
   */
  @validate(
    should
      .object({
        id: should.string().required(),
        hospital: should.string().required(),
        phStaffs: should.array(),
        hisStaffs: should.array(),
        department: should.string().allow(null),
        remark: should.string().allow(null)
      })
      .required()
  )
  async updateStaffMapping(params) {
    // 取出所有的变量
    const {id, hospital, phStaffs, hisStaffs, department, remark} = params;
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

      // 修改员工科室和备注
      await appDB.execute(
        // language=PostgreSQL
        `
          update staff_area_mapping
          set department = ?,
              remark     = ?,
              updated_at = ?
          where staff = ?
            and area = ?`,
        department,
        remark,
        dayjs().toDate(),
        id,
        hospital
      );
    });
  }

  /**
   * 非本机构员工列表
   *
   * @param params {
   *   name: 名称
   * }
   * @return [{
   *  id: '员工id',
   *  hospital: '机构id',
   *  account: '账号',
   *  name: '名称',
   *  remark: '备注',
   *  department: '科室id',
   *  phone: '手机号',
   *  gender: '性别',
   *  major: '专业类别',
   *  title: '职称名称',
   *  education: '学历',
   *  isGP: 是否为全科医师,
   *  created_at: '创建时间',
   *  updated_at: '修改时间'
   * }]
   */
  @validate(
    should
      .object({
        name: should.string().allow(null)
      })
      .allow(null)
  )
  async staffList(params) {
    const hospital = await getHospital();

    let param = '';
    if (params?.name) param = `and staff.name like '%${params.name}%'`;
    // 获取非本机构的员工
    return await appDB.execute(
      // language=PostgreSQL
      `
        select staff.id,
               staff.hospital,
               staff.account,
               staff.name,
               staff.remark,
               staff.department,
               staff.phone,
               staff.gender,
               staff.major,
               staff.title,
               staff.education,
               staff."isGP",
               staff.created_at,
               staff.updated_at
        from staff
               left join staff_area_mapping areaMapping on staff.id = areaMapping.staff
        where COALESCE(areaMapping.staff, '') not in (select staff.id
                                                      from staff
                                                             inner join staff_area_mapping areaMapping on staff.id = areaMapping.staff
                                                      where areaMapping.area = ?)
          and staff.status = true ${param}
      `,
      hospital
    );
  }

  /**
   * 员工绑定机构列表
   */
  async areaMapping() {
    return Context.current.user.hospitals;
  }

  // endregion

  // region 员工的增删改查
  /**
   * 查询his员工
   * @param hospital 机构
   */
  @validate(should.string().required())
  async listHisStaffs(hospital) {
    // 查询所有的his员工
    const hisStaffs = await originalDB.execute(
      // language=PostgreSQL
      `
        select id, name, hospital
        from his_staff
        where hospital = ?
      `,
      hospital
    );

    const hisStaffIds = hisStaffs.map(it => it.id);

    let staffs = [];
    if (hisStaffIds.length > 0) {
      // 查询所有已经绑定过的his员工
      staffs = await appDB.execute(
        // language=PostgreSQL
        `
          select his_staff
          from staff_his_mapping
          where his_staff in (${hisStaffIds.map(() => '?')})
        `,
        ...hisStaffIds
      );
    }
    return hisStaffs.map(it => {
      const index = staffs.find(item => it.id === item.his_staff);
      return {
        ...it,
        usable: !index
      };
    });
  }

  /**
   * 查询公卫员工
   * @param hospital 机构
   */
  @validate(should.string().required())
  async listPhStaffs(hospital) {
    // 根据绑定关系查询公卫机构下的所有员工
    const sysUserList = await originalDB.execute(
      // language=PostgreSQL
      `
        select id, name username, states
        from ph_user
        where hospital = ?
      `,
      hospital
    );
    const phStaffIds = sysUserList.map(it => it.id);

    let staffs = [];
    if (phStaffIds.length > 0) {
      staffs = await appDB.execute(
        // language=PostgreSQL
        `
          select ph_staff "phStaff"
          from staff_ph_mapping
          where ph_staff in (${phStaffIds.map(() => '?')})
        `,
        ...phStaffIds
      );
    }
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
   * @param hospital 机构
   *
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
  @validate(should.string().required(), dateValid, should.string().allow(null))
  async get(id, month, hospital) {
    /**
     * 查询员工,因为有没有绑定机构的员工情况
     *
     * 1: 先查询出此账号的所有信息
     * 2: 如果机构不为空,筛选此机构下是否有该员工信息
     * 2.1: 如果没有,返回throw
     * 2.2: 如果有,把此员工信息放到新数组中
     * */
    //查询员工
    const staffModels: {
      id: string;
      name: string;
      gender: string;
      phone: string;
      his_staff: string;
      area: string;
    }[] = await appDB.execute(
      // language=PostgreSQL
      `
          select staff.id,
                 staff.name,
                 staff.phone,
                 staff.gender,
                 hisMapping.his_staff,
                 area.area
          from staff
                 left join staff_area_mapping area on staff.id = area.staff
                 left join staff_his_mapping hisMapping on staff.id = hisMapping.staff
          where staff.id = ?
        `,
      id
    );
    if (staffModels.length === 0) throw new KatoRuntimeError(`该员工不存在`);

    let staffInfos = [];
    if (hospital) {
      staffInfos = staffModels.filter(it => it.area === hospital);
      if (staffInfos.length === 0)
        throw new KatoRuntimeError(`此机构下该员工不存在`);
    }

    const staffObj = {
      id: staffModels[0]?.id ?? null,
      name: staffModels[0]?.name ?? null,
      phone: staffModels[0]?.phone ?? null,
      sex: staffModels[0]?.gender ?? null,
      staff: [],
      birth: null
    };

    const hisStaffModels = hospital
      ? await originalDB.execute(
          // language=PostgreSQL
          `
          select id, name, hospital
          from his_staff
          where hospital = ?
        `,
          hospital
        )
      : [];

    for (const it of hisStaffModels) {
      const findIndex = staffModels.find(findIt => findIt.his_staff === it.id);
      if (findIndex) {
        staffObj.staff.push(it.id);
      }
    }

    // 获取月份开始时间
    const {start} = monthToRange(month);

    // 查询附加分
    const score = hospital
      ? await getStaffExtraScore(id, hospital, month)
      : null;
    //查询结算状态
    const settle = hospital ? await getSettle(hospital, start) : null;
    return {
      ...staffObj,
      extra: score ?? null,
      settle
    };
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
        id: should.string().required(),
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
        hospital: should.string().allow(null),
        major: should.string().allow(null),
        remark: should.string().allow(null),
        department: should.string().allow(null),
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
      hospital,
      major,
      remark,
      department,
      gender,
      title
    } = params;
    // 如果机构传空,查询此用户是否绑定过机构,如果绑定过机构,不能传空
    if (!hospital) {
      const staffMappings = await appDB.execute(
        // language=PostgreSQL
        `
          select *
          from staff_area_mapping
          where staff = ?
        `,
        id
      );
      if (staffMappings.length > 0)
        throw new KatoRuntimeError(`员工机构不能为空`);
    }
    // language=PostgreSQL
    await appDB.execute(
      `
        update staff
        set name       = ?,
            password   = ?,
            remark     = ?,
            gender     = ?,
            major      = ?,
            title      = ?,
            education  = ?,
            "isGP"     = ?,
            hospital   = ?,
            department = ?,
            updated_at = ?
        where id = ?`,
      name,
      password,
      remark,
      gender,
      major,
      title,
      education,
      isGP,
      hospital,
      department,
      dayjs().toDate(),
      id
    );
    // 如果传了科室,修改科室
    if (department) {
      return await appDB.execute(
        // language=PostgreSQL
        `
          update staff_area_mapping
          set department = ?,
              updated_at = ?
          where staff = ?
            and area = ?
        `,
        department,
        dayjs().toDate(),
        id,
        hospital
      );
    }
  }

  /**
   * 删除员工信息
   * @param id 员工id
   * @param hospital 员工所在机构
   */
  @validate(should.string().required(), should.string().required())
  async delete(id, hospital) {
    // 先查询是否绑定过工分项
    const itemMapping = await appDB.execute(
      // language=PostgreSQL
      `
        select mapping.id, mapping.staff
        from his_staff_work_item_mapping mapping
               left join his_work_item item on mapping.item = item.id
        where mapping.staff = ?
          and item.hospital = ?
      `,
      id,
      hospital
    );
    if (itemMapping.length > 0) throw new KatoRuntimeError(`员工已绑定工分项`);

    // 查询员工是否绑定过方案
    const checkMapping = await appDB.execute(
      // language=PostgreSQL
      `
        select checkMapping.staff, checkMapping."check"
        from his_staff_check_mapping checkMapping
               inner join his_check_system system on checkMapping."check" = system.id
        where staff = ?
          and system.hospital = ?
      `,
      id,
      hospital
    );
    if (checkMapping.length > 0) throw new KatoRuntimeError(`员工已绑定方案`);

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

    return appDB.transaction(async () => {
      // 删除员工和地区关联表
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

      // 把主机构,主科室为空
      return await appDB.execute(
        // language=PostgreSQL
        `
          update staff
          set hospital   = null,
              department = null,
              updated_at = ?
          where id = ?
        `,
        dayjs().toDate(),
        id
      );
    });
  }

  /**
   * 员工列表
   *
   * @param phone 手机号
   * @param name 姓名
   * @return [{
   *  id: '员工id',
   *  name: '姓名',
   *  phone: '手机号',
   *  gender: '性别',
   *  major: '专业类别',
   *  title: '职称名称',
   *  education: '学历',
   *  isGP: 是否为全科医师,
   *  created_at: '创建时间',
   *  updated_at: '修改时间',
   *  hospital: '机构id',
   *  department: '科室id',
   *  remark: '备注',
   *  departmentName: '科室名称',
   *  hisStaff: [{
   *    id: 'his员工id',
   *    name: 'his员工名称'
   *  }],
   *  phStaff: [{
   *    id: '公卫员工id',
   *    name: '公卫员工名称'
   *  }]
   * }]
   */
  @validate(should.string().allow(null), should.string().allow(null))
  async list(phone, name) {
    const hospital = await getHospital();
    // 用户名查询模糊查询
    if (phone) phone = `%${phone}%`;
    if (name) name = `%${name}%`;

    const [sql, params] = sqlRender(
      `
        select
          staff.id,
          staff.name,
          staff.phone,
          staff.gender,
          staff.major,
          staff.title,
          staff.education,
          staff."isGP",
          staff.created_at,
          staff.updated_at,
          area.area hospital,
          area.department,
          area.remark,
          dept.name "departmentName"
        from staff
        left join staff_area_mapping area on staff.id = area.staff
        left join his_department dept on area.department = dept.id
        where area.area = {{? hospital}}
        {{#if phone}}
            AND staff.phone like {{? phone}}
        {{/if}}
        {{#if name}}
            AND staff.name like {{? name}}
        {{/if}}
        order by staff.created_at
      `,
      {
        hospital,
        phone,
        name
      }
    );
    const staffList = (await appDB.execute(sql, ...params))?.map(it => ({
      ...it,
      hisStaff: [],
      phStaff: []
    }));

    const hisStaffs = await getHisStaff(hospital);

    // 根据绑定关系查询公卫机构下的所有员工
    const sysUserList = await getPhStaff(hospital);

    // his员工id
    const hisStaffIds = hisStaffs.map(it => it.id);

    // 公卫员工id
    const phStaffIds = sysUserList.map(it => it.id);

    // 公卫员工列表
    if (phStaffIds.length > 0) {
      const phStaffList = (
        await appDB.execute(
          // language=PostgreSQL
          `
            select ph.staff, ph.ph_staff
            from staff_area_mapping area
                   inner join staff_ph_mapping ph on area.staff = ph.staff
            where area.area = ?
              and ph.ph_staff in (${phStaffIds.map(() => '?')})
          `,
          hospital,
          ...phStaffIds
        )
      )?.map(it => {
        const phFind = sysUserList.find(phIt => phIt.id === it.ph_staff);
        return {
          staff: it.staff,
          phStaff: it.ph_staff,
          phStaffName: phFind?.name ?? ''
        };
      });

      for (const it of phStaffList) {
        const findIndex = staffList.find(staffIt => staffIt.id === it.staff);
        if (findIndex)
          findIndex.phStaff.push({
            id: it.phStaff,
            name: it.phStaffName
          });
      }
    }
    // HIS员工列表
    if (hisStaffIds.length > 0) {
      const hisStaffList = (
        await appDB.execute(
          // language=PostgreSQL
          `
            select his.staff, his.his_staff
            from staff_area_mapping area
                   inner join staff_his_mapping his on area.staff = his.staff
            where area.area = ?
              and his.his_staff in (${hisStaffIds.map(() => '?')})
          `,
          hospital,
          ...hisStaffIds
        )
      )?.map(it => {
        const hisFind = hisStaffs.find(hisIt => hisIt.id === it.his_staff);
        return {
          staff: it.staff,
          hisStaff: it.his_staff,
          hisStaffName: hisFind?.name ?? ''
        };
      });

      for (const it of hisStaffList) {
        const findIndex = staffList.find(staffIt => staffIt.id === it.staff);
        if (findIndex)
          findIndex.hisStaff.push({
            id: it.hisStaff,
            name: it.hisStaffName
          });
      }
    }
    return staffList;
  }

  async staffTree() {
    const hospital = await getHospital();
    // 获取可选择的员工列表
    const staffList = await appDB.execute(
      // language=PostgreSQL
      `
        select staff.id,
               staff.name,
               areaMapping.department,
               dept.name "deptName"
        from staff
               left join staff_area_mapping areaMapping on staff.id = areaMapping.staff
               left join his_department dept on areaMapping.department = dept.id
        where areaMapping.area = ?
      `,
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
   * @param hospital 机构
   *
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
  @validate(
    should.string().required(),
    should.date().required(),
    should.string().allow(null)
  )
  async findWorkScoreList(
    id,
    month,
    hospital
  ): Promise<{
    day: Date;
    items: {
      id: string;
      name: string;
      score: number;
      typeId?: string;
      typeName?: string;
      order?: number;
      created_at?: Date;
    }[];
    rate?: number;
  }> {
    // 获取所传月份的开始时间 即所在月份的一月一号
    const monthTime = monthToRange(month);
    // 当天的开始时间和结束时间
    const {start, end} = dayToRange(monthTime.start);

    // 工分只存储在一号那一天,所以只查询一号
    // language=PostgreSQL
    let workItems: {
      id: string;
      name: string;
      typeId: string;
      typeName: string;
      order: number;
      score: number;
      hospital: string;
      updated_at: Date;
      created_at?: Date;
    }[] = await appDB.execute(
      `
        select result.item_id   "id",
               result.item_name "name",
               result.type_id   "typeId",
               result.type_name "typeName",
               result."order",
               result.score,
               result.updated_at,
               result.hospital,
               item.created_at
        from his_staff_work_result result
               left join his_work_item item on result.item_id = item.id
        where result.staff_id = ?
          and result.time >= ?
          and result.time < ?
      `,
      id,
      start,
      end
    );
    // 如果机构为空,查询此员工的所有公分项,return结果
    if (!hospital) {
      return {
        day: start,
        rate: null,
        items: workItems
      };
    }
    // 如果机构不为空,筛选出此机构的公分项
    workItems = workItems.filter(it => it.hospital === hospital);

    // 查询质量系数
    // language=PostgreSQL
    const assessResultModel: AssessModel[] = await appDB.execute(
      `
        select result.id,
               result.staff_id    "staffId",
               result.time,
               result.system_id   "systemId",
               result.system_name "systemName",
               result.rule_id     "ruleId",
               result.rule_name   "ruleName",
               result.score,
               result.total
        from his_staff_assess_result result
        where result.staff_id = ?
          and result.hospital = ?
          and result.time >= ?
          and result.time < ?
      `,
      id,
      hospital,
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
   * @param hospital 机构
   */
  @validate(
    should.string().required(),
    should.date().required(),
    should.string().allow(null)
  )
  async staffCheck(staff, month, hospital) {
    if (!hospital) throw new KatoRuntimeError(`该员工没有考核方案`);
    // 查询员工和方案绑定是否存在
    const hisSystems = await appDB.execute(
      // language=PostgreSQL
      `
        select checkMapping."check" "checkId",
               checkMapping.staff,
               system.id,
               system.name
        from his_staff_check_mapping checkMapping
               inner join his_check_system system on checkMapping."check" = system.id
        where staff = ?
          and system.hospital = ?
      `,
      staff,
      hospital
    );
    if (hisSystems.length === 0)
      throw new KatoRuntimeError(`该员工没有考核方案`);

    const checkId = hisSystems[0]?.id;

    // 根据方案查询细则
    const checkRuleModels = await appDB.execute(
      // language=PostgreSQL
      `
        select *
        from his_check_rule
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
    const assessResultModel: AssessModel[] = await appDB.execute(
      // language=PostgreSQL
      `
        select result.id,
               result.staff_id    "staffId",
               result.time,
               result.system_id   "systemId",
               result.system_name "systemName",
               result.rule_id     "ruleId",
               result.rule_name   "ruleName",
               result.score,
               result.total
        from his_staff_assess_result result
               left join his_check_system system on result.system_id = system.id
        where result.staff_id = ?
          and system.hospital = ?
          and result.time >= ?
          and result.time < ?`,
      staff,
      hospital,
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
