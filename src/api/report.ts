import {ossClient} from '../../util/oss';
import * as config from 'config';
import * as path from 'upath';
import {
  CheckHospitalModel,
  CheckSystemModel,
  CheckRuleModel,
  HospitalModel,
  RegionModel,
  RuleHospitalScoreModel,
  sql as sqlRender
} from '../database';
import {KatoCommonError} from 'kato-server';
import {Workbook} from 'exceljs';
import {Context} from './context';
import * as ContentDisposition from 'content-disposition';

import {Op} from 'sequelize';
import dayjs = require('dayjs');
import {originalDB, appDB} from '../app';

import {createTransport} from 'nodemailer';

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
      ContentDisposition(`${xlsName}考核结果.xls`)
    );
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.setHeader('Content-Type', 'application/vnd.ms-excel');

    const buffer = await workBook.xlsx.writeBuffer();
    res.send(buffer);
    //导出结束
  }

  /**
   * 检查定时任务是否执行成功
   */
  async checkTimming() {
    // 拼接查询条件
    const paramObj = {
      viewStartDate: dayjs(dayjs().format('YYYY-MM-DD 22:00:00'))
        .subtract(1, 'day')
        .toDate(),
      viewEndDate: dayjs().toDate(),
      markStartDate: dayjs(dayjs().format('YYYY-MM-DD 02:00:00')).toDate(),
      markEndDate: dayjs().toDate(),
      ruleStartDate: dayjs(dayjs().format('YYYY-MM-DD 00:00:00')).toDate(),
      ruleEndDate: dayjs().toDate(),
      year: dayjs().year()
    };

    /**
     * view相关表检查,同步的表
     *
     * view_hypertension 高血压登记
     * view_hypertensionVisit 高血压随访
     * view_Diabetes 糖尿病登记
     * view_diabetesVisit 糖尿病随访
     * view_Healthy 体检信息登记
     * view_sanitarycontrolreport 卫生计生监督信息报告
     * view_sanitarycontrolassist 卫生监督协管巡查登记信息
     * view_healthchecktablescore 老年人生活自理能力
     * view_personfacecollect 人脸采集表
     * view_personinfo
     * view_workscoretotal 公分表
     *
     * rule_hospital_score 得分表
     * rule_hospital_budget 金额分配
     * report_hospital 机构报告
     */
    const viewList = [
      'view_hypertension',
      'view_hypertensionVisit',
      'view_diabetes',
      'view_diabetesVisit',
      'view_Healthy',
      'view_sanitarycontrolreport',
      'view_sanitarycontrolassist',
      'view_healthchecktablescore',
      'view_personfacecollect',
      'view_personinfo',
      'view_workscoretotal',

      'mark_content',
      'mark_organization',
      'mark_person',

      'check_system'
    ];

    const selView = await Promise.all(
      viewList.map(async it => {
        let list;
        let oldList;
        if (it.startsWith('view')) {
          /**
           * 检查同步视图数据
           */
          const [sql, params] = sqlRender(
            `
              select 1 as counts
              from ${it}
              where created_at >= {{? viewStartDate}}
                  and created_at < {{? viewEndDate}}
              limit 1`,
            paramObj
          );
          list = await originalDB.execute(sql, ...params);
          // 检查是否删除掉了老数据
          const [oldSql, oldParams] = sqlRender(
            `
              select 1 as counts
              from ${it}
              where created_at < {{? viewStartDate}}
              limit 1`,
            paramObj
          );
          oldList = await originalDB.execute(oldSql, ...oldParams);
        } else if (it.startsWith('mark')) {
          /**
           * 同步Mark数据
           */
          const [sql, params] = sqlRender(
            `
              select 1 as counts
              from ${it}
              where created_at >= {{? markStartDate}}
              and created_at < {{? markEndDate}}
              limit 1`,
            paramObj
          );
          list = await originalDB.execute(sql, ...params);
          // 检查是否删除掉了老数据
          const [oldSql, oldParams] = sqlRender(
            `
              select 1 as counts
              from ${it}
              where created_at < {{? markStartDate}}
              and year = {{? year}}
              limit 1`,
            paramObj
          );
          oldList = await originalDB.execute(oldSql, ...oldParams);
        } else {
          /**
           * 考核得分表
           */
          const [sql, params] = sqlRender(
            `
              select 1 as counts
              from ${it}
              where run_time > {{? ruleStartDate}}
              and status = true
              limit 1`,
            paramObj
          );
          list = await appDB.execute(sql, ...params);
          // 检查是否存在没有打分的数据
          const [oldSql, oldParams] = sqlRender(
            `
              select 1 as counts
              from ${it}
              where run_time < {{? ruleStartDate}}
              and status = true
              limit 1`,
            paramObj
          );
          oldList = await appDB.execute(oldSql, ...oldParams);
        }

        return {
          table: it,
          count: list[0]?.counts ?? 0,
          oldCount: oldList[0]?.counts ?? 0
        };
      })
    );
    return selView;

    const selViewZero = selView.filter(it => it.count < 1 || it.oldCount > 0);
    const tableName = selViewZero.map(it => it.table).join(',');
    if (selViewZero.length === 0) return;
    /**
     * 如果存在为零的数据, 说明有的表跑数据失败, 需要发送邮件
     */
    const transporter = createTransport({
      host: config.get('checkETL.email.sender.host'),
      port: config.get('checkETL.email.sender.port'), // SMTP 端口
      secure: true, // 使用 SSL
      auth: {
        user: config.get('checkETL.email.sender.email'), // 发邮件邮箱
        pass: config.get('checkETL.email.sender.password') // 此处不是qq密码,是发件人邮箱的授权码
      }
    });

    const mailOptions = {
      from: config.get<string>('checkETL.email.sender.email'), // 发件地址
      to: config.get<Array<string>>('checkETL.email.receivers').join(','), // 收件列表
      subject: '自动任务有异常数据', // 标题
      html: `以下表的数据没有跑${tableName}`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (e) {
      throw new KatoCommonError(`邮件发送失败: ${e}`);
    }
  }
}
