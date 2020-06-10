import {
  CheckHospitalModel,
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  RegionModel,
  RuleHospitalModel,
  RuleHospitalScoreModel,
  UserHospitalModel
} from '../database/model';
import {KatoCommonError, should, validate} from 'kato-server';
import {etlDB} from '../app';
import {QueryTypes} from 'sequelize';
import {Op} from 'sequelize';
import {Context} from './context';
import * as dayjs from 'dayjs';

export default class Hospital {
  @validate(
    should
      .string()
      .required()
      .description('父级机构的id')
  )
  async list(parent) {
    return HospitalModel.findAll({
      attributes: {
        exclude: ['deleted_at']
      },
      where: {parent},
      paranoid: false,
      include: {
        model: RegionModel,
        paranoid: false,
        attributes: {
          exclude: ['deleted_at']
        }
      }
    });
  }

  @validate(
    should
      .string()
      .required()
      .description('机构id'),
    should.string().description('规则id'),
    should
      .boolean()
      .required()
      .description('是否自动打分')
  )
  async setRuleAuto(hospitalId, ruleId, isAuto) {
    //此关联是否存在
    const result = await RuleHospitalModel.findOne({
      where: {rule: ruleId, hospital: hospitalId}
    });
    if (!result) throw new KatoCommonError('机构与规则未关联');
    result.auto = isAuto;
    await result.save();
  }

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
    //该考核系统下所有的细则
    const allRules = await CheckRuleModel.findAll({
      where: {checkId, parentRuleId: {[Op.not]: null}}
    });
    //当前用户所拥有的机构权限
    const hospitals = await UserHospitalModel.findAll({
      where: {userId: Context.req.headers.token}
    }).map(h => h.hospitalId);

    //用户拥有的机构和对应的规则关系
    const ruleHospital = (
      await Promise.all(
        allRules.map(
          async rule =>
            await RuleHospitalModel.findAll({
              where: {ruleId: rule.ruleId, hospitalId: {[Op.in]: hospitals}}
            })
        )
      )
    ).reduce((per, next) => per.concat(next), []);
    if (ruleHospital.length === 0)
      throw new KatoCommonError('该考核没有关联的机构可设置');
    //批量修改自动打分选项
    await Promise.all(
      ruleHospital.map(async item => {
        item.auto = isAuto;
        await item.save();
      })
    );
  }

  async workpoints(code) {
    // language=PostgreSQL
    return (
      await etlDB.query(
        `select vws.score, vws.operatorid as doctorId, vws.doctor as doctorName, vws.projectname as name
           from view_workscoretotal vws
                  left join hospital_mapping hm on vws.hisid = hm.hisid and vws.operateorganization = hm.hishospid
           where hm.h_id = ?
             and missiontime >= ?
             and missiontime < ?`,
        {
          replacements: [
            code,
            dayjs()
              .startOf('y')
              .toDate(),
            dayjs()
              .startOf('y')
              .add(1, 'y')
              .toDate()
          ],
          type: QueryTypes.SELECT
        }
      )
    ).reduce((prev, current) => {
      const item = prev.find(
        it => it.doctorId === current.doctorId && it.name === current.name
      );
      if (item) item.score += current.score;
      else prev.push(current);
      return prev;
    }, []);
  }

  /**
   * 机构考核详情
   *
   * @param id 机构id
   */
  async checks(id) {
    // hospital
    const hospitalModel = await HospitalModel.findOne({
      where: {id}
    });
    if (!hospitalModel) throw new KatoCommonError(`id为 ${id} 的机构不存在`);

    const {checkSystem} = await CheckHospitalModel.findOne({
      where: {
        hospital: id
      },
      include: [CheckSystemModel]
    });

    if (!checkSystem) throw new KatoCommonError(`该机构未绑定考核`);

    // checkSystem
    const checkSystemModel = (
      await RuleHospitalModel.findOne({
        where: {hospitalId: id},
        include: [
          {
            model: CheckRuleModel,
            include: [CheckSystemModel]
          }
        ]
      })
    )?.rule?.checkSystem;
    if (!checkSystemModel) throw new KatoCommonError(`${hospitalModel.name}`);
    const children = await Promise.all(
      (
        await CheckRuleModel.findAll({
          where: {checkId: checkSystemModel.checkId, parentRuleId: null}
        })
      ).map(async rule => {
        const children = (
          await CheckRuleModel.findAll({
            where: {parentRuleId: rule.ruleId},
            include: [
              {
                model: RuleHospitalScoreModel,
                where: {hospitalId: id}
              },
              {
                model: RuleHospitalModel,
                where: {hospitalId: id}
              }
            ]
          })
        ).map(it => {
          it = it.toJSON();
          it.score = it.ruleHospitalScores.reduce(
            (result, current) => (result += current.score),
            0
          );
          it.auto =
            it.ruleHospitals.find(hospital => hospital.hospitalId === id)
              ?.auto ?? false;
          return it;
        });
        return {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          ruleScore: rule.ruleScore,
          children
        };
      })
    );
    const returnValue = checkSystemModel.toJSON();
    returnValue.children = children;
    return returnValue;
  }
}
