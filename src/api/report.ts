import {ossClient} from '../../util/oss';
import * as config from 'config';
import * as path from 'upath';
import {unifs} from '../app';
import {sql as sqlRender} from '../database';
import {KatoCommonError} from 'kato-server';
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
   * unifs文件地址
   *
   * @param file 签名
   */
  async sign(file) {
    return await unifs.getExternalUrl(file);
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

    const selViewZero = selView.filter(it => it.count < 1 || it.oldCount > 0);
    const tableName = selViewZero.map(it => it.table).join(',');
    if (selViewZero.length === 0) return;
    /**
     * 如果存在为零的数据或者历史记录没有删除干净的数据, 说明有的表跑数据失败, 需要发送邮件
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
      html: `以下表的数据存在异常${tableName}`
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (e) {
      throw new KatoCommonError(`邮件发送失败: ${e}`);
    }
  }
}
