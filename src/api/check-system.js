import {
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  RuleHospitalModel,
  RuleTagModel,
  UserHospitalModel,
  UserModel
} from '../database/model';
import {KatoCommonError, should, validate} from 'kato-server';
import {appDB} from '../app';
import {Op} from 'sequelize';
import {MarkTags} from '../../common/rule-score';
import {Context} from './context';

export default class CheckSystem {
  //添加考核系统
  @validate(
    should.object({
      checkName: should
        .string()
        .required()
        .description('考核系统名')
    })
  )
  async add(params) {
    const {checkName} = params;
    return await CheckSystemModel.create({checkName, total: 0});
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
        .description('考核系统名称')
    })
  )
  updateName(params) {
    return appDB.transaction(async () => {
      const sys = await CheckSystemModel.findOne({
        where: {checkId: params.checkId},
        lock: true
      });
      if (!sys) throw new KatoCommonError('该考核不存在');
      return await CheckSystemModel.update(
        {checkName: params.checkName},
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
    return await CheckRuleModel.create(params);
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
        .description('规则组的名称')
    })
  )
  async addRuleGroup(params) {
    return await CheckRuleModel.create(params);
  }

  //更新规则组
  @validate(
    should.object({
      ruleId: should.string().required(),
      ruleName: should.string()
    })
  )
  async updateRuleGroup(params) {
    return appDB.transaction(async () => {
      const group = await CheckRuleModel.findOne({
        where: {ruleId: params.ruleId},
        lock: true
      });
      if (!group) throw new KatoCommonError('该规则组不存在');
      //修改规则组
      return await CheckRuleModel.update(
        {ruleName: params.ruleName},
        {where: {ruleId: params.ruleId}}
      );
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
      //删除该考核系统下的所有规则
      await Promise.all(
        sys.checkRules.map(async rule => await rule.destroy({force: true}))
      );
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
      //进行修改操作
      return await CheckRuleModel.update(
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
    return appDB.transaction(async () => {
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

      return await rule.destroy({force: true});
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
      include: {
        model: RuleTagModel,
        attributes: ['id', 'tag', 'algorithm', 'baseline', 'score']
      }
    });

    //rule进行分组
    const ruleGroup = allRules.filter(row => !row.parentRuleId);
    allRules = ruleGroup.map(group => ({
      ruleId: group.ruleId,
      ruleName: group.ruleName,
      checkId: group.checkId,
      group: allRules
        .filter(rule => rule.parentRuleId === group.ruleId)
        .map(it => it.toJSON())
        .map(item => ({
          ...item,
          ruleTags: item.ruleTags.map(ruleTag => ({
            ...ruleTag,
            name: findTagName(ruleTag.tag)
          }))
        }))
    }));
    return {count: ruleGroup.length, rows: allRules};
  }

  //查询考核系统
  @validate(
    should
      .object({
        pageSize: should.number(),
        pageNo: should.number(),
        checkId: should.string()
      })
      .allow(null)
  )
  async list(params) {
    const {pageSize = 20, pageNo = 1, checkId} = params || {};
    let whereOptions = {};
    if (checkId) whereOptions['checkId'] = checkId;

    let result = await CheckSystemModel.findAndCountAll({
      where: whereOptions,
      distinct: true,
      offset: (pageNo - 1) * pageSize,
      limit: pageSize
    });
    //当前用户拥有的机构
    const userHospital = await UserHospitalModel.findAll({
      where: {userId: Context.req.headers.token}
    });
    result.rows = await Promise.all(
      result.rows.map(async row => {
        row = row.toJSON();
        //该考核系统下的所有细则
        const allRules = await CheckRuleModel.findAll({
          where: {checkId: row.checkId, parentRuleId: {[Op.not]: null}}
        }).map(it => it.ruleId);
        // 统计该用户该考核系统下的机构
        const ruleHospital = await RuleHospitalModel.findAll({
          where: {
            ruleId: {[Op.in]: allRules},
            hospitalId: {[Op.in]: userHospital.map(it => it.hospitalId)}
          }
        });
        //查询全部自动打分(all),部分自动打分(part),全不自动打分(no)
        const autoTrue = !!ruleHospital.find(it => it.auto);
        const autoFalse = !!ruleHospital.find(it => !it.auto);
        let auto;
        if (autoFalse && autoTrue) auto = 'part';
        if (autoFalse && !autoTrue) auto = 'no';
        if (!autoFalse && autoTrue) auto = 'all';
        return {...row, hospitalCount: ruleHospital.length, auto};
      })
    );
    return result;
  }

  @validate(
    should
      .string()
      .required()
      .description('考核系统id')
  )
  async listHospitals(checkId) {
    //考核细则
    const allRules = await CheckRuleModel.findAll({
      where: {checkId, parentRuleId: {[Op.not]: null}}
    });

    //不在该考核系统下的所有细则
    const extraRules = await CheckRuleModel.findAll({
      where: {checkId: {[Op.not]: checkId}, parentRuleId: {[Op.not]: null}}
    });
    //绑定在其他考核系统下的机构
    const extraHospitals = await RuleHospitalModel.findAll({
      where: {ruleId: {[Op.in]: extraRules.map(it => it.ruleId)}}
    });
    //用户所拥有的机构
    const result = (
      await UserModel.findOne({
        where: {id: Context.req.headers.token},
        paranoid: false,
        include: {
          model: HospitalModel,
          paranoid: false,
          attributes: {
            exclude: ['deleted_at', 'created_at', 'updated_at']
          },
          through: {
            attributes: []
          }
        }
      })
    ).hospitals;
    //绑定在该考核系统的机构
    const hospitals = await RuleHospitalModel.findAll({
      where: {ruleId: {[Op.in]: allRules.map(it => it.ruleId)}}
    });
    //用户可供修改的机构
    let ableHospitals = result.filter(
      h => !extraHospitals.find(item => h.id === item.hospitalId)
    );
    return Promise.all(
      ableHospitals.map(async h => ({
        ...h.toJSON(),
        parentName: h.parent
          ? (await HospitalModel.findOne({where: {id: h.parent}}))?.name
          : '',
        selected: !!hospitals.find(item => h.id === item.hospitalId) //是否选择的标记
      }))
    );
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
    //查询该体系下所有细则
    const allRules = await CheckRuleModel.findAll({
      where: {checkId: checkId, parentRuleId: {[Op.not]: null}}
    });
    if (allRules.length === 0)
      throw new KatoCommonError('该考核系统下没有细则');

    //查询这些细则原有的机构关系
    const ruleHospital = (
      await Promise.all(
        allRules.map(
          async rule =>
            await RuleHospitalModel.findAll({
              where: {ruleId: rule.ruleId}
            })
        )
      )
    ).reduce((pre, next) => pre.concat(next), []);

    //当前用户所拥有的机构
    const userHospital = await UserHospitalModel.findAll({
      where: {userId: Context.req.headers.token}
    });
    if (hospitals.find(h => !userHospital.find(u => u.hospitalId === h)))
      throw new KatoCommonError('权限不足');
    //删除被解绑的机构
    await Promise.all(
      ruleHospital
        .filter(
          item => userHospital.find(h => h.hospitalId === item.hospitalId) //过滤出不属于该用户管的机构
        )
        .filter(item => !hospitals.find(h => h === item.hospitalId)) //过滤出需要解绑的机构
        .map(async it => await it.destroy())
    );

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
    //批量添加规则与机构的关系数据
    return RuleHospitalModel.bulkCreate(newRuleHospitals);
  }
}

function findTagName(code) {
  for (let i = 0; i < MarkTags.length; i++) {
    const current = MarkTags[i].children.find(c => c.code === code);
    if (current) return current?.name || '';
  }
}
