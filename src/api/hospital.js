import {
  CheckHospitalModel,
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  RegionModel,
  RuleHospitalModel,
  RuleHospitalScoreModel,
  RuleTagModel
} from '../database/model';
import {KatoCommonError, should, validate} from 'kato-server';
import {etlDB} from '../app';
import {Op, QueryTypes} from 'sequelize';
import {Context} from './context';
import * as dayjs from 'dayjs';
import Excel from 'exceljs';
import ContentDisposition from 'content-disposition';
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
    const hospitals = Context.current.user.hospitals.map(h => h.id);

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
                where: {hospitalId: id},
                required: false
              },
              {
                model: RuleHospitalModel,
                where: {hospitalId: id}
              },
              RuleTagModel
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

  @validate(
    should
      .string()
      .required()
      .description('机构id')
  )
  async checkDownload(hospitalId) {
    const hospital = await HospitalModel.findOne({
      where: {id: hospitalId}
    });
    if (!hospital) throw new KatoCommonError('该机构不存在');
    const {checkSystem} = await CheckHospitalModel.findOne({
      where: {hospital: hospitalId},
      include: [CheckSystemModel]
    });
    if (!checkSystem) throw new KatoCommonError('该机构未绑定考核系统');

    //查询该机构和其直属的二级机构
    const childrenHospital = [hospital].concat(
      await HospitalModel.findAll({
        where: {parent: hospitalId}
      })
    );
    //被绑定在该考核下的下属机构
    const checkChildrenHospital = (
      await Promise.all(
        childrenHospital.map(
          async hospital =>
            await CheckHospitalModel.findOne({
              where: {hospitalId: hospital.id},
              include: [HospitalModel]
            })
        )
      )
    ).reduce((res, next) => (next ? res.concat(next) : res), []);

    //机构的得分情况
    let childrenHospitalCheckResult = (
      await Promise.all(
        checkChildrenHospital.map(async item => ({
          hospital: item.hospital,
          result: await this.checks(item.hospital.id)
        }))
      )
    ).map(item => {
      //机构总分
      let count = 0;
      let data = [item.hospital.name];
      item.result.children.forEach(rule => {
        if (rule.children.length > 0) {
          data = data.concat(rule.children.map(child => child.score));
          //每个规则组的总分
          let groupCount = rule.children.reduce(
            (res, next) => (res += next.score),
            0
          );
          data.push(groupCount);
          //规则组总分累加
          count += groupCount;
        }
      });
      data.push(count);
      return data;
    });
    //当前机构的考核结果
    const hospitalCheckResult = await this.checks(hospitalId);

    //所有细则合并
    const rules = hospitalCheckResult.children
      .filter(item => item.children.length > 0)
      .map(it => it.children)
      .reduce((res, pre) => {
        pre.push({ruleName: '小计'});
        return res.concat(pre);
      }, []);

    //计算每个rule组需要合并多少个单元格
    const cells = hospitalCheckResult.children
      .filter(item => item.children.length > 0)
      .map(it => it.children.length);

    const firstRow = ['一级机构及二级机构', '一级机构', '二级机构']
      .concat(
        hospitalCheckResult.children
          .filter(item => item.children.length > 0)
          .map(rule => rule.ruleName)
          .reduce((res, pre, index) => {
            res.push(pre);
            for (let i = 0; i < cells[index] - 1; i++) {
              res.push('');
            }
            return res;
          }, [])
      )
      .concat('总分');

    //第二行数据
    const secondRow = ['---', '---', '---'].concat(
      rules.map(item => item.ruleName)
    );

    //第三行的数据只要一个一级机构名
    const thirdRow = [`${hospital.name}`];

    //第四行第二列才是一级机构
    childrenHospitalCheckResult[0].splice(0, 0, '');
    childrenHospitalCheckResult[0].splice(2, 0, '---');

    //剩下的二级机构前面空两个单元格
    childrenHospitalCheckResult = childrenHospitalCheckResult.map(
      (res, index) => {
        if (index > 0) {
          res.splice(0, 0, '');
          res.splice(0, 0, '');
        }
        return res;
      }
    );

    //开始创建Excel表格
    const workBook = new Excel.Workbook();
    const workSheet = workBook.addWorksheet(`${hospital.name}考核结果`);
    //添加标题
    workSheet.addRow([`${hospital.name}-${checkSystem.checkName}`]);
    workSheet.addRows([
      firstRow,
      secondRow,
      thirdRow,
      ...childrenHospitalCheckResult
    ]);

    //标题占据一整行单元格
    workSheet.mergeCells(1, childrenHospitalCheckResult[0].length, 1, 1);

    let cellCount = 0;
    //合并单元格
    firstRow.forEach((row, index) => {
      if (index > 2 && index < firstRow.length - 1 && firstRow[index]) {
        workSheet.mergeCells(2, index + 1, 2, index + cells[cellCount++]);
      }
    });

    const buffer = await workBook.xlsx.writeBuffer();
    Context.current.bypassing = true;
    let res = Context.current.res;
    //设置请求头信息，设置下载文件名称,同时处理中文乱码问题
    res.setHeader(
      'Content-Disposition',
      ContentDisposition(`${hospital.name}-考核结果表.xls`)
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.send(buffer);
    res.end();
  }
}
