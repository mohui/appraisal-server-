import {HospitalModel, RegionModel, RuleHospitalModel} from '../database/model';
import {KatoCommonError, should, validate} from 'kato-server';
import {etlDB} from '../app';
import {QueryTypes} from 'sequelize';

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

  async workpoints(code) {
    // language=PostgreSQL
    return (
      await etlDB.query(
        `select vws.score, vws.operatorid as doctorId, vws.doctor as doctorName, vws.projectname as name
         from view_workscoretotal vws
                left join hospital_mapping hm on vws.hisid = hm.hisid and vws.operateorganization = hm.hishospid
         where hm.h_id = ?`,
        {
          replacements: [code],
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
}
