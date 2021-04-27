import {
  CheckAreaModel,
  CheckRuleModel,
  CheckSystemModel,
  ReportAreaHistoryModel,
  ReportAreaModel,
  RuleAreaAttachModel,
  RuleAreaBudgetModel,
  RuleAreaScoreModel,
  RuleProjectModel,
  RuleTagModel
} from '../../database/model';
import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {Op} from 'sequelize';
import {appDB} from '../../app';
import {getAreaTree} from '../group';
import {Context} from '../context';
import * as dayjs from 'dayjs';
import * as uuid from 'uuid';
import {AuditLog} from '../middleware/audit-log';

export default class CheckAreaEdit {
  /**
   * 获取下级列表
   * @param code
   * @param checkId
   */
  async list(code, checkId) {
    if (!code) code = Context.current.user.regionId;
    // 查询考核体系
    const checkModel: CheckSystemModel = await CheckSystemModel.findOne({
      where: {checkId: checkId}
    });
    if (!checkModel) throw new KatoRuntimeError(`考核体系id ${checkId} 不合法`);
    // 获取code的子树
    const childTree = await getAreaTree(code);
    // 获取考核地区
    const checkAreaModels: {code: string}[] = await appDB.execute(
      `select area as code from check_area where check_system = ?`,
      checkId
    );
    // 选中的节点
    const checkedNodes = checkAreaModels
      .map(it => childTree.find(c => it.code === c.code))
      .filter(it => it);
    // 获取本年度其他考核体系绑定的地区
    const otherCheckAreaModels: {
      code: string;
      name: string;
    }[] = await appDB.execute(
      // language=PostgreSQL
      `
        select area as code, cs.check_name as name
        from check_area ca
               inner join check_system cs on ca.check_system = cs.check_id
        where check_system != ?
          and cs.check_year = ?`,
      checkModel.checkId,
      checkModel.checkYear
    );
    // 转换子节点
    return childTree
      .filter(c => c.parent === code)
      .map(c => ({
        name: c.name,
        code: c.code,
        parent: c.parent,
        system: otherCheckAreaModels.find(ca => ca.code === c.code)?.name,
        leaf: c.leaf,
        usable: !otherCheckAreaModels.find(ca => ca.code === c.code),
        selected: !!checkAreaModels.find(ca => ca.code === c.code),
        childSelected:
          !checkAreaModels.some(ca => ca.code === c.code) &&
          checkedNodes.some(cn => cn.path.some(ca => ca === c.code))
      }));
  }

  /**
   * 获取考核地区/机构对应的考核总体情况
   *
   * @param areas 地区或机构的code
   * @param checkId 考核体系 为空时默认查找主考核体系
   * @return { id: id, name: '名称', score: '考核得分', rate: '质量系数'}
   */
  async editArea(checkId, areas) {
    // 查询考核体系
    const checkSystem = await CheckSystemModel.findOne({where: {checkId}});
    if (!checkSystem) throw new KatoCommonError('该考核体系不存在');

    // 取出年份
    const year = checkSystem.checkYear;

    // 根据地区和年份获取考核id
    const bindOtherAreas = await CheckAreaModel.findAll({
      attributes: ['checkId', 'areaCode'],
      where: {
        areaCode: {
          [Op.in]: areas
        },
        checkId: {
          [Op.ne]: checkId
        }
      },
      include: [
        {
          model: CheckSystemModel,
          where: {
            checkYear: year
          },
          attributes: []
        }
      ]
    });
    if (bindOtherAreas.length > 0) {
      throw new KatoCommonError('存在绑定过其他考核的地区');
    }

    //查询该体系下所有细则
    const allRules = await CheckRuleModel.findAll({
      where: {
        checkId: checkId,
        parentRuleId: {[Op.not]: null}
      }
    });
    if (allRules.length === 0)
      throw new KatoCommonError('该考核系统下没有细则');
    // 取出所有的考核细则id
    const checkRules = allRules.map(it => it.ruleId);
    // todo: 有个权限问题,过滤掉自己权限以外地区

    // 查询考核原有的考核地区
    const checkSystemArea = await CheckAreaModel.findAll({
      where: {
        checkId
      },
      attributes: ['areaCode']
    });
    // 筛选出需要解绑的地区id
    const deleteAreas = checkSystemArea
      .filter(it => !areas.find(item => item === it.areaCode))
      .map(it => it.areaCode);

    // 筛选出需要新增的机构
    const insertAreas = areas.filter(
      it => !checkSystemArea.find(item => it === item.areaCode)
    );

    // 找到了所有的待删除的和待添加的,放到事务中先删除再添加
    return appDB.transaction(async () => {
      // 批量删除
      if (deleteAreas.length > 0) {
        // 删除解绑的地区
        await CheckAreaModel.destroy({
          where: {
            areaCode: {[Op.in]: deleteAreas},
            checkId: checkId
          }
        });

        //删除地区金额数据
        await RuleAreaBudgetModel.destroy({
          where: {
            areaCode: {[Op.in]: deleteAreas}
          }
        });

        // 删除地区得分数据
        await RuleAreaScoreModel.destroy({
          where: {
            areaCode: {[Op.in]: deleteAreas}
          }
        });

        //删除机构的打分结果
        await ReportAreaModel.destroy({
          where: {
            areaCode: {[Op.in]: deleteAreas}
          }
        });
      }

      //删除解绑结构的今日历史打分结果
      await ReportAreaHistoryModel.destroy({
        where: {
          areaCode: {[Op.in]: deleteAreas},
          date: dayjs().toDate(),
          checkId
        }
      });

      //删除机构定性指标文件
      await RuleAreaAttachModel.destroy({
        where: {
          areaCode: {
            [Op.in]: deleteAreas
          },
          ruleId: {
            [Op.in]: checkRules
          }
        }
      });

      // 批量添加考核系统和机构的关系
      return CheckAreaModel.bulkCreate(
        insertAreas.map(it => ({
          areaCode: it,
          checkId: checkId
        }))
      );
    });
  }

