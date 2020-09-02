import {
  RegionModel,
  HospitalModel,
  WorkDifficultyModel
} from '../database/model';
import {should, validate} from 'kato-server';
import {Op, QueryTypes} from 'sequelize';
import {RuleHospitalBudget} from '../database/model/rule-hospital-budget';
import {Decimal} from 'decimal.js';
import {sql as sqlRender} from '../database/template';
import {appDB} from '../app';
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
async function appQuery(sql, params) {
  return appDB.query(sql, {
    replacements: params,
    type: QueryTypes.SELECT
  });
}

export default class Region {
  //通过code查询下一级行政区域
  @validate(should.string().allow(null))
  async list(code) {
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

  //地区下所有的机构
  @validate(
    should
      .string()
      .required()
      .description('地区code')
  )
  async listAllHospital(code) {
    const regions = await RegionModel.findAll({where: {parent: code}});
    //查询当前用户所管的所有机构信息
    const hospitals = await HospitalModel.findAll({
      where: {
        region: {[Op.like]: `${Context.current.user.regionId}%`}
      },
      include: {
        model: RuleHospitalBudget,
        required: true,
        attributes: [
          'budget',
          'correctWorkPoint',
          'workPoint',
          'ruleScore',
          'ruleTotalScore',
          'rate'
        ]
      }
    }).map(it => {
      it = it.toJSON();
      //累加各机构每项规则的打分和金额数据
      const result = it.ruleHospitalBudget.reduce(
        (res, next) => {
          res.budget = res.budget.add(next.budget);
          res.correctWorkPoint = res.correctWorkPoint.add(
            next.correctWorkPoint
          );
          res.workPoint = res.workPoint.add(next.workPoint);
          res.score = res.score.add(next.ruleScore);
          res.totalScore = res.totalScore.add(next.ruleTotalScore);
          return res;
        },
        {
          budget: new Decimal(0),
          correctWorkPoint: new Decimal(0),
          workPoint: new Decimal(0),
          score: new Decimal(0),
          totalScore: new Decimal(0)
        }
      );
      result.budget = result.budget.toNumber();
      result.correctWorkPoint = result.correctWorkPoint.toNumber();
      result.workPoint = result.workPoint.toNumber();
      result.score = result.score.toNumber();
      result.totalScore = result.totalScore.toNumber();
      //计算质量系数
      result.rate =
        new Decimal(result.score).div(result.totalScore).toNumber() || 0;

      delete it.ruleHospitalBudget;
      return {...it, ...result};
    });
    //需要返回的是区级层面以上的数据
    if (regions && regions[0]?.level <= 3)
      return regions.map(region => {
        region = region.toJSON();
        const budgetInfo = hospitals
          .filter(h => h.regionId.indexOf(region.code) === 0) //筛选出各地区下的所有一级和二级机构
          .reduce(
            (res, next) => {
              //累加该地区下所有一级和二级机构的打分和金额数据
              res.budget = res.budget.add(next.budget);
              res.correctWorkPoint = res.correctWorkPoint.add(
                next.correctWorkPoint
              );
              res.workPoint = res.workPoint.add(next.workPoint);
              res.score = res.score.add(next.score);
              res.totalScore = res.totalScore.add(next.totalScore);
              return res;
            },
            {
              budget: new Decimal(0),
              correctWorkPoint: new Decimal(0),
              workPoint: new Decimal(0),
              score: new Decimal(0),
              totalScore: new Decimal(0)
            }
          );
        budgetInfo.budget = budgetInfo.budget.toNumber();
        budgetInfo.correctWorkPoint = budgetInfo.correctWorkPoint.toNumber();
        budgetInfo.workPoint = budgetInfo.workPoint.toNumber();
        budgetInfo.score = budgetInfo.score.toNumber();
        budgetInfo.totalScore = budgetInfo.totalScore.toNumber();
        budgetInfo.rate =
          new Decimal(budgetInfo.score).div(budgetInfo.totalScore).toNumber() ||
          0;

        return {...region, ...budgetInfo};
      });

    const region = await RegionModel.findOne({where: {code}});
    //如果是区级以下的地区
    if (region) {
      //筛选出该地区的一级机构
      return hospitals
        .filter(
          h =>
            h.regionId.indexOf(code) === 0 &&
            (h.name.endsWith('服务中心') || h.name.endsWith('卫生院'))
        )
        .map(center => {
          //计算每个一级机构与其子机构的数据之和
          const children = hospitals
            .filter(h => h.parent === center.id)
            .reduce(
              (res, next) => {
                //各个二级机构的数据累加
                res.budget = res.budget.add(next.budget);
                res.correctWorkPoint = res.correctWorkPoint.add(
                  next.correctWorkPoint
                );
                res.workPoint = res.workPoint.add(next.workPoint);
                res.score = res.score.add(next.score);
                res.totalScore = res.totalScore.add(next.totalScore);
                return res;
              },
              {
                //当前一级机构的数据作为初始值
                budget: new Decimal(center.budget),
                correctWorkPoint: new Decimal(center.correctWorkPoint),
                workPoint: new Decimal(center.workPoint),
                score: new Decimal(center.score),
                totalScore: new Decimal(center.totalScore)
              }
            );
          children.budget = children.budget.toNumber();
          children.correctWorkPoint = children.correctWorkPoint.toNumber();
          children.workPoint = children.workPoint.toNumber();
          children.score = children.score.toNumber();
          children.totalScore = children.totalScore.toNumber();
          children.rate =
            new Decimal(children.score).div(children.totalScore).toNumber() ||
            0;
          return {...center, ...children};
        })
        .map(it => ({code: it.id, ...it}));
    }
    const hospital = await HospitalModel.findOne({where: {id: code}});
    //如果是一级机构
    if (
      hospital &&
      (hospital.name.endsWith('卫生院') || hospital.name.endsWith('服务中心'))
    )
      //返回的数据中,包含该一级机构本身
      return hospitals
        .filter(h => h.id === code) //该一级机构本身放在第一个
        .concat(hospitals.filter(h => h.parent === code)) //筛选出该机构的二级机构
        .map(it => ({code: it.id, ...it}));
    //不符合任何情况 或 hospital是二级机构,返回[]
    return [];
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
    const res = await appQuery(sqlRender[0], sqlRender[1]);
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
