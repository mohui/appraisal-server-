import {ossClient} from '../../util/oss';
import * as config from 'config';
import * as path from 'upath';
import {
  CheckHospitalModel,
  CheckSystemModel,
  CheckRuleModel,
  HospitalModel,
  RegionModel,
  RuleHospitalScoreModel
} from '../database';
import {KatoCommonError} from 'kato-server';
import {Workbook} from 'exceljs';
import {Context} from './context';
import * as ContentDisposition from 'content-disposition';

import {Op} from 'sequelize';

/**
 * 语义化时间
 *
 * @param time 时间字符串, '2020Q1', '2020H1', '2020Q3', '2020'
 */
function displayTime(time) {
  if (time.includes('Q')) {
    const times = time.split('Q');
    return `${times[0]}年第${times[1]}季度报告`;
  }
  if (time.includes('H')) {
    const times = time.split('H');
    return `${times[0]}年${times[1] === 1 ? '上' : '下'}半年报告`;
  }

  return `${time}年报告`;
}

export default class Report {
  /**
   * 获取报告列表
   *
   * @param id 地区或机构id
   * @return {
   *   id: 文件id
   *   name: 文件名
   *   url: 文件下载地址
   * }
   */
  async list(id) {
    return (
      (
        await ossClient.store.list({
          prefix: config.get('report.prefix'),
          delimiter: '/'
        })
      )?.objects ?? []
    )
      .filter(it => it.name.includes(`${id}_`)) // 文件名约定为 id_time.docx
      .map(it => ({
        id: it.name,
        name: displayTime(path.parse(it.name).name.split('_')[1]),
        url: it.url
      }));
  }

  /**
   * 导出考核
   *
   * @param code 地区/机构id
   * @param id 考核体系id
   */
  async downloadCheck(code, id) {
    code = '340203';
    // 机构编码
    let hospitals: HospitalModel[] = [];

    // 查询地区
    const regionOne = await RegionModel.findOne({
      where: {code}
    });
    // 判断是地区的导出耗时机构的导出
    if (regionOne) {
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
    }
    // 地区和机构都没有查到,说明是非法地区
    if (hospitals.length === 0)
      throw new KatoCommonError(`code为 [${code}] 不合法`);

    // 查找机构对应的考核体系,如果考核体系id为空,查所有的主考核
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

    // 导出方法
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
    Context.current.bypassing = true;
    const res = Context.current.res;

    //设置请求头信息，设置下载文件名称,同时处理中文乱码问题
    res.setHeader(
      'Content-Disposition',
      ContentDisposition(`考核结果文件名称.xls`)
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');

    const buffer = await workBook.xlsx.writeBuffer();
    res.send(buffer);
    //导出结束
  }

  /**
   * 地区的导出
   *
   * 判断有没有传考核体系id
   * 没有传考核体系id =》需要查询出所有的考核体系
   * 传考核体系id =》根据考核体系id查询所有的该地区下的考核机构的导出内容
   */
  async downloadArea(code) {
    // 查询该地区权限下的所有机构
    const hospitals = await HospitalModel.findAll({
      where: {
        region: {
          [Op.like]: `${code}%`
        }
      },
      attributes: ['id', 'name'],
      logging: console.log
    });

    // 取出所有的机构hospitalId
    const hospitalIdList = hospitals.map(item => item.id);

    // 根据机构的hospitalId获取考核机构及其考核主内容checkId
    const systemHospital = await CheckHospitalModel.findAll({
      where: {
        hospital: {
          [Op.in]: hospitalIdList
        }
      }
    });

    // 机构
    const systemList = [];
    for (const it of systemHospital) {
      // 分组考核id，把各个考核下的考核机构分到考核下
      const index = systemList.findIndex(item => item.checkId == it.checkId);
      if (index == -1) {
        systemList.push({
          checkId: it.checkId,
          hospital: [it.hospitalId]
        });
      } else {
        systemList[index].hospital.push(it.hospitalId);
      }
    }

    // 根据分组把各个考核导入到sheet中(添加一个得分的字段,去掉了细则父级)
    for (const it of systemList) {
      // 导入之前 =》 根据考核id获取考核细则内容
      const ruleList: (CheckRuleModel & {score: number})[] = (
        await CheckRuleModel.findAll({
          where: {
            checkId: it.checkId
          },
          logging: console.log
        })
      )
        .map(it => ({
          ...it.toJSON(),
          score: 0
        }))
        .filter(it => it.parentRuleId != null);

      // 取出考核细则id放到数组中
      const ruleIdList = ruleList.map(item => item.ruleId);

      // 根据细则id和机构id获取考核机构细则得分
      const ruleHospitalScore: RuleHospitalScoreModel[] = await RuleHospitalScoreModel.findAll(
        {
          where: {
            rule: {
              [Op.in]: ruleIdList
            },
            hospital: {
              [Op.in]: it.hospital
            }
          }
        }
      );

      // 定义一个机构数组
      const hospital = [];
      for (let i = 0; i < it.hospital.length; i++) {
        const children = ruleList.map(item => {
          const result = {...item};
          const index = ruleHospitalScore.findIndex(
            item1 =>
              item1.ruleId === result.ruleId &&
              item1.hospitalId === it.hospital[i]
          );
          if (index > -1) result.score = ruleHospitalScore[index].score;
          return result;
        });

        // 过滤出所有的细则
        hospital.push({
          hospital: it.hospital[i],
          children: children
        });
      }

      //导出方法
      //开始创建Excel表格
      const workBook = new Workbook();
      // const workSheet = workBook.addWorksheet(`${hospital.name}考核结果`);
      const workSheet = workBook.addWorksheet(`gaga考核结果`);
      //添加标题
      workSheet.addRow([`-helloWord`]);

      //以下是测试东西
      const firstRow = ['一级机构及二级机构', '一级机构', '二级机构'];
      const secondRow = ['---', '---', '---'];
      const thirdRow = [`西张明村`];
      const childrenHospitalCheckResult = ['111', '222', '333', '444'];

      workSheet.addRows([
        firstRow,
        secondRow,
        thirdRow,
        ...childrenHospitalCheckResult
      ]);

      //标题占据一整行单元格
      workSheet.mergeCells(1, childrenHospitalCheckResult[0].length, 1, 1);

      //let cellCount = 0;
      //合并单元格
      firstRow.forEach((row, index) => {
        if (index > 2 && index < firstRow.length - 1 && firstRow[index]) {
          // workSheet.mergeCells(2, index + 1, 2, index + cells[cellCount++]);
          workSheet.mergeCells(2, index + 1, 2, index + 22);
        }
      });

      Context.current.bypassing = true;
      const res = Context.current.res;
      //设置请求头信息，设置下载文件名称,同时处理中文乱码问题
      res.setHeader(
        'Content-Disposition',
        ContentDisposition(`gaga-考核结果表.xls`)
      );
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      const buffer = await workBook.xlsx.writeBuffer();
      res.send(buffer);
    }
  }
}