  /**
   * 开启关闭细则的自动打分
   * @param code
   * @param ruleId
   * @param isAuto
   */
  @validate(
    should
      .string()
      .required()
      .description('地区id'),
    should.string().description('细则id'),
    should
      .boolean()
      .required()
      .description('是否自动打分')
  )
  async setRuleAuto(code, ruleId, isAuto) {
    //此关联是否存在
    const result = await RuleAreaScoreModel.findOne({
      where: {
        rule: ruleId,
        areaCode: code
      }
    });
    if (!result) throw new KatoCommonError('机构与规则未关联');
    result.auto = isAuto;
    await result.save();
  }

  /**
   * 设置考核下地区的自动打分
   * @param checkId 考核id
   * @param code 机构id
   * @param isAuto 是否开启 true || false
   * @returns {Promise<unknown[]>}
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.boolean().required()
  )
  async setCheckAuto(checkId, code, isAuto) {
    const check = await CheckSystemModel.findOne({where: {checkId}});
    if (!check) throw new KatoCommonError('该考核体系不存在');

    //修改该机构在考核系统下的所有规则的自动打分
    return appDB.execute(
      `
          update rule_area_score set auto = ?
          where area = ?
           and rule in (
            select rule_id
            from check_rule rule
            left join check_system system on rule.check_id = system.check_id
            where parent_rule_id is not null
             and system.check_id = ?
          )
      `,
      isAuto,
      code,
      checkId
    );
  }

  //删除规则
  @validate(
    should
      .string()
      .required()
      .description('规则id')
  )
  @AuditLog(async () => {
    Context.current.auditLog.module = '配置管理';
    Context.current.auditLog.curd = `delete`;
    Context.current.auditLog.type = 'check';
    return {
      extra: Context.current.auditLog
    };
  })
  async deleteRule(ruleId) {
    //查询并锁定
    const rule = await CheckRuleModel.findOne({
      where: {ruleId}
    });
    if (!rule) throw new KatoCommonError('该规则不存在');

    // 要删除的ruleId(包含小项和细则)
    let ruleIds = [];
    // 判断是否是考核小项,是需要删除其下的细则
    if (!rule.parentRuleId) {
      const childRules = await CheckRuleModel.findAll({
        where: {parentRuleId: rule.ruleId}
      });
      ruleIds = childRules.map(it => it.ruleId);
    }
    ruleIds.push(ruleId);

    // 事务执行语句
    return appDB.transaction(async () => {
      // 删除考核细则
      await CheckRuleModel.destroy({
        where: {
          ruleId: {[Op.in]: ruleIds}
        }
      });
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

      //删除地区金额数据[考核小项]
      await RuleAreaBudgetModel.destroy({
        where: {
          ruleId: {[Op.in]: ruleIds}
        }
      });
      // 删除地区得分数据[考核细则]
      await RuleAreaScoreModel.destroy({
        where: {
          ruleId: {[Op.in]: ruleIds}
        }
      });
      //删除机构定性指标文件[考核细则]
      await RuleAreaAttachModel.destroy({
        where: {
          ruleId: {
            [Op.in]: ruleIds
          }
        }
      });
      // 写入日志
      Context.current.auditLog = {};
      Context.current.auditLog.checkId = rule.checkId;
      Context.current.auditLog.ruleId = ruleId;
      Context.current.auditLog.ruleName = rule.ruleName;
    });
  }

  // 开启,关闭考核下所有地区,如果没有打过分会自动生成
  @validate(
    should
      .string()
      .required()
      .description('考核系统id'),
    should
      .boolean()
      .required()
      .description('是否自动打分,true false')
  )
  async setAllRuleAuto(checkId, isAuto) {
    // 取出权限下的地区
    const areaList = await getAreaTree(Context.current.user.code);
    // 取出当前考核下的所有地区
    const checkAreaModels: {area: string}[] = await appDB.execute(
      ` select area from check_area checkArea where check_system = ?`,
      checkId
    );

    for (const checkArea of checkAreaModels) {
      const item = areaList.find(it => checkArea.area === it.code);
      if (!item) throw new KatoCommonError('无开启考核和关闭考核权限');
    }

    //该考核系统下所有的细则
    const allRules: CheckRuleModel[] = await CheckRuleModel.findAll({
      where: {checkId, parentRuleId: {[Op.not]: null}}
    });
    return appDB.transaction(async () => {
      for (const rule of allRules) {
        await Promise.all(
          areaList.map(async area => {
            await RuleAreaScoreModel.upsert({
              ruleId: rule.ruleId,
              areaCode: area.code,
              auto: isAuto
            });
          })
        );
      }
    });
  }

  /**
   * 查询上级对自己的考核体系
   */
  async parentCheck() {
    const code = Context.current.user.areaCode;
    const year = dayjs().year();
    const checkArea = await appDB.execute(
      ` select checkArea.check_system "checkId",
              checkSystem.check_name "checkName",
              checkSystem.check_year "checkYear",
              checkSystem.status
            from check_area checkArea
            left join check_system checkSystem on checkArea.check_system = checkSystem.check_id
            where checkArea.area = ? and checkSystem.check_year = ? `,
      code,
      year
    );
    return checkArea[0];
  }

