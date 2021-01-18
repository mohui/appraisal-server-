import {
  CheckHospitalModel,
  CheckRuleModel,
  CheckSystemModel,
  ReportHospitalHistoryModel,
  ReportHospitalModel,
  RuleHospitalAttachModel,
  RuleHospitalBudgetModel,
  RuleHospitalModel,
  RuleHospitalScoreModel,
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
              checkStandard: cRule.evaluate_standard,
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
  async add(params) {
    return CheckSystemModel.create({
      ...params,
      checkType: 1,
      create_by: Context.current.user.id,
      update_by: Context.current.user.id
    });
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
  updateName(params) {
    return appDB.transaction(async () => {
      const sys = await CheckSystemModel.findOne({
        where: {checkId: params.checkId},
        lock: true
      });
      if (!sys) throw new KatoCommonError('该考核不存在');
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
  async addRule(params) {
    return appDB.transaction(async () => {
      const rule = await CheckRuleModel.create(params);
      //将用户所拥有,并且没有关联其他考核的机构,关联上这个rule
      const limitHospitals = await CheckHospitalModel.findAll({
        where: {
          checkId: params.checkId,
          hospitalId: {[Op.in]: Context.current.user.hospitals.map(it => it.id)}
        }
      });
      await RuleHospitalModel.bulkCreate(
        limitHospitals.map(h => ({
          hospitalId: h.hospitalId,
          ruleId: rule.ruleId
        }))
      );
      return rule;
    });
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
    if (params?.budget) options['budget'] = params.budget;
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
  async updateRule(params) {
    const {
      ruleId,
      ruleName,
      parentRuleId = '',
      evaluateStandard = '',
      ruleScore = '',
      checkStandard = '',
      checkMethod = '',
      status
    } = params;
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

  @validate(
    should
      .string()
      .required()
      .description('考核系统id')
  )
  async listHospitals(checkId) {
    //新增考核类型后，只考虑主考核类型(checkType:1)的1对1的绑定关系
    const checkSystem = await CheckSystemModel.findOne({
      where: {checkId}
    });
    if (!checkSystem) throw new KatoCommonError('未找到该考核系统');
    //绑定在其他考核系统下的机构
    let extraHospitals = [];
    // 如果当前考核体系是主考核, 那么排除绑定在其他主考核下的机构
    if (checkSystem.checkType === 1) {
      extraHospitals = await CheckHospitalModel.findAll({
        where: {checkId: {[Op.not]: checkId}},
        include: [
          {
            model: CheckSystemModel,
            where: {checkType: checkSystem.checkType},
            required: true // 外联查询时, 默认required为true
          }
        ]
      });
    }
    //用户所拥有的机构
    const result = Context.current.user.hospitals;
    //绑定在该考核系统的机构
    const hospitals = await CheckHospitalModel.findAll({where: {checkId}});

    return result
      .filter(h => !extraHospitals.find(item => h.id === item.hospitalId)) //用户可供修改的机构
      .map(h => ({
        ...h,
        selected: !!hospitals.find(item => h.id === item.hospitalId) //是否选择的标记
      }));
  }

  @validate(
    should.object({
      checkId: should
        .string()
        .required()
        .description('考核体系id'),
      hospitals: should
        .array()
        .allow([])
        .description('机构数组')
    })
  )
  async setHospitals(params) {
    const {checkId, hospitals} = params;
    // 查询考核体系
    const checkSystem = await CheckSystemModel.findOne({where: {checkId}});
    if (!checkSystem) throw new KatoCommonError('该考核体系不存在');
    // 判断是否是主考核
    if (checkSystem.checkType === 1) {
      // 主考核, 那么判断机构是否已经绑定过其他主考核了
      const bindOtherHospitals = await CheckHospitalModel.findAll({
        where: {
          hospitalId: {[Op.in]: hospitals}
        },
        include: [
          {
            model: CheckSystemModel,
            where: {
              checkType: 1,
              checkId: {[Op.not]: checkId}
            }
          }
        ]
      });
      if (bindOtherHospitals.length > 0) {
        throw new KatoCommonError('存在绑定过其他考核的机构');
      }
    }

    //查询该体系下所有细则
    const allRules = await CheckRuleModel.findAll({
      where: {checkId: checkId, parentRuleId: {[Op.not]: null}}
    });
    if (allRules.length === 0)
      throw new KatoCommonError('该考核系统下没有细则');
    //当前用户所拥有的机构
    const userHospital = Context.current.user.hospitals.map(it => it.id);

    //查询这些细则原有的机构关系
    const ruleHospital = (
      await Promise.all(
        allRules.map(
          async rule =>
            await RuleHospitalModel.findAll({
              where: {
                ruleId: rule.ruleId,
                hospitalId: {[Op.in]: userHospital}
              } //过滤出不属于该用户管的机构
            })
        )
      )
    ).reduce((pre, next) => pre.concat(next), []);

    if (hospitals.find(h => !userHospital.find(u => u === h)))
      throw new KatoCommonError('权限不足');
    //删除被解绑的机构
    await Promise.all(
      ruleHospital
        .filter(item => !hospitals.find(h => h === item.hospitalId)) //过滤出需要解绑的机构
        .map(async it => await it.destroy())
    );
    //查询原有的考核与机构的关系
    const checkHospitals = await CheckHospitalModel.findAll({
      where: {
        checkId,
        hospitalId: {[Op.in]: userHospital}
      }
    });
    //删除被解绑的考核体系和机构的关系
    await Promise.all(
      checkHospitals
        .filter(item => !hospitals.find(h => h === item.hospitalId)) //过滤出需要解绑的机构
        .map(async it => await it.destroy())
    );
    //筛选出解绑的机构
    const unHospitals = ruleHospital
      .filter(item => !hospitals.find(h => h === item.hospitalId))
      .map(r => r.hospitalId);
    //删除机构金额数据
    await RuleHospitalBudgetModel.destroy({
      where: {hospitalId: {[Op.in]: unHospitals}},
      include: [{model: CheckRuleModel, where: {checkId}}]
    });
    //删除机构得分数据
    await RuleHospitalScoreModel.destroy({
      where: {hospitalId: {[Op.in]: unHospitals}},
      include: [{model: CheckRuleModel, where: {checkId}}]
    });
    //删除机构定性指标文件
    await RuleHospitalAttachModel.destroy({
      where: {hospitalId: {[Op.in]: unHospitals}},
      include: [{model: CheckRuleModel, where: {checkId}}]
    });
    //删除机构的打分结果
    await ReportHospitalModel.destroy({
      where: {hospitalId: {[Op.in]: unHospitals}, checkId}
    });
    //删除解绑结构的今日历史打分结果
    await ReportHospitalHistoryModel.destroy({
      where: {
        hospitalId: {[Op.in]: unHospitals},
        date: dayjs().toDate(),
        checkId
      }
    });
    //添加新增的机构和规则对应关系
    let newRuleHospitals = [];
    hospitals
      .filter(
        //过滤出新增的机构
        hospitalId => !ruleHospital.find(r => r.hospitalId === hospitalId)
      )
      .forEach(hId => {
        allRules.forEach(rule => {
          //新增的机构与各个规则相对于的数据
          newRuleHospitals.push({
            hospitalId: hId,
            ruleId: rule.ruleId,
            auto: true
          });
        });
      });
    //批量添加考核系统和机构的关系
    CheckHospitalModel.bulkCreate(
      hospitals
        .filter(hId => !checkHospitals.find(h => h.hospitalId === hId))
        .map(item => ({
          hospitalId: item,
          checkId: checkId
        }))
    );
    //批量添加规则与机构的关系数据
    return RuleHospitalModel.bulkCreate(newRuleHospitals);
  }
}
