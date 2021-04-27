import {
  CheckRuleModel,
  CheckSystemModel,
  RuleProjectModel,
  RuleTagModel,
  CheckAreaModel
} from '../database/model';
import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {appDB} from '../app';
import {Op} from 'sequelize';
import {MarkTagUsages} from '../../common/rule-score';
import {Projects} from '../../common/project';
import {Context} from './context';
import dayjs from 'dayjs';
import {AuditLog} from './middleware/audit-log';

export default class CheckSystem {
  /**
   * 获取考核体系详细数据
   *
   * 包括自身和规则
   *
   * @returns {Promise<void>}
   */
  async detail(id) {
    // 1. 查询考核体系
    const checkSystem = (
      await appDB.execute(`select * from check_system where check_id = ?`, id)
    )[0];

    if (!checkSystem) throw new KatoRuntimeError(`id为 ${id} 的考核体系不存在`);

    // 2. 查询考核小项
    const parentRules = await appDB.execute(
      `select * from check_rule where check_id = ? and parent_rule_id is null`,
      checkSystem.check_id
    );
    // 3. 查询考核细则
    const childRules = await appDB.execute(
      `select * from check_rule where check_id = ? and parent_rule_id is not null`,
      checkSystem.check_id
    );
    // 4. 添加考核细则到考核小项中
    for (let i = 0; i < parentRules.length; i++) {
      // 4.1 查询小项绑定的工分项
      const ruleProjects = await appDB.execute(
        `select * from rule_project where rule = ?`,
        parentRules[i].rule_id
      );
      parentRules[i].ruleProjects = ruleProjects;

      for (let j = 0; j < childRules.length; j++) {
        // 4.2 查询考核细则绑定的关联关系
        // language=PostgreSQL
        const ruleTags = await appDB.execute(
          `select * from rule_tag where rule = ?`,
          childRules[j].rule_id
        );
        childRules[j].ruleTags = ruleTags;
        if (parentRules[i].rule_id === childRules[j].parent_rule_id) {
          (parentRules[i].childRules = parentRules[i].childRules || []).push(
            childRules[j]
          );
        }
      }
    }
    const rows = parentRules
      .map(pRule => ({
        ruleId: pRule.rule_id,
        ruleName: pRule.rule_name,
        checkId: pRule.check_id,
        budget: pRule.budget,
        created_at: pRule.created_at,
        updated_at: pRule.updated_at,
        projects: pRule.ruleProjects.map(it =>
          Projects.find(p => p.id === it.projectId)
        ),
        group:
          pRule.childRules
            ?.map(cRule => ({
              budget: cRule.budget,
              checkId: cRule.check_id,
              checkMethod: cRule.check_method,
              checkStandard: cRule.check_standard,
              create_by: cRule.create_by,
              created_at: cRule.created_at,
              evaluateStandard: cRule.evaluate_standard,
              parentRuleId: cRule.parent_rule_id,
              ruleId: cRule.rule_id,
              ruleName: cRule.rule_name,
              ruleScore: cRule.rule_score,
              ruleTags: cRule.ruleTags.map(it => ({
                id: it.id,
                algorithm: it.algorithm,
                baseline: it.baseline,
                score: it.score,
                attachStartDate: it.attach_start_data ?? null,
                attachEndDate: it.attach_end_data ?? null,
                tag: it.tag,
                name: MarkTagUsages[it.tag].name
              })),
              status: cRule.status,
              update_by: cRule.update_by,
              updated_at: cRule.updated_at
            }))
            .sort((a, b) =>
              dayjs(a.created_at).isAfter(b.created_at) ? 1 : -1
            ) ?? []
      }))
      .sort((a, b) => (dayjs(a.created_at).isAfter(b.created_at) ? 1 : -1));
    return {
      ...checkSystem,
      rows
    };
  }