  // 复制考核
  @validate(
    should
      .string()
      .required()
      .description('待复制的考核系统id'),
    should
      .string()
      .required()
      .description('考核名称'),
    should
      .boolean()
      .required()
      .description('状态,是否停用'),
    should
      .number()
      .required()
      .description('考核年份')
  )
  async copySystem(checkId, checkName, status, checkYear) {
    /**
     * 1, 先把要复制的考核体系查询出来
     * 2, 查询考核细则
     * 3, 添加考核体系, 考核细则
     */

    // 事务执行添加语句
    return appDB.transaction(async () => {
      // 取出当前考核下的所有地区
      const checkSystemModel = await appDB.execute(
        ` select * from check_system where check_id = ?`,
        checkId
      );
      if (checkSystemModel.length < 1)
        throw new KatoCommonError('该考核体系不存在');

      // 查询考核细则
      const checkRuleModels = await appDB.execute(
        `select * from check_rule where check_id = ?`,
        checkId
      );
      if (checkRuleModels.length < 1)
        throw new KatoCommonError('该考核体系没有考核项目');

      // 筛选出所有的考核小项
      const parentRule = checkRuleModels
        .filter(it => !it['parent_rule_id'])
        .map(it => {
          return {
            ...it,
            children: [],
            project: []
          };
        });
      // 取出所有的考核小项id
      const parentIds = parentRule.map(it => it.rule_id);
      // 查询 考核小项和公分项对应
      const ruleProjectModels = await appDB.execute(
        `select * from rule_project where rule in (${parentIds.map(
          () => '?'
        )})`,
        ...parentIds
      );
      // 把公分项对应到考核小项中
      for (const it of ruleProjectModels) {
        const index = parentRule.find(item => it.rule === item.rule_id);
        if (index) index['project'].push(it);
      }

      // 取出所有细则
      const checkRules = checkRuleModels
        .filter(it => it['parent_rule_id'])
        .map(it => {
          return {
            ...it,
            tag: []
          };
        });

      // 取出所有细则id
      const ruleIds = checkRules.map(it => it.rule_id);
      // 查询 细则指标对应
      const ruleTagModels = await appDB.execute(
        `select * from rule_tag where rule in (${ruleIds.map(it => '?')})`,
        ...ruleIds
      );
      // 把指标对应到细则中
      for (const it of ruleTagModels) {
        const index = checkRules.find(item => item.rule_id === it.rule);
        if (index) index['tag'].push(it);
      }

      // 把考核细则放到考核小项下
      for (const it of checkRules) {
        const index = parentRule.find(
          item => it.parent_rule_id === item.rule_id
        );
        if (index) index['children'].push(it);
      }
      // 考核主键,后面添加的时候要用
      const systemId = uuid.v4();
      const checkSystemModelValues = [
        systemId,
        checkName,
        Context.current.user.id,
        Context.current.user.id,
        checkYear,
        status,
        dayjs().toDate(),
        dayjs().toDate(),
        1
      ];
      // 添加考核表
      const checkSystemModelAdd = await appDB.execute(
        `insert into check_system(
                  check_id,
                  check_name,
                  create_by,
                  update_by,
                  check_year,
                  status,
                  created_at,
                  updated_at,
                  check_type)
              values(${checkSystemModelValues.map(() => '?')})`,
        ...checkSystemModelValues
      );
      if (!checkSystemModelAdd) throw new KatoCommonError('添加失败');

      // 添加考核内容表 先添加考核小项,再添加考核细则
      for (const rule of parentRule) {
        // 考核小项id,添加细则和添加考核小项和公分项对应需要用到
        const ruleId = uuid.v4();
        const checkRuleModelValues = [
          ruleId,
          systemId,
          rule.rule_name,
          dayjs().toDate(),
          dayjs().toDate(),
          rule.budget
        ];
        // 添加考核小项
        await appDB.execute(
          `insert into check_rule(
                       rule_id,
                       check_id,
                       rule_name,
                       created_at,
                       updated_at,
                       budget)
              values(${checkRuleModelValues.map(() => '?')})`,
          ...checkRuleModelValues
        );
        // 考核小项和公分项对应
        for (const project of rule.project) {
          const projectValues = [
            ruleId,
            project.projectId,
            dayjs().toDate(),
            dayjs().toDate()
          ];
          await appDB.execute(
            `insert into rule_project(
                          rule,
                          "projectId",
                          created_at,
                          updated_at)
                      values(${projectValues.map(() => '?')})`,
            ...projectValues
          );
        }
        // 添加考核细则
        for (const childrenRule of rule.children) {
          // 细则id,添加细则指标对应需要用到
          const childrenRuleId = uuid.v4();
          const checkRuleChildrenModelValues = [
            childrenRuleId,
            systemId,
            ruleId,
            childrenRule.rule_name,
            childrenRule.rule_score,
            childrenRule.check_standard,
            childrenRule.check_method,
            childrenRule.evaluate_standard,
            childrenRule.status,
            dayjs().toDate(),
            dayjs().toDate()
          ];
          // 考核细则添加执行
          await appDB.execute(
            `insert into check_rule(
                       rule_id,
                       check_id,
                       parent_rule_id,
                       rule_name,
                       rule_score,
                       check_standard,
                       check_method,
                       evaluate_standard,
                       status,
                       created_at,
                       updated_at)
              values(${checkRuleChildrenModelValues.map(() => '?')})`,
            ...checkRuleChildrenModelValues
          );
          // 细则指标对应
          for (const tag of childrenRule.tag) {
            const ruleTagValues = [
              uuid.v4(),
              childrenRuleId,
              tag.tag,
              tag.algorithm,
              tag.baseline,
              tag.score,
              dayjs().toDate(),
              dayjs().toDate(),
              tag.attach_start_date,
              tag.attach_end_date
            ];
            await appDB.execute(
              `insert into rule_tag(
                            id,
                            rule,
                            tag,
                            algorithm,
                            baseline,
                            score,
                            created_at,
                            updated_at,
                            attach_start_date,
                            attach_end_date)
                       values(${ruleTagValues.map(() => '?')})
              `,
              ...ruleTagValues
            );
          }
        }
      }
    });
  }

