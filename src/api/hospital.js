import {
  CheckHospitalModel,
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  RegionModel,
  RuleHospitalBudgetModel,
  RuleHospitalModel,
  RuleHospitalScoreModel,
  RuleTagModel
} from '../database/model';
import {KatoCommonError, should, validate} from 'kato-server';
import {appDB, originalDB} from '../app';
import {Op, QueryTypes} from 'sequelize';
import {Context} from './context';
import * as dayjs from 'dayjs';
import Excel from 'exceljs';
import ContentDisposition from 'content-disposition';
import {MarkTagUsages} from '../../common/rule-score';
import {Decimal} from 'decimal.js';
import {Projects} from '../../common/project';
import {sql as sqlRender} from '../database/template';

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

  /**
   * 设置考核下某个机构的自动打分
   * @param checkId 考核id
   * @param hospitalId 机构id
   * @param isAuto 是否开启 true || false
   * @returns {Promise<unknown[]>}
   */
  @validate(
    should.string().required(),
    should.string().required(),
    should.boolean().required()
  )
  async setCheckAuto(checkId, hospitalId, isAuto) {
    const check = await CheckSystemModel.findOne({where: {checkId}});
    if (!check) throw new KatoCommonError('该考核体系不存在');
    //修改该机构在考核系统下的所有规则的自动打分
    await Promise.all(
      (
        await CheckRuleModel.findAll({
          where: {checkId, parentRuleId: {[Op.not]: null}},
          include: {model: RuleHospitalModel, where: {hospitalId: hospitalId}}
        }).reduce((per, next) => per.concat(next.ruleHospitals), [])
      ).map(async item => {
        await this.setRuleAuto(item.hospitalId, item.ruleId, isAuto);
      })
    );
  }

  async workpoints(code) {
    return (
      await queryProjectDoctorWorkPoint({
        hospitalId: code,
        start: dayjs()
          .startOf('y')
          .toDate(),
        end: dayjs()
          .startOf('y')
          .add(1, 'y')
          .toDate()
      })
    ).map(it => ({
      ...it,
      name: Projects.find(p => p.id === it.projectId)?.name
    }));
  }

  /**
   * 机构考核详情
   *
   * @param id 机构id
   */
  async checks(id, checkId) {
    // hospital
    const hospitalModel = await HospitalModel.findOne({
      where: {id}
    });
    if (!hospitalModel) throw new KatoCommonError(`id为 ${id} 的机构不存在`);

    const {checkSystem} = await CheckHospitalModel.findOne({
      where: {
        hospital: id
      },
      include: [
        {
          model: CheckSystemModel,
          where: checkId ? {checkId: checkId} : {checkType: 1}
        }
      ]
    });

    if (!checkSystem) throw new KatoCommonError(`该机构未绑定考核`);

    const children = await Promise.all(
      (
        await CheckRuleModel.findAll({
          where: {checkId: checkSystem.checkId, parentRuleId: null},
          include: [RuleHospitalBudgetModel]
        })
      ).map(async rule => {
        const children = (
          await CheckRuleModel.findAll({
            attributes: {exclude: ['budget']},
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
          it.isUploadAttach = false;
          //含定性指标,并且判断是否在可上传时间范围内
          const ruleTagDateRange = it.ruleTags.find(
            tag =>
              tag.tag === MarkTagUsages.Attach.code &&
              tag.attachStartDate &&
              tag.attachEndDate
          );
          if (ruleTagDateRange) {
            it.isUploadAttach =
              dayjs().isAfter(ruleTagDateRange.attachStartDate) &&
              dayjs().isBefore(ruleTagDateRange.attachEndDate);
          }
          return it;
        });
        return {
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          ruleScore: rule.ruleScore,
          budget:
            rule.ruleHospitalBudget
              .filter(it => it.hospitalId === id)
              .reduce(
                (res, next) => new Decimal(res).add(next.budget),
                new Decimal(0)
              )
              .toNumber() ?? 0,
          children
        };
      })
    );
    const returnValue = checkSystem.toJSON();
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

  /***
   * 机构信息
   * @param id
   */
  async info(id) {
    return HospitalModel.findOne({where: {id}});
  }
}

async function queryProjectDoctorWorkPoint(params) {
  let sql = sqlRender(
    `
            select
            vh.h_id as "hospitalId",
            vh.hishospid
            from hospital_mapping vh
            where 1 = 1
            {{#if hospitalId}} and vh.h_id = {{? hospitalId}}{{/if}}
            {{#if hospitalIds}} and vh.h_id in ({{#each hospitalIds}}{{? this}}{{#sep}},{{/sep}}{{/each}}){{/if}}
            group by vh.h_id,vh.hishospid
    `,
    params
  );
  const hospitals = await appQuery(sql[0], sql[1]);
  sql = sqlRender(
    `
            select
            vws.operatorid as doctorId,
            vws.doctor as doctorName,
            vws.projecttype as "projectId",
            cast(sum(vws.score) as int) as "workPoint",
            vws.operateorganization
            from view_workscoretotal vws
            where 1 = 1
            {{#if projectIds}} and projecttype in ({{#each projectIds}}{{? this}}{{#sep}},{{/sep}}{{/each}}){{/if}}
             and missiontime >= {{? start}}
             and missiontime < {{? end}}
            group by vws.operatorid, vws.doctor,vws.projecttype,vws.operateorganization
    `,
    params
  );
  const workPoints = await originalQuery(sql[0], sql[1]);
  return Array.from(
    new Set(
      workPoints
        .filter(
          p =>
            hospitals.filter(h => p.operateorganization === h.hishospid)
              .length > 0
        )
        .map(vws => vws.doctorid + '-' + vws.doctorname + '-' + vws.projectId)
    )
  ).map(vws => ({
    doctorid: vws.split('-')[0],
    doctorname: vws.split('-')[1],
    projectId: vws.split('-')[2],
    score: workPoints
      .filter(
        p =>
          p.doctorid === vws.split('-')[0] &&
          p.doctorname === vws.split('-')[1] &&
          p.projectId === vws.split('-')[2] &&
          hospitals.filter(h => p.operateorganization === h.hishospid).length >
            0
      )
      .reduce((result, current) => (result += current.workPoint), 0)
  }));
}

async function appQuery(sql, params) {
  return appDB.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

async function originalQuery(sql, params) {
  return originalDB.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}
