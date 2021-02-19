import {
  RegionModel,
  HospitalModel,
  WorkDifficultyModel
} from '../database/model';
import {should, validate} from 'kato-server';
import {sql as sqlRender} from '../database/template';
import {originalDB} from '../app';
import {Projects} from '../../common/project';
import {Context} from './context';

function countWorkRender(params) {
  return sqlRender(
    `select projecttype as "projectId", to_char(missiontime, 'yyyy-MM-dd') as day, cast(count(1) as int) as count
     from (
         select w.projecttype, w.missiontime,
                h.hospname,
                --1为center, 0为institute
                case
                    when h.hospname like '%服务中心' then 1
                    when h.hospname like '%服务站' then 1
                    when h.hospname like '%卫生院' then 0
                    when h.hospname like '%卫生室' then 0 end as hosipitalType
         from view_workscoretotal w
                  join view_hospital h on h.hospid::varchar = w.operateorganization
                  join (select r.regioncode,
                               r.regionname,
                               r.regioncode districtcode,
                               r.regionname districtname
                        from view_region r
                        where r.regionlevel = 3
                        union
                        select c.regioncode,
                               c.regionname,
                               p.regioncode districtcode,
                               p.regionname districtname
                        from view_region c
                                 join view_region p on c.reg_regioncode = p.regioncode
                        where c.regionlevel = 4
                        union
                        select c.regioncode,
                               c.regionname,
                               p2.regioncode districtcode,
                               p2.regionname districtname
                        from view_region c
                                 join view_region p1 on c.reg_regioncode = p1.regioncode
                                 join view_region p2 on p1.reg_regioncode = p2.regioncode
                        where c.regionlevel = 5) d on h.regioncode::varchar = d.regioncode
         where districtcode = {{? code}}
           and missiontime >= {{? start}}
           and missiontime < {{? end}}
     ) as temp
     {{#if scope}}
     where hosipitalType={{? scope}}
     {{/if}}
    group by projecttype, to_char(missiontime, 'yyyy-MM-dd')
    order by projecttype, day;`,
    params
  );
}

export default class Region {
  //通过code查询下一级行政区域
  @validate(should.string().allow(null))
  async list(code) {
    if (!code) code = Context.current.user.regionId;
    return await RegionModel.findAll({
      paranoid: false,
      attributes: {exclude: ['deleted_at']},
      where: {parent: code}
    });
  }

  //地区的信息
  @validate(
    should
      .string()
      .required()
      .description('地区code')
  )
  async info(code) {
    return RegionModel.findOne({where: {code}});
  }

  @validate(should.string().description('通过code查询区域下的机构'))
  async listHospital(code) {
    return await HospitalModel.findAll({
      attributes: {
        exclude: ['deleted_at']
      },
      where: {region: code},
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

  /***
   * 工分的难度列表
   * @param params
   * @returns [{
   *   year:  年份
   *   districtCode:  地区code
   *   districtName:  地区name
   *   scope: 数据范围
   *   name:  工分code
   *   code:  工分name
   *   difficulty:  难度系数
   * }]
   */
  @validate(
    should.object({
      code: should.string().description('区code'),
      scope: should.string().description('数据范围'),
      year: should.number().description('年份')
    })
  )
  async workDifficultyList(params) {
    const {code, scope, year} = params;
    return WorkDifficultyModel.findAll({
      attributes: {exclude: ['id']},
      where: {districtCode: code, scope: scope, year: year}
    });
  }

  /***
   * 工分完成次数统计接口
   * @param params
   * @returns [{
   *   projectId: 工分项id
   *   projectName: 工分项名称
   *   data:[{
   *     day: 完成时间,
   *     count: 完成次数
   *   }]
   * }]
   */
  @validate(
    should.object({
      code: should
        .string()
        .required()
        .description('区域code'),
      scope: should
        .string()
        .required()
        .description('数据范围'),
      year: should
        .number()
        .required()
        .description('年份')
    })
  )
  async workCount(params) {
    const {code, year, scope} = params;
    let scopeType = null;
    if (scope === 'institute') scopeType = 0;
    if (scope === 'center') scopeType = 1;
    const start = `${year}-01-01 00:00:00`;
    const end = `${year + 1}-01-01 00:00:00`;
    const sqlRender = countWorkRender({
      code: code,
      start: start,
      end: end,
      scope: scopeType
    });
    const res = await originalDB.execute(sqlRender[0], ...sqlRender[1]);
    return res
      .filter(it => Projects.some(p => p.id === it.projectId))
      .reduce((result, next) => {
        let current = result.find(r => r.projectId === next.projectId);
        if (current) current.data.push({day: next.day, count: next.count});
        if (!current)
          result.push({
            projectId: next.projectId,
            projectName: Projects.find(p => p.id === next.projectId)?.name,
            data: [{day: next.day, count: next.count}]
          });
        return result;
      }, []);
  }
}