  /**
   * 添加年度结算
   * @param code 考核地区
   * @param year 年份
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id'),
    should
      .number()
      .required()
      .description('年份')
  )
  async upsertMoney(code, year) {
    // 获取要插入的金额列表
    return appDB.transaction(async () => {
      // 先获取下级地区
      const areaModels = await appDB.execute(
        `SELECT "code", "name" FROM area WHERE parent = ?`,
        code
      );
      // 取出地区所有的下级地区id
      const areaList = areaModels.map(it => it.code);
      // 根据地区和年份查询考核id
      const checkAreaModels = await appDB.execute(
        `
        SELECT
          CheckArea.check_system AS "checkId",
          CheckArea.area AS "areaCode"
        FROM check_area AS CheckArea
        INNER JOIN check_system AS checkSystem ON CheckArea.check_system = checkSystem.check_id
        WHERE checkSystem.check_year = ?
         AND CheckArea.area IN (${areaList.map(() => '?')})`,
        year,
        ...areaList
      );

      let reportAreaModels = [];
      if (checkAreaModels.length > 0) {
        // 取出所有的考核id
        const checkIds = checkAreaModels.map(it => it.checkId);
        // 根据考核id和考核地区查询校正后公分值, 质量系数, 金额
        reportAreaModels = await appDB.execute(
          `
        SELECT area AS code,
          "correctWorkPoint",
          rate,
          budget
        FROM report_area
        WHERE area IN (${areaList.map(() => '?')})
          AND "check" IN (${checkIds.map(() => '?')})
      `,
          ...areaList,
          ...checkIds
        );
      }
      // 补充没有查到的地区
      const AreaMoneyInfo = areaModels.map(it => {
        const index = reportAreaModels.find(item => it.code === item.code);
        if (index) return index;
        else
          return {
            code: it.code,
            correctWorkPoint: 0,
            rate: 0,
            budget: 0
          };
      });

      // -------- 以上都是查询要插入的数据, 下面是处理查询到的数据并插入到表中 --------

      // 查询要插入的地区是否已经在表中
      const areaBudgetModels = await appDB.execute(
        `
        select * from area_budget
        where year = ? and  area in (${areaList.map(() => '?')}) `,
        year,
        ...areaList
      );
      // 如果在,执行更新操作,如果不在,执行插入
      if (areaBudgetModels.length === 0) {
        // 查询结果为空,执行插入语句
        for (const it of AreaMoneyInfo) {
          const insertArr = [
            it.code,
            year,
            it.correctWorkPoint,
            it.rate,
            it.budget,
            dayjs().toDate(),
            dayjs().toDate()
          ];
          await appDB.execute(
            `insert into area_budget(
            area,
            year,
            correct_work_point,
            rate,
            budget,
            created_at,
            updated_at)
          values (${insertArr.map(() => '?')})`,
            ...insertArr
          );
        }
      } else {
        // 查询结果不为空, 分两种情况,查询结果是否和要查的数据一致,一致,执行更新,不一致,插入没有查询出的,更新查询出的数据
        const insertAreaBudget = [];
        const updateAreaBudget = AreaMoneyInfo.map(it => {
          const index = areaBudgetModels.find(item => it.code === item.area);
          if (index) {
            return it;
          } else {
            insertAreaBudget.push(it);
          }
        }).filter(it => it);
        // 如果存在area_budget表中没有的数据,要插入
        if (insertAreaBudget.length > 0) {
          for (const it of insertAreaBudget) {
            const insertArr = [
              it.code,
              year,
              it.correctWorkPoint,
              it.rate,
              it.budget,
              dayjs().toDate(),
              dayjs().toDate()
            ];
            await appDB.execute(
              `insert into area_budget(
            area,
            year,
            correct_work_point,
            rate,
            budget,
            created_at,
            updated_at)
          values (${insertArr.map(() => '?')})`,
              ...insertArr
            );
          }
        }
        // 需要更新的数据
        for (const it of updateAreaBudget) {
          const updateArr = [
            it.correctWorkPoint,
            it.rate,
            it.budget,
            dayjs().toDate(),
            it.code,
            year
          ];
          await appDB.execute(
            `
          update area_budget set
            correct_work_point = ?,
            rate = ?,
            budget = ?,
            updated_at = ?
          where area = ? and year = ?
        `,
            ...updateArr
          );
        }
      }
    });
  }
}
