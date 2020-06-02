import {
  CheckRuleModel,
  HospitalModel,
  MarkHospitalModel,
  RuleHospitalModel,
  RuleHospitalScoreModel,
  RuleTagModel
} from '../database';
import {KatoCommonError} from 'kato-server';
import {
  BasicTagUsages,
  MarkTagUsages,
  TagAlgorithmUsages
} from '../../common/rule-score';
import {BasicTagData} from '../database/model/basic-tag-data';
import * as dayjs from 'dayjs';
import {v4 as uuid} from 'uuid';

export default class Score {
  /**
   * 系统打分
   *
   * @param id 机构id
   */
  async autoScore(id) {
    // 查机构
    const hospital = await HospitalModel.findOne({
      where: {id}
    });
    if (!hospital) throw new KatoCommonError(`id为 ${id} 的机构不存在`);
    // 查机构标记
    const mark = await MarkHospitalModel.findOne({
      where: {
        hospitalId: hospital.id
      }
    });
    if (!mark) return;
    // 查考核细则
    const ruleModels: [RuleHospitalModel] = await RuleHospitalModel.findAll({
      where: {
        auto: true,
        hospitalId: hospital.id
      }
    });
    for (const ruleModel of ruleModels) {
      // 查指标算法
      const tagModels = await RuleTagModel.findAll({
        where: {
          ruleId: ruleModel.ruleId
        }
      });

      let score = 0;
      for (const tagModel of tagModels) {
        // 建档率
        if (tagModel.tag === MarkTagUsages.S01) {
          // 查询服务总人口数
          const basicData = await BasicTagData.findOne({
            where: {
              code: BasicTagUsages.DocPeople,
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果服务总人口数不存在, 直接跳过
          if (!basicData.value) continue;

          // 根据指标算法, 计算得分
          if (tagModel.algorithm === TagAlgorithmUsages.Y01 && mark.S01) {
            score += tagModel.score;
          }
          if (tagModel.algorithm === TagAlgorithmUsages.N01 && !mark.S01) {
            score += tagModel.score;
          }
          if (tagModel.algorithm === TagAlgorithmUsages.egt && mark.S01) {
            const rate = mark.S03 / mark.S01;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        const ruleHospitalScoreObject = {
          ruleId: ruleModel.ruleId,
          hospitalId: ruleModel.hospitalId
        };
        let ruleHospitalScoreModel = await RuleHospitalScoreModel.findOne({
          where: ruleHospitalScoreObject
        });
        if (!ruleHospitalScoreModel) {
          ruleHospitalScoreModel = new RuleHospitalScoreModel({
            ...ruleHospitalScoreObject,
            score,
            id: uuid()
          });
        } else {
          ruleHospitalScoreModel.score = score;
        }

        await ruleHospitalScoreModel.save();
      }
    }
    return RuleHospitalScoreModel.findAll({where: {hospitalId: id}});
  }

  /**
   * 手动打分
   *
   * @param ruleId 细则id
   * @param hospitalId 机构id
   * @param score 分数
   */
  async score(ruleId, hospitalId, score) {
    const rule = await CheckRuleModel.findOne({where: {ruleId: ruleId}});
    if (!rule) throw new KatoCommonError('规则不存在');
    const hospital = await HospitalModel.findOne({where: {id: hospitalId}});
    if (!hospital) throw new KatoCommonError('机构不存在');

    let model = await RuleHospitalScoreModel.findOne({
      where: {ruleId, hospitalId}
    });
    if (!model) {
      model = new RuleHospitalScoreModel({
        ruleId: ruleId,
        hospitalId: hospitalId,
        score
      });
    } else {
      model.score = score;
    }

    return model.save();
  }
}