  //添加考核系统
  @validate(
    should.object({
      checkName: should
        .string()
        .required()
        .description('考核系统名'),
      checkYear: should.number().required()
    })
  )
  @AuditLog(async () => {
    Context.current.auditLog.module = '配置管理';
    Context.current.auditLog.curd = 'insert';
    Context.current.auditLog.type = 'check';
    return {
      extra: Context.current.auditLog
    };
  })
  async add(params) {
    const addCheck = await CheckSystemModel.create({
      ...params,
      checkType: 1,
      create_by: Context.current.user.id,
      update_by: Context.current.user.id
    });

    // 写入日志
    Context.current.auditLog = {};
    Context.current.auditLog.checkId = addCheck?.checkId;
    Context.current.auditLog.checkName = addCheck?.checkName;
    Context.current.auditLog.checkYear = addCheck?.checkYear;

    return addCheck;
  }

  //更新考核系统名称
  @validate(
    should.object({
      checkId: should
        .string()
        .required()
        .description('考核体系id'),
      checkName: should
        .string()
        .required()
        .description('考核系统名称'),
      status: should
        .boolean()
        .required()
        .description('状态值:true||false'),
      checkYear: should.number().required()
    })
  )
  @AuditLog(async () => {
    Context.current.auditLog.module = '配置管理';
    Context.current.auditLog.curd = 'update';
    Context.current.auditLog.type = 'check';
    return {
      extra: Context.current.auditLog
    };
  })
  updateName(params) {
    Context.current.auditLog = {};
    Context.current.auditLog.checkId = params?.checkId;
    Context.current.auditLog.checkName = params?.checkName;
    return appDB.transaction(async () => {
      const sys = await CheckSystemModel.findOne({
        where: {checkId: params.checkId},
        lock: true
      });
      if (!sys) throw new KatoCommonError('该考核不存在');

      Context.current.auditLog.checkYear = params?.checkYear;
      // 现有考核体系
      // language=PostgreSQL
      const checkAreaModels = await appDB.execute(
        `
          select a.name
          from check_area ca
                 inner join check_system cs on ca.check_system = cs.check_id
                 inner join area a on ca.area = a.code
          where check_year = ?
            and ca.area in (
            select c.area
            from check_area c
            where c.check_system = ?
          )
        `,
        params.checkYear,
        params.checkId
      );
      if (checkAreaModels.length > 0)
        throw new KatoCommonError(
          `${checkAreaModels.map(it => it.name).join()} 已被其他考核体系绑定`
        );
      await CheckSystemModel.update(
        {
          checkName: params.checkName,
          update_by: Context.current.user.id,
          status: params.status,
          checkYear: params.checkYear
        },
        {where: {checkId: params.checkId}}
      );
    });
  }

  //添加考核细则
  @validate(
    should.object({
      checkId: should
        .string()
        .required()
        .description('考核系统id'),
      ruleName: should
        .string()
        .required()
        .description('规则名称'),
      parentRuleId: should
        .string()
        .required()
        .description('所属分组id'),
      ruleScore: should
        .number()
        .required()
        .description('得分'),
      checkStandard: should
        .string()
        .required()
        .description('考核标准'),
      checkMethod: should
        .string()
        .required()
        .description('考核方法'),
      status: should
        .boolean()
        .required()
        .description('状态'),
      evaluateStandard: should
        .string()
        .required()
        .description('评分标准')
    })
  )
  @AuditLog(async () => {
    Context.current.auditLog.module = '配置管理';
    Context.current.auditLog.curd = 'insert';
    Context.current.auditLog.type = 'check';
    return {
      extra: Context.current.auditLog
    };
  })
  async addRule(params) {
    const result = await appDB.transaction(async () => {
      return CheckRuleModel.create(params);
    });
    // 写入日志
    Context.current.auditLog = {};
    Context.current.auditLog.checkId = params?.checkId;
    Context.current.auditLog.ruleId = result?.ruleId;
    Context.current.auditLog.ruleName = result?.ruleName;
    return result;
  }

  //添加规则组
  @validate(
    should.object({
      checkId: should
        .string()
        .required()
        .description('所属的考核系统id'),
      ruleName: should
        .string()
        .required()
        .description('规则组的名称'),
      budget: should.number().description('规则组分配的金额'),
      projects: should
        .array()
        .items(should.string())
        .description('工分项')
    })
  )
  @AuditLog(async () => {
    Context.current.auditLog.module = '配置管理';
    Context.current.auditLog.curd = 'insert';
    Context.current.auditLog.type = 'check';
    return {
      extra: Context.current.auditLog
    };
  })
  async addRuleGroup(params) {
    const {projects} = params;
    const rule = await CheckRuleModel.create(params);

    if (projects?.length > 0) {
      await RuleProjectModel.bulkCreate(
        projects.map(item => ({
          ruleId: rule.ruleId,
          projectId: item
        }))
      );
    }
    // 写入日志
    Context.current.auditLog = {};
    Context.current.auditLog.checkId = rule?.checkId;
    Context.current.auditLog.parentRuleId = rule?.ruleId;
    Context.current.auditLog.parentRuleName = rule?.ruleName;
    return rule;
  }

