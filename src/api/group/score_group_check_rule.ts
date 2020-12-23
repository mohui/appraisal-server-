import {KatoCommonError, should, validate} from 'kato-server';
import {HospitalModel, RegionModel} from '../../database/model';
import {sql as sqlRender} from '../../database/template';
import {appDB, originalDB} from '../../app';
import {Decimal} from 'decimal.js';
import {Context} from '../context';
import * as dayjs from 'dayjs';
import {Op} from 'sequelize';

export default class ScoreGroupCheckRule {
  /**
   * 获取考核地区/机构对应的考核总体情况
   *
   * @param code 地区或机构的code
   * @param checkId 考核体系 为空时默认查找主考核体系
   * @return { id: id, name: '名称', score: '考核得分', rate: '质量系数'}
   */
  async total(code, checkId) {
    return {
      id: '3402',
      name: '芜湖市',
      score: 40075986.859490514,
      originalScore: 54104423,
      rate: 0.7599249148753182
    };
  }

  /**
   * 人脸采集信息
   *
   * @param code 地区code或机构id
   */
  @validate(
    should
      .string()
      .required()
      .description('地区code或机构id')
  )
  async faceCollect(code) {
    let faceData = {face: 0, total: 0, rate: 0};
    //如果是一个地区
    const region = await RegionModel.findOne({where: {code}});
    if (region) {
      const sql = sqlRender(
        `select
            coalesce(sum("S00"),0)::integer as "total",
            coalesce(sum("S30"),0)::integer as "face" from mark_organization
            where id::varchar in ({{#each hishospid}}{{? this}}{{#sep}},{{/sep}}{{/each}})`,
        {
          hishospid: (
            await appDB.execute(
              `
                    select hm.hishospid
                    from hospital_mapping hm
                    inner join hospital h on h.id=hm.h_id
                    where h.region like ?`,
              `${code}%`
            )
          ).map(i => i.hishospid)
        }
      );
      faceData = (await originalDB.execute(sql[0], ...sql[1]))[0];
    } else {
      try {
        const hospital = await HospitalModel.findOne({where: {id: code}});
        //如果是一家机构
        if (hospital)
          faceData = (
            await originalDB.execute(
              `select
                coalesce(sum("S00"),0)::integer as "total",
                coalesce(sum("S30"),0)::integer as "face" from mark_organization
                where id=?`,
              (
                await appDB.execute(
                  `select hishospid from hospital_mapping where h_id=?`,
                  code
                )
              )?.[0]?.hishospid
            )
          )[0];
      } catch (e) {
        throw new KatoCommonError('所传参数code,不是地区code或机构id');
      }
    }
    faceData.rate =
      new Decimal(faceData.face).div(faceData.total).toNumber() || 0;
    return faceData;
  }

  async history(code, checkId) {
    return [
      {
        date: '2020-11-16',
        totalScore: 124915,
        score: 52363.202326572726,
        rate: 0.41919066826700335
      },
      {
        date: '2020-11-17',
        totalScore: 124915,
        score: 52363.202326572726,
        rate: 0.41919066826700335
      }
    ];
  }

  /**
   * 获取省市排行
   *
   * @param code group code
   * @param checkId 考核体系id
   */
  async rank(code, checkId) {
    return [
      {
        code: '3402',
        name: '芜湖市',
        level: 2,
        parent: '34',
        budget: '0.0000',
        id: '3402',
        score: 40075986.8594905,
        originalScore: 54104423,
        rate: 0.7599249148753187
      }
    ];
  }
}
