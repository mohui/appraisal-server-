import {
  CheckHospitalModel,
  CheckRuleModel,
  CheckSystemModel,
  HospitalModel,
  RegionModel,
  RuleHospitalScoreModel
} from '../database';
import {Op} from 'sequelize';
import {KatoCommonError, KatoRuntimeError} from 'kato-server';
import {Projects} from '../../common/project';
import {appDB, originalDB} from '../app';
import dayjs = require('dayjs');
import {Hospital} from '../database/model/hospital';

// import {createTransport, TransportOptions} from 'nodemailer';
import * as config from 'config';

export default class Test {
  // async test1() {
  //   const transporter = createTransport({
  //     host: config.get('checkETL.email.sender.host'),
  //     port: config.get('checkETL.email.sender.port'), // SMTP 端口
  //     secure: true, // 使用 SSL
  //     auth: {
  //       user: config.get('checkETL.email.sender.email'), // 发邮件邮箱
  //       pass: config.get('checkETL.email.sender.password') // 此处不是qq密码,是发件人邮箱的授权码
  //     }
  //   });
  //
  //   const mailOptions = {
  //     from: config.get<string>('checkETL.email.sender.email'), // 发件地址
  //     to: config.get<Array<string>>('checkETL.email.receivers').join(','), // 收件列表
  //     subject: '自动任务有异常数据', // 标题
  //     html: `以下表的数据没有跑`
  //   };
  //
  //   try {
  //     await transporter.sendMail(mailOptions);
  //   } catch (e) {
  //     throw new KatoCommonError(`邮件发送失败: ${e}`);
  //   }
  // }
  /**
   * 获取考核结果
   *
   * @param code 地区code/机构id
   * @param check 考核体系id
   */
  async test(code, check) {
    // 查找所有的机构
    let hospitals: HospitalModel[] = [];
    const regionModel = await RegionModel.findOne({where: {code: code}});
    if (regionModel) {
      hospitals = await HospitalModel.findAll({
        where: {
          region: {
            [Op.like]: `${code}%`
          }
        }
      });
    } else {
      hospitals = await HospitalModel.findAll({
        where: {
          [Op.or]: [{id: code}, {parent: code}]
        },
        include: []
      });
    }
    if (hospitals.length === 0)
      throw new KatoCommonError(`code为 [${code}] 不合法`);

    // 查找机构对应的考核体系
    const checkWhere = check ? {checkId: check} : {checkType: 1};
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
    hospitalCheckList = hospitalCheckList.filter(it => it.check);

    // 根据考核体系分组
    const checkGroups = [];
    for (const current of hospitalCheckList) {
      let check = checkGroups.find(it => it.id === current.check.checkId);

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

    return checkGroups;
  }

  async workPointList(id) {
    const hospital = await HospitalModel.findOne({where: {id}});
    if (!hospital) throw new KatoRuntimeError(`${id} 不合法`);
    // await appDB.execute();
    // return await originalDB.execute();

    // const t = await appDB.transaction();
    // try {
    //   // language=PostgreSQL
    //   appDB.query(`select 1`, {
    //
    //     transaction: t
    //   });
    //
    //   await t.commit();
    // } catch (e) {
    //   await t.rollback();
    // }
    //
    // const ret = await appDB.transaction(async () => {
    //   await CheckHospitalModel.update();
    //
    //   return '1232';
    // });
  }
}