  //更新规则组
  @validate(
    should.object({
      ruleId: should.string().required(),
      ruleName: should.string(),
      budget: should.number(),
      projects: should
        .array()
        .items(should.string())
        .description('工分项')
    })
  )
  @AuditLog(async () => {
    Context.current.auditLog.module = '配置管理';
    Context.current.auditLog.curd = 'update';
    Context.current.auditLog.type = 'check';
    return {
      extra: Context.current.auditLog
    };
  })
  async updateRuleGroup(params) {
    const {ruleId, projects} = params;
    const group = await CheckRuleModel.findOne({
      where: {ruleId: ruleId},
      lock: true
    });
    if (!group) throw new KatoCommonError('该规则组不存在');
    if (group.parent) throw new KatoCommonError('该规则是一个细则');
    let options = {};
    if (params?.ruleName) options['ruleName'] = params.ruleName;
    if (params?.budget || params?.budget === 0)
      options['budget'] = params.budget;
    if (projects) {
      //删除原有的project绑定关系
      await Promise.all(
        (
          await RuleProjectModel.findAll({
            where: {rule: ruleId}
          })
        ).map(async del => del.destroy())
      );
      //重新绑定project关系
      await RuleProjectModel.bulkCreate(
        projects.map(item => ({
          ruleId: ruleId,
          projectId: item
        }))
      );
    }
    // 写入日志
    Context.current.auditLog = {};
    Context.current.auditLog.checkId = group?.checkId;
    Context.current.auditLog.parentRuleId = ruleId;
    Context.current.auditLog.parentRuleName = params?.ruleName;
    //修改规则组
    return CheckRuleModel.update(options, {
      where: {ruleId: params.ruleId}
    });
  }

  //删除考核系统
  @validate(
    should
      .string()
      .required()
      .description('考核体系id')
  )
  @AuditLog(async () => {
    Context.current.auditLog.module = '配置管理';
    Context.current.auditLog.curd = 'delete';
    Context.current.auditLog.type = 'check';
    return {
      extra: Context.current.auditLog
    };
  })
  remove(id) {
    return appDB.transaction(async () => {
      //查询考核系统,并锁定
      const sys = await CheckSystemModel.findOne({
        where: {checkId: id},
        paranoid: false,
        lock: {of: CheckSystemModel},
        include: [CheckRuleModel]
      });
      if (!sys) throw new KatoCommonError('该考核系统不存在');

      // 写入日志
      Context.current.auditLog = {};
      Context.current.auditLog.checkId = sys?.checkId;
      Context.current.auditLog.checkName = sys?.checkName;
      Context.current.auditLog.checkYear = sys?.checkYear;

      if (await CheckAreaModel.findOne({where: {checkId: id}}))
        throw new KatoCommonError('该考核系统绑定了机构,无法删除');
      const ruleIds = sys.checkRules.map(rule => rule.ruleId);

      //删除该考核系统下的所有规则
      await Promise.all(
        sys.checkRules.map(async rule => await rule.destroy({force: true}))
      );
      // 删除细则指标对应[考核细则]
      await RuleTagModel.destroy({
        where: {
          ruleId: {[Op.in]: ruleIds}
        }
      });
      // 删除考核小项和公分项对应[考核小项]
      await RuleProjectModel.destroy({
        where: {
          ruleId: {[Op.in]: ruleIds}
        }
      });
      //删除该考核系统
      return await sys.destroy({force: true});
    });
  }

