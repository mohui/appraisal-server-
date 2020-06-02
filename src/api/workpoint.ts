import * as dayjs from 'dayjs';
import {HospitalModel, RegionModel} from '../database/model';
import {etlDB} from '../app';
import {QueryTypes} from 'sequelize';
import {KatoCommonError} from 'kato-server';

export default class WorkPoint {
  /**
   * 获取考核地区/机构对应的总体情况
   *
   * @param code 地区或机构的code
   * @param start 开始时间
   * @param end 结束时间
   */
  async total(code, start, end): Promise<{name: string; score: number}> {
    start = start ?? dayjs().startOf('y');
    end = start.add(1, 'y');
    const regionModel = await RegionModel.findOne({where: {code}});
    if (regionModel) {
      // language=PostgreSQL
      const score =
        (
          await etlDB.query(
            `
            select sum(vws.score) as score
            from view_workscoretotal vws
                   left join view_hospital vh on vws.operateorganization = vh.hospid
            where vh.regioncode like ?
              and vws.missiontime >= ?
              and vws.missiontime < ?
          `,
            {
              replacements: [`${code}%`, start.toDate(), end.toDate()],
              type: QueryTypes.SELECT
            }
          )
        )[0]?.score ?? 0;
      return {
        name: regionModel.name,
        score: Number(score)
      };
    }
    const hospitalModel = await HospitalModel.findOne({where: {id: code}});
    if (hospitalModel) {
      // language=PostgreSQL
      const score =
        (
          await etlDB.query(
            `
            select sum(vws.score) as score
            from view_workscoretotal vws
                   left join hospital_mapping hm on vws.operateorganization = hm.hishospid
            where hm.h_id = ?
              and vws.missiontime >= ?
              and vws.missiontime < ?
          `,
            {
              replacements: [code, start.toDate(), end.toDate()],
              type: QueryTypes.SELECT
            }
          )
        )[0]?.score ?? 0;
      return {
        name: hospitalModel.name,
        score: Number(score)
      };
    }

    throw new KatoCommonError(`${code} 不存在`);
  }

  async rank1(code, start, end) {
    start = start ?? dayjs().startOf('y');
    end = start.add(1, 'y');
    const regionModel = await RegionModel.findOne({where: {code}});
  }
}
