import {
  BasicTagDataModel,
  CheckRuleModel,
  HospitalModel,
  MarkHospitalModel,
  RegionModel,
  ReportHospitalModel,
  RuleHospitalAttachModel,
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
import * as dayjs from 'dayjs';
import {v4 as uuid} from 'uuid';
import {etlDB} from '../app';
import {Op, QueryTypes} from 'sequelize';
import * as path from 'path';
import {ossClient} from '../../util/oss';

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
    // 查所有考核细则
    const ruleModels: [RuleHospitalModel] = await RuleHospitalModel.findAll({
      where: {
        auto: true,
        hospitalId: hospital.id
      }
    });
    // 循环所有考核细则
    for (const ruleModel of ruleModels) {
      // 查考核细则对应的指标算法
      const ruleTagModels = await RuleTagModel.findAll({
        where: {
          ruleId: ruleModel.ruleId
        }
      });
      // 默认打分 0分
      let score = 0;
      // 循环所有的指标算法, 计算得分
      for (const tagModel of ruleTagModels) {
        // 健康档案建档率
        if (tagModel.tag === MarkTagUsages.S01.code) {
          // 查询服务总人口数
          const basicData = await BasicTagDataModel.findOne({
            where: {
              code: BasicTagUsages.DocPeople,
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果服务总人口数不存在, 直接跳过
          if (!basicData?.value) continue;

          // 根据指标算法, 计算得分
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.S00) {
            score += tagModel.score;
          }
          if (
            tagModel.algorithm === TagAlgorithmUsages.N01.code &&
            !mark?.S00
          ) {
            score += tagModel.score;
          }
          if (tagModel.algorithm === TagAlgorithmUsages.egt.code && mark?.S00) {
            const rate = mark?.S00 / basicData.value;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 健康档案规范率
        if (tagModel.tag === MarkTagUsages.S23.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.S23)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.S23)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.S23 &&
            mark?.S00
          ) {
            const rate = mark.S23 / mark.S00;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 健康档案使用率
        if (tagModel.tag === MarkTagUsages.S03.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.S03)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.S03)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.S03 &&
            mark?.S00
          ) {
            const rate = mark.S03 / mark.S00;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }
      }
      // 查询机构考核得分
      const ruleHospitalScoreObject = {
        ruleId: ruleModel.ruleId,
        hospitalId: ruleModel.hospitalId
      };
      let ruleHospitalScoreModel = await RuleHospitalScoreModel.findOne({
        where: ruleHospitalScoreObject
      });
      // 刷新最新得分
      if (!ruleHospitalScoreModel) {
        ruleHospitalScoreModel = new RuleHospitalScoreModel({
          ...ruleHospitalScoreObject,
          score,
          id: uuid()
        });
      } else {
        ruleHospitalScoreModel.score = score;
      }
      // 保存
      await ruleHospitalScoreModel.save();
    }

    // 考核满分
    const total = (
      await RuleHospitalModel.findAll({
        where: {hospitalId: id},
        include: [CheckRuleModel]
      })
    ).reduce((result, current) => (result += current?.rule?.ruleScore ?? 0), 0);
    // 机构总得分
    const scores = (
      await RuleHospitalScoreModel.findAll({
        where: {hospitalId: id}
      })
    ).reduce((result, current) => (result += current.score), 0);
    // 机构工分
    // language=PostgreSQL
    const workpoints =
      (
        await etlDB.query(
          `
            select sum(vws.score) as workpoints
            from view_workscoretotal vws
                   left join hospital_mapping hm on vws.operateorganization = hm.hishospid
            where hm.h_id = ?
              and vws.missiontime >= ?
              and vws.missiontime < ?
          `,
          {
            replacements: [
              id,
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
      )[0]?.workpoints ?? 0;

    // 更新机构考核报告表
    await ReportHospitalModel.upsert({
      hospitalId: id,
      workpoints,
      scores,
      total
    });
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

  /**
   * 获取考核地区/机构对应的考核总体情况
   *
   * @param code 地区或机构的code
   * @return { id: id, name: '名称', score: '考核得分', rate: '质量系数'}
   */
  async total(code) {
    const regionModel: RegionModel = await RegionModel.findOne({where: {code}});
    if (regionModel) {
      const reduceObject = (
        await HospitalModel.findAll({
          where: {
            regionId: {
              [Op.like]: `${code}%`
            }
          },
          include: [ReportHospitalModel]
        })
      ).reduce(
        (result, current) => {
          result.workpoints += current?.report?.workpoints ?? 0;
          result.scores += current?.report?.scores ?? 0;
          result.correctWorkPoint +=
            (current?.report?.workpoints ?? 0) *
              ((current?.report?.scores ?? 0) /
                (current?.report?.total ?? 0)) || 0;
          result.total += current?.report?.total ?? 0;
          return result;
        },
        {workpoints: 0, scores: 0, total: 0, correctWorkPoint: 0}
      );

      return {
        id: regionModel.code,
        name: regionModel.name,
        originalScore: reduceObject.workpoints,
        score: Math.round(reduceObject.correctWorkPoint),
        rate: reduceObject.correctWorkPoint / reduceObject.workpoints
      };
    }

    const hospitalModel = await HospitalModel.findOne({
      where: {id: code},
      include: [ReportHospitalModel]
    });
    if (hospitalModel) {
      return {
        id: hospitalModel.id,
        name: hospitalModel.name,
        originalScore: hospitalModel?.report?.workpoints ?? 0,
        score: Math.round(
          (hospitalModel?.report?.workpoints ?? 0) *
            ((hospitalModel?.report?.scores ?? 0) /
              (hospitalModel?.report?.total ?? 0))
        ),
        rate:
          (hospitalModel?.report?.scores ?? 0) /
          (hospitalModel?.report?.total ?? 0)
      };
    }

    throw new KatoCommonError(`${code} 不存在`);
  }

  /**
   * 获取当前地区机构排行
   *
   * @param code 地区code
   */
  async rank(code) {
    const regionModel = await RegionModel.findOne({where: {code}});
    if (!regionModel) throw new KatoCommonError(`地区 ${code} 不存在`);
    return await Promise.all(
      (
        await HospitalModel.findAll({
          where: {
            regionId: {
              [Op.like]: `${code}%`
            }
          }
        })
      ).map(async hospital => {
        const item = await this.total(hospital.id);
        return {
          ...item,
          parent: hospital.parent
        };
      })
    );
  }

  /**
   * 获取省市排行
   *
   * @param code 省市code
   */
  async areaRank(code) {
    const regionModel = await RegionModel.findOne({
      where: {
        code,
        level: {
          [Op.lt]: 3
        }
      }
    });
    if (!regionModel) throw new KatoCommonError(`地区 ${code} 不合法`);

    // 获取所有子地区
    return await Promise.all(
      (
        await RegionModel.findAll({
          where: {
            parent: regionModel.code
          }
        })
      ).map(async region => {
        const result = await this.total(region.code);
        return {
          ...result,
          ...region.toJSON()
        };
      })
    );
  }

  async upload(ruleId, hospitalId, attachments) {
    const ossName = `/appraisal/attachment/${uuid()}${path.extname(
      attachments.originalname
    )}`;

    let attachURL;
    try {
      attachURL = await ossClient.save(ossName, attachments.buffer);
    } catch (e) {
      console.log(e);
      throw new KatoCommonError('文件上传失败');
    }

    const name = attachments.originalname;
    await new RuleHospitalAttachModel({
      ruleId,
      hospitalId,
      name,
      url: attachURL
    }).save();

    return attachURL;
  }

  async listAttachments(ruleId, hospitalId) {
    return RuleHospitalAttachModel.findAll({
      where: {
        ruleId,
        hospitalId
      }
    });
  }

  async delAttachment(id) {
    return RuleHospitalAttachModel.destroy({
      where: {
        id
      }
    });
  }
}