  //更新规则
  @validate(
    should.object({
      ruleId: should
        .string()
        .required()
        .description('规则id'),
      ruleName: should
        .string()
        .required()
        .description('规则名称'),
      parentRuleId: should.string().description('父规则id'),
      checkId: should
        .string()
        .required()
        .description('考核体系id'),
      ruleScore: should
        .number()
        .required()
        .description('得分'),
      checkStandard: should
        .string()
        .required()
        .description('考核标准'),
      checkMethod: should
        .string()
        .required()
        .description('考核方法'),
      status: should
        .boolean()
        .required()
        .description('状态'),
      evaluateStandard: should
        .string()
        .required()
        .description('评分标准')
    })
  )
  @AuditLog(async () => {
    Context.current.auditLog.module = '配置管理';
    Context.current.auditLog.curd = 'update';
    Context.current.auditLog.type = 'check';
    return {
      extra: Context.current.auditLog
    };
  })
  async updateRule(params) {
    const {
      ruleId,
      ruleName,
      parentRuleId = '',
      checkId,
      evaluateStandard = '',
      ruleScore = '',
      checkStandard = '',
      checkMethod = '',
      status
    } = params;
    // 写入日志
    Context.current.auditLog = {};
    Context.current.auditLog.checkId = checkId;
    Context.current.auditLog.ruleId = ruleId;
    Context.current.auditLog.ruleName = ruleName;

    return appDB.transaction(async () => {
      //查询规则,并锁定
      let rule = await CheckRuleModel.findOne({where: {ruleId}, lock: true});
      if (!rule) throw new KatoCommonError('该规则不存在');
      //判断指标汇总是否超标ruleScore
      if (
        ruleScore <
        (await RuleTagModel.findAll({where: {rule: ruleId}})).reduce(
          (result, current) => (result += current.score),
          0
        )
      )
        throw new KatoCommonError('规则对应的指标总分超标');
      //进行修改操作
      return CheckRuleModel.update(
        {
          ruleName,
          parentRuleId,
          ruleScore,
          checkMethod,
          checkStandard,
          evaluateStandard,
          status
        },
        {where: {ruleId}}
      );
    });
  }

  //删除规则
  @validate(
    should
      .string()
      .required()
      .description('规则id')
  )
  async removeRule(id) {
    await appDB.transaction(async () => {
      //查询并锁定
      const rule = await CheckRuleModel.findOne({
        where: {ruleId: id},
        lock: true
      });
      if (!rule) throw new KatoCommonError('该规则不存在');
      //如果是规则组,则删除其下的细则
      if (!rule.parentRuleId) {
        const childRules = await CheckRuleModel.findAll({
          where: {parentRuleId: rule.ruleId}
        });
        await Promise.all(childRules.map(async it => await it.destroy()));
      }
      await rule.destroy({force: true});
    });
  }

  //查询规则
  @validate(
    should
      .object({
        checkId: should
          .string()
          .allow(null, '')
          .description('考核体系id')
      })
      .allow(null)
  )
  async listRule(params) {
    const {checkId} = params || {};
    let whereOptions = {};
    if (checkId) whereOptions.checkId = checkId;
    //查询该体系下所有rules
    let allRules = await CheckRuleModel.findAll({
      where: whereOptions,
      order: [['created_at', 'ASC']],
      include: {
        model: RuleTagModel,
        attributes: [
          'id',
          'tag',
          'algorithm',
          'baseline',
          'score',
          'attachStartDate',
          'attachEndDate'
        ]
      }
    });

    //rule进行分组
    const ruleGroup = await Promise.all(
      allRules
        .filter(row => !row.parentRuleId)
        .map(async group => {
          //规则组绑定的工分项
          group.projects = (
            await RuleProjectModel.findAll({
              where: {ruleId: group.ruleId},
              attributes: ['projectId']
            })
          ).map(it => Projects.find(p => p.id === it.projectId));
          return group;
        })
    );
    allRules = ruleGroup.map(group => ({
      ruleId: group.ruleId,
      ruleName: group.ruleName,
      checkId: group.checkId,
      budget: group.budget,
      projects: group.projects,
      group: allRules
        .filter(rule => rule.parentRuleId === group.ruleId)
        .map(it => it.toJSON())
        .map(item => ({
          ...item,
          ruleTags: item.ruleTags.map(ruleTag => ({
            ...ruleTag,
            name: MarkTagUsages[ruleTag.tag].name
          }))
        }))
    }));
    return {count: ruleGroup.length, rows: allRules};
  }
}
