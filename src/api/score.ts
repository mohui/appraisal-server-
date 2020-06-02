import {
  HospitalModel,
  MarkHospitalModel,
  RuleHospitalModel,
  RuleTagModel
} from '../database';
import {KatoCommonError} from 'kato-server';
import {BasicTagUsages, MarkTagUsages} from '../../common/rule-score';
import {BasicTagData} from '../database/model/basic-tag-data';
import * as dayjs from 'dayjs';

export default class Score {
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
    const ruleModels = await RuleHospitalModel.findAll({
      where: {
        auto: true,
        hospitalId: hospital.id
      }
    });
    for (const ruleModel of ruleModels) {
      // 查指标算法
      const tagModels = await RuleTagModel.findAll({
        where: {
          ruleId: ruleModel.id
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
              year: dayjs().year()
            }
          });
          // 如果服务总人口数不存在, 直接跳过
          if (!basicData.value) continue;

          // 根据指标算法, 计算得分
          if (tagModel.algorithm === '' && mark.S01) score += tagModel.score;
          if (tagModel.algorithm === '' && !mark.S01) score += tagModel.score;
        }
      }
    }
    return ruleModels;
  }
}
