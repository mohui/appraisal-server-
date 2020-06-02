import * as dayjs from 'dayjs';
import {HospitalModel, RegionModel} from '../database/model';
import {etlDB} from '../app';
import {Op, QueryTypes} from 'sequelize';
import {KatoCommonError} from 'kato-server';

function prepareStartAndEnd(start?, end?) {
  start =
    start ??
    dayjs()
      .startOf('y')
      .toDate();
  end =
    end ??
    dayjs(start)
      .add(1, 'y')
      .toDate();

  return {start, end};
}

export default class WorkPoint {
  /**
   * 获取考核地区/机构对应的总体情况
   *
   * @param code 地区或机构的code
   * @param startOptional 开始时间, 可选, 默认值为当前年的开始
   * @param endOptional 结束时间, 可选, 默认值为当前下一年的开始
   * @return { id: id, name: '名称', score: '工分值'}
   */
  async total(code, startOptional, endOptional) {
    const {start, end} = prepareStartAndEnd(startOptional, endOptional);
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
              replacements: [`${code}%`, start, end],
              type: QueryTypes.SELECT
            }
          )
        )[0]?.score ?? 0;
      return {
        id: code,
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
              replacements: [code, start, end],
              type: QueryTypes.SELECT
            }
          )
        )[0]?.score ?? 0;
      return {
        id: code,
        name: hospitalModel.name,
        score: Number(score)
      };
    }

    throw new KatoCommonError(`${code} 不存在`);
  }

  /**
   * 获取当前地区一级机构排行
   *
   * @param code 地区code
   * @param startOptional 开始时间, 可选, 默认值为当前年的开始
   * @param endOptional 结束时间, 可选, 默认值为当前下一年的开始
   */
  async rank(code, startOptional, endOptional) {
    const {start, end} = prepareStartAndEnd(startOptional, endOptional);
    const regionModel = await RegionModel.findOne({where: {code}});
    if (!regionModel) throw new KatoCommonError(`地区 ${code} 不存在`);
    return await Promise.all(
      (
        await HospitalModel.findAll({
          where: {
            regionId: {
              [Op.like]: `${code}%`
            }
          }
        })
      ).map(async hospital => {
        const item = await this.total(hospital.id, start, end);
        return {
          ...item,
          parent: hospital.parent
        };
      })
    );
  }
}
