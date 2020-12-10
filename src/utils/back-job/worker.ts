import {parentPort, isMainThread, workerData} from 'worker_threads';
import {Workbook} from 'exceljs';
import * as path from 'path';
import {
  CheckHospitalModel,
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  RegionModel,
  RuleHospitalScoreModel
} from '../../database';
import {appDB} from '../../app';
import * as models from '../../database/model';
import {Op} from 'sequelize';
import {KatoCommonError} from 'kato-server';
appDB.addModels(Object.values(models));

// 考核报表下载
export async function reportCheck(code: string, id: any): Promise<string> {
  //查询数据
  // 机构编码
  let hospitals: HospitalModel[] = [];

  // 查询地区
  const regionOne = await RegionModel.findOne({
    where: {code}
  });

  // 导出文件名称 以所导出的地区/机构为名称
  let xlsName = '';

  // 判断是地区的导出耗时机构的导出
  if (regionOne) {
    xlsName = regionOne.name;
    // 如果是地区,查询该地区权限下的所有机构
    hospitals = await HospitalModel.findAll({
      where: {
        region: {
          [Op.like]: `${code}%`
        }
      }
    });
  } else {
    // 如果是机构, 查询出该机构下所有机构(一级机构下有二级机构)
    hospitals = await HospitalModel.findAll({
      where: {
        [Op.or]: [{id: code}, {parent: code}]
      },
      include: []
    });

    const hospitalObj = hospitals.find(it => {
      if (it.id === code) return it;
    });
    if (hospitalObj) xlsName = hospitalObj.name;
  }
  // 地区和机构都没有查到,说明是非法地区
  if (hospitals.length === 0)
    throw new KatoCommonError(`code为 [${code}] 不合法`);

  // 查找机构对应的考核体系,如果考核体系id为空,查所有的主考核ß
  const checkWhere = id ? {checkId: id} : {checkType: 1};

  let hospitalCheckList: any[] = await Promise.all(
    hospitals.map(async hospital => {
      const checkHospital: CheckHospitalModel = await CheckHospitalModel.findOne(
        {
          where: {
            hospitalId: hospital.id
          },
          include: [
            {
              model: CheckSystemModel,
              where: checkWhere
            }
          ]
        }
      );
      return {
        ...hospital.toJSON(),
        check: checkHospital?.checkSystem?.toJSON()
      };
    })
  );
  // 过滤所有没有考核的机构(可能存在一些不是主考核的考核)
  hospitalCheckList = hospitalCheckList.filter(it => it.check);

  // 根据考核体系分组
  const checkGroups = [];
  for (const current of hospitalCheckList) {
    let check = checkGroups.find(it => it.id === current.check.checkId);

    // 如果查找为空
    if (!check) {
      // 补充考核细则字段
      const rules = await CheckRuleModel.findAll({
        where: {
          checkId: current.check.checkId,
          parentRuleId: {[Op.not]: null}
        },
        attributes: ['ruleId', 'ruleName']
      });

      check = {
        id: current.check.checkId,
        name: current.check.checkName,
        hospitals: [],
        rules: rules
      };

      checkGroups.push(check);
    }

    // 查询机构考核细则得分
    const scores = await RuleHospitalScoreModel.findAll({
      where: {
        hospitalId: current.id,
        ruleId: {
          [Op.in]: check.rules.map(rule => rule.ruleId)
        }
      },
      attributes: ['score', 'ruleId']
    });

    // 补充考核机构字段
    check.hospitals.push({
      id: current.id,
      name: current.name,
      scores: scores
    });
  }

  const workBook = new Workbook();
  for (const it of checkGroups) {
    //开始创建Excel表格
    const workSheet = workBook.addWorksheet(`${it.name}考核结果`);

    //添加标题内容
    const firstRow = it.rules.map(item => `${item.ruleName}`);
    firstRow.unshift('机构名称');
    const ruleIds = it.rules.map(item => `${item.ruleId}`);

    // 填充每行数据
    const childrenHospitalCheckResult = it.hospitals.map(item => {
      // 机构的中文名称
      const data = [item.name];
      for (const ruleId of ruleIds) {
        const scoreObj = item.scores.find(
          scoreObj => scoreObj.ruleId === ruleId
        );
        data.push(Number(scoreObj?.score?.toFixed(2) ?? 0));
      }
      return data;
    });
    workSheet.addRows([firstRow, ...childrenHospitalCheckResult]);
  }
  const filepath = path.join(__dirname, `${xlsName}考核结果.xls`);
  await workBook.xlsx.writeFile(filepath);
  await new Promise(resolve => setTimeout(() => resolve(1), 3000));
  return filepath;
}

if (isMainThread) throw new Error('线程错误');

const {job} = workerData;

(async () => {
  let jobResult: string;
  //考核报表任务
  if (job === 'reportCheck') {
    const {code, id} = workerData;
    jobResult = await reportCheck(code, id);
  }
  parentPort.postMessage(jobResult);
})();
