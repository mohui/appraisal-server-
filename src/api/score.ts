import {
  BasicTagDataModel,
  CheckHospitalModel,
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
import {Context} from './context';

/**
 * 获取百分数字符串, 默认返回'0'
 *
 * @param numerator 分子
 * @param denominator 分母
 */
function percentString(numerator: number, denominator: number): string {
  if (denominator) {
    return ((numerator / denominator) * 100).toFixed(0) + '%';
  } else {
    return '0';
  }
}

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

        // 老年人健康管理率
        if (tagModel.tag === MarkTagUsages.O00.code) {
          // 查询老年人人数
          const basicData = await BasicTagDataModel.findOne({
            where: {
              code: BasicTagUsages.OldPeople,
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果老年人人数不存在, 直接跳过
          if (!basicData?.value) continue;
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.O00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.O00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.egt.code && mark?.O00) {
            const rate = mark.O00 / basicData.value;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 老年人体检完整率
        if (tagModel.tag === MarkTagUsages.O01.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.O01)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.O01)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.O00 &&
            mark?.O01
          ) {
            const rate = mark.O01 / mark.O00;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 老年人中医药健康管理率
        if (tagModel.tag === MarkTagUsages.O02.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.O02)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.O02)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.O00 &&
            mark?.O02
          ) {
            const rate = mark.O02 / mark.O00;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 高血压健康管理
        if (tagModel.tag === MarkTagUsages.H00.code) {
          // 查询高血压人数
          const basicData = await BasicTagDataModel.findOne({
            where: {
              code: BasicTagUsages.HypertensionPeople,
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果查询高血压人数不存在, 直接跳过
          if (!basicData?.value) continue;
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.H00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.H00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.egt.code && mark?.H00) {
            const rate = mark.O00 / basicData.value;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 高血压规范管理率
        if (tagModel.tag === MarkTagUsages.H01.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.H01)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.H01)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.H00 &&
            mark?.H01
          ) {
            const rate = mark.H01 / mark.H00;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 高血压控制率
        if (tagModel.tag === MarkTagUsages.H02.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.H02)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.H02)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.H00 &&
            mark?.H02
          ) {
            const rate = mark.H02 / mark.H00;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 糖尿病健康管理
        if (tagModel.tag === MarkTagUsages.D00.code) {
          // 查询糖尿病人数
          const basicData = await BasicTagDataModel.findOne({
            where: {
              code: BasicTagUsages.DiabetesPeople,
              hospital: hospital.id,
              year: dayjs()
                .year()
                .toString()
            }
          });
          // 如果查询糖尿病人数不存在, 直接跳过
          if (!basicData?.value) continue;
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.D00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.D00)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.egt.code && mark?.D00) {
            const rate = mark.D00 / basicData.value;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 糖尿病规范管理率
        if (tagModel.tag === MarkTagUsages.D01.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.D01)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.D01)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.D00 &&
            mark?.D01
          ) {
            const rate = mark.D01 / mark.D00;
            score += tagModel.score * (rate > tagModel.baseline ? 1 : rate);
          }
        }

        // 糖尿病控制率
        if (tagModel.tag === MarkTagUsages.D02.code) {
          if (tagModel.algorithm === TagAlgorithmUsages.Y01.code && mark?.D02)
            score += tagModel.score;
          if (tagModel.algorithm === TagAlgorithmUsages.N01.code && !mark?.D02)
            score += tagModel.score;
          if (
            tagModel.algorithm === TagAlgorithmUsages.egt.code &&
            mark?.D00 &&
            mark?.D02
          ) {
            const rate = mark.D02 / mark.D00;
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
        await CheckHospitalModel.findAll({
          where: {
            hospitalId: {
              [Op.in]: Context.current.user.hospitals.map(it => it.id)
            }
          },
          include: [HospitalModel]
        })
      ).map(async checkHospital => {
        const item = await this.total(checkHospital.hospitalId);
        return {
          ...item,
          parent: checkHospital?.hospital?.parent
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

  /**
   * 指标解释
   *
   * @param hospitalId 医院id
   * @param ruleId 规则id
   */
  async detail(hospitalId, ruleId) {
    const result = [];
    // 查询规则绑定的关联关系
    const ruleTagModels = await RuleTagModel.findAll({where: {ruleId}});
    const markHospitalModel = await MarkHospitalModel.findOne({
      where: {hospitalId}
    });
    if (!ruleTagModels) throw new KatoCommonError(`当前考核项没有绑定关联关系`);
    for (const ruleTagModel of ruleTagModels) {
      // 建档率
      if (ruleTagModel.tag === MarkTagUsages.S01.code) {
        // 建档率
        // 查询服务总人口数
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.DocPeople,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        result.push(
          `${
            MarkTagUsages.S01.name
          } = 建立电子健康档案人数 / 辖区内常住居民数 = ${
            markHospitalModel.S00
          } / ${basicData.value} = ${(
            (markHospitalModel.S00 / basicData.value) *
            100
          ).toFixed(0)}%`
        );
      }
      // 电子档案规范率
      if (ruleTagModel.tag === MarkTagUsages.S23.code) {
        result.push(
          `${
            MarkTagUsages.S23.name
          } = 规范的电子档案数 / 建立电子健康档案人数 = ${
            markHospitalModel.S23
          } / ${markHospitalModel.S00} = ${(
            (markHospitalModel.S23 / markHospitalModel.S00) *
            100
          ).toFixed(0)}%`
        );
      }
      // 健康档案使用率
      if (ruleTagModel.tag === MarkTagUsages.S03.code) {
        result.push(
          `${
            MarkTagUsages.S03.name
          } = 档案中有动态记录的档案份数 / 建立电子健康档案人数 = ${
            markHospitalModel.S03
          } / ${markHospitalModel.S00} = ${(
            (markHospitalModel.S03 / markHospitalModel.S00) *
            100
          ).toFixed(0)}%`
        );
      }

      // 老年人健康管理率
      if (ruleTagModel.tag === MarkTagUsages.O00.code) {
        // 查询老年人人数
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.OldPeople,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        result.push(
          `${
            MarkTagUsages.O00.name
          } = 年内接受老年人健康管理人数 / 辖区内65岁及以上常住居民数 = ${
            markHospitalModel.O00
          } / ${basicData.value} = ${(
            (markHospitalModel.O00 / basicData.value) *
            100
          ).toFixed(0)}%`
        );
      }
      // 老年人体检完整率
      if (ruleTagModel.tag === MarkTagUsages.O01.code) {
        result.push(
          `${
            MarkTagUsages.O01.name
          } = 年内接受完整体检的老年人数 / 年内接受健康管理的65岁及以上常住居民数 = ${
            markHospitalModel.O01
          } / ${markHospitalModel.O00} = ${(
            (markHospitalModel.O01 / markHospitalModel.O00) *
            100
          ).toFixed(0)}%`
        );
      }
      // 老年人中医药健康管理率
      if (ruleTagModel.tag === MarkTagUsages.O02.code) {
        result.push(
          `${
            MarkTagUsages.O02.name
          } = 年内接受中医药健康管理服务的65岁及以上居民数 / 年内接受健康管理的65岁及以上常住居民数 = ${
            markHospitalModel.O02
          } / ${markHospitalModel.O00} = ${(
            (markHospitalModel.O02 / markHospitalModel.O00) *
            100
          ).toFixed(0)}%`
        );
      }

      // 高血压患者管理率
      if (ruleTagModel.tag === MarkTagUsages.H00.code) {
        // 查询高血压患者人数
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.HypertensionPeople,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        result.push(
          `${
            MarkTagUsages.H00.name
          } = 一年内已管理的高血压患者数 / 年内辖区应管理高血压患者总数 = ${
            markHospitalModel.H00
          } / ${basicData.value} = ${(
            (markHospitalModel.H00 / basicData.value) *
            100
          ).toFixed(0)}%`
        );
      }
      // 高血压患者规范管理率
      if (ruleTagModel.tag === MarkTagUsages.H01.code) {
        result.push(
          `${
            MarkTagUsages.H01.name
          } = 按照规范要求进行高血压患者健康管理的人数 / 一年内已管理的高血压患者人数 = ${
            markHospitalModel.H01
          } / ${markHospitalModel.H00} = ${(
            (markHospitalModel.H01 / markHospitalModel.H00) *
            100
          ).toFixed(0)}%`
        );
      }
      // 高血压患者血压控制率
      if (ruleTagModel.tag === MarkTagUsages.H02.code) {
        result.push(
          `${
            MarkTagUsages.H02.name
          } = 一年内最近一次随访血压达标人数 / 一年内已管理的高血压患者人数 = ${
            markHospitalModel.H02
          } / ${markHospitalModel.H00} = ${(
            (markHospitalModel.H02 / markHospitalModel.H00) *
            100
          ).toFixed(0)}%`
        );
      }

      // 糖尿病患者管理率
      if (ruleTagModel.tag === MarkTagUsages.D00.code) {
        // 查询糖尿病患者人数
        const basicData = await BasicTagDataModel.findOne({
          where: {
            code: BasicTagUsages.DiabetesPeople,
            hospital: hospitalId,
            year: dayjs()
              .year()
              .toString()
          }
        });
        result.push(
          `${
            MarkTagUsages.D00.name
          } = 一年内已管理的2型糖尿病患者数 / 年内辖区2型糖尿病患者总数 x 100% = ${
            markHospitalModel.D00
          } / ${basicData.value} = ${(
            (markHospitalModel.D00 / basicData.value) *
            100
          ).toFixed(0)}%`
        );
      }
      // 糖尿病患者规范管理率
      if (ruleTagModel.tag === MarkTagUsages.D01.code) {
        result.push(
          `${
            MarkTagUsages.D01.name
          } = 按照规范要求进行2型糖尿病患者健康管理的人数 / 一年内已管理的2型糖尿病患者人数 x 100% = ${
            markHospitalModel.D01
          } / ${markHospitalModel.D00} = ${(
            (markHospitalModel.D01 / markHospitalModel.D00) *
            100
          ).toFixed(0)}%`
        );
      }
      // 糖尿病患者血压控制率
      if (ruleTagModel.tag === MarkTagUsages.D02.code) {
        result.push(
          `${
            MarkTagUsages.D02.name
          } = 一年内最近一次随访空腹血糖达标人数 / 一年内已管理的2型糖尿病患者人数 x 100% = ${
            markHospitalModel.D02
          } / ${markHospitalModel.D00} = ${(
            (markHospitalModel.D02 / markHospitalModel.D00) *
            100
          ).toFixed(0)}%`
        );
      }
    }

    return result;
  }
}
