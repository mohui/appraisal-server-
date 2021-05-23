import {appDB} from '../../app';
import * as uuid from 'uuid';
import {getHospital} from './his_staff';
import * as dayjs from 'dayjs';
import {KatoRuntimeError, should, validate} from 'kato-server';
import {HisWorkMethod, HisWorkSource} from '../../../common/his';

export default class HisCheck {
  async list() {
    const hospital = await getHospital();
    const systemList = await appDB.execute(
      `select
              system.id,
              system.hospital,
              system.name,
              mapping.staff
        from his_check_system system
        left join his_staff_check_mapping mapping on system.id = mapping."check"
        where system.hospital = ?
      `,
      hospital
    );
    const returnList = [];
    for (const it of systemList) {
      const findIndex = returnList.find(find => find?.id === it.id);
      if (findIndex) {
        findIndex.staffs.push({
          staff: it.staff
        });
      } else {
        returnList.push({
          id: it.id,
          name: it.name,
          staffs: [
            {
              staff: it.staff
            }
          ]
        });
      }
    }
    return returnList;
  }

  /**
   * 新建考核方案
   * 1个员工只能被一个考核方案考核
   *
   * @param name 考核名称
   * @param staffs 考核员工
   * @param automations 自动指标
   * @param manuals 手动指标
   */
  @validate(
    should
      .string()
      .required()
      .description('方案名称'),
    should
      .array()
      .required()
      .description('考核员工'),
    should
      .array()
      .items({
        auto: should
          .boolean()
          .required()
          .description('是否自动考核'),
        name: should
          .string()
          .allow(null)
          .description('名称,手动打分必有'),
        metric: should
          .string()
          .required()
          .description('指标,自动打分必有'),
        operator: should
          .string()
          .required()
          .description('计算方式,自动打分必有'),
        value: should
          .number()
          .required()
          .description('参考值'),
        score: should
          .number()
          .required()
          .description('分值')
      })
      .allow(null)
      .description('自动考核细则'),
    should
      .array()
      .items({
        auto: should
          .boolean()
          .required()
          .description('是否自动考核'),
        name: should
          .string()
          .required()
          .description('名称,手动打分必有'),
        detail: should
          .string()
          .required()
          .description('名称,手动打分必有'),
        score: should
          .number()
          .required()
          .description('分值')
      })
      .allow(null)
      .description('自动考核细则')
  )
  async add(name, staffs, automations, manuals) {
    if (!automations && !manuals)
      throw new KatoRuntimeError(`自动打分和手动打分不能都为空`);
    const hospital = await getHospital();
    return appDB.transaction(async () => {
      const staffList = await appDB.execute(
        `select * from his_staff_check_mapping
              where staff in (${staffs.map(() => '?')})`,
        ...staffs
      );
      if (staffList.length > 0)
        throw new KatoRuntimeError(`有员工已被其他考核方案考核`);
      // 添加考核方案名称
      const checkId = uuid.v4();
      await appDB.execute(
        `insert into
              his_check_system(id, hospital, name, created_at, updated_at)
              values(?, ?, ?, ?, ?)`,
        checkId,
        hospital,
        name,
        dayjs().toDate(),
        dayjs().toDate()
      );
      // 添加考核员工
      await appDB.execute(
        `
        insert into
        his_staff_check_mapping(staff, "check", created_at, updated_at)
        values${staffs.map(() => '(?, ?, ?, ?)').join()}
        `,
        ...staffs
          .map(it => [it, checkId, dayjs().toDate(), dayjs().toDate()])
          .reduce((prev, current) => {
            return [...prev, ...current];
          }, [])
      );
      // 添加自动打分
      if (automations) {
        for (const ruleIt of automations) {
          // 自动打分
          await appDB.execute(
            `insert into
              his_check_rule(id, "check", auto, name, metric,
                operator, value, score, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            uuid.v4(),
            checkId,
            ruleIt.auto,
            ruleIt.name,
            ruleIt.metric,
            ruleIt.operator,
            ruleIt.value,
            ruleIt.score,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      }
      if (manuals) {
        // 手动打分
        for (const ruleIt of manuals) {
          // 手动打分
          await appDB.execute(
            `insert into
              his_check_rule(id, "check", auto, name, detail, score, created_at, updated_at)
              values(?, ?, ?, ?, ?, ?, ?, ?)`,
            uuid.v4(),
            checkId,
            ruleIt.auto,
            ruleIt.name,
            ruleIt.detail,
            ruleIt.score,
            dayjs().toDate(),
            dayjs().toDate()
          );
        }
      }
    });
  }

  /**
   * 删除考核方案
   */
  async delete(id) {
    return appDB.transaction(async () => {
      // 删除医疗考核规则
      await appDB.execute(`delete from his_check_rule where "check" = ?`, id);
      // 删除员工考核方案绑定
      await appDB.execute(
        `delete from his_staff_check_mapping where "check" = ?`,
        id
      );
      // 删除医疗考核方案
      await appDB.execute(`delete from his_check_system where id = ?`, id);
    });
  }
}
