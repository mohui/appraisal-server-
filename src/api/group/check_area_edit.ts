import {
  CheckAreaModel,
  CheckRuleModel,
  CheckSystemModel,
  RuleAreaBudgetModel,
  ReportAreaModel,
  ReportAreaHistoryModel,
  RuleAreaAttachModel,
  RuleAreaScoreModel
} from '../../database/model';
import {KatoCommonError, KatoRuntimeError, should, validate} from 'kato-server';
import {Op} from 'sequelize';
import {appDB} from '../../app';
import {getAreaTree} from '../group';
import {Context} from '../context';
import * as dayjs from 'dayjs';

function getTree(data: any[], parentCode) {
  const root = data.filter(it => it.parent === parentCode);
  const list = [];
  for (const item of root) {
    const obj = {...item, children: getTree(data, item.code)};
    list.push(obj);
  }

  return list;
}

export default class CheckAreaEdit {
  /**
   * 获取下级列表
   * @param code
   * @param checkId
   */
  async list(code, checkId) {
    if (!code) code = Context.current.user.regionId;
    // 是否需要渲染选中的树
    const renderTree = code === Context.current.user.code;
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
    // 获取本年度其他考核体系绑定的地区
    const otherCheckAreaModels: {code: string}[] = await appDB.execute(
      // language=PostgreSQL
      `
        select area as code
        from check_area ca
               inner join check_system cs on ca.check_system = cs.check_id
        where check_system != ?
          and cs.check_year = ?`,
      checkModel.checkId,
      checkModel.checkYear
    );
    // 树节点的转换函数
    const nodeMapping = (c: {
      name: string;
      code: string;
      parent: string;
      level: number;
      root: string;
      path: string[];
      cycle: boolean;
      leaf: boolean;
    }) => ({
      usable: !otherCheckAreaModels.find(ca => ca.code === c.code),
      selected: !!checkAreaModels.find(ca => ca.code === c.code),
      system: null,
      code: c.code,
      parent: c.parent,
      name: c.name,
      leaf: c.leaf
    });
    // 转换子节点
    const children = childTree.filter(c => c.parent === code);
    if (renderTree && checkAreaModels.length > 0) {
      // 渲染树
      const data = checkAreaModels
        .map(it => childTree.find(c => it.code === c.code))
        .reduce((prev, current) => {
          for (const p of current.path) {
            if (!prev.some(it => it === p)) prev.push(p);
          }
          return prev;
        }, [])
        .map(it => childTree.find(c => it === c.code))
        .map(nodeMapping);
      return getTree(data, code);
    } else {
      return children.map(nodeMapping);
    }
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

    //return insertAreas;

    // 找到了所有的待删除的和待添加的,放到事务中先删除再添加
    const ret = await appDB.transaction(async () => {
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
    return ret;
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
}
