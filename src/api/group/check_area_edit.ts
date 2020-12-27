import {
  CheckAreaModel,
  CheckRuleModel,
  CheckSystemModel,
  RuleAreaBudgetModel,
  ReportAreaModel,
  RuleAreaScoreModel
} from '../../database/model';
import {KatoCommonError} from 'kato-server';
import {Op} from 'sequelize';
import {appDB} from '../../app';
import {sql as sqlRender} from '../../database/template';

export default class CheckAreaEdit {
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
      ],
      logging: console.log
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
          },
          logging: console.log
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

      // 批量添加考核系统和机构的关系
      return CheckAreaModel.bulkCreate(
        insertAreas.map(it => ({
          areaCode: it,
          checkId: checkId
        }))
      );
      //return insertCheckArea;
    });
    return ret;

    /*
    //解绑的机构  unHospitals

    //删除机构定性指标文件
    await RuleHospitalAttachModel.destroy({
      where: {hospitalId: {[Op.in]: unHospitals}},
      include: [{model: CheckRuleModel, where: {checkId}}]
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


    //批量添加规则与机构的关系数据
    return RuleHospitalModel.bulkCreate(newRuleHospitals);
    */
  }
}
