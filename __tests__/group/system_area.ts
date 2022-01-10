import {app, appDB, originalDB} from '../../src/app';
import {KatoCommonError} from 'kato-server';
import {getAreaTree} from '../../src/api/group/common';
import {getYear} from '../../src/api/group/system_area';
import {KatoClient} from 'kato-client';

let api;
beforeAll(async () => {
  await app.start();
  api = new KatoClient('http://localhost:3000/api');
  await api.init();
});

afterAll(async () => {
  await app.shutdown();
});

async function yearGetCheckId(code, year) {
  // 根据年份和地区获取checkId
  return (
    await appDB.execute(
      // language=PostgreSQL
      `
        select checkArea.check_system
        from check_area checkArea
               inner join check_system systems on checkArea.check_system = systems.check_id
          and systems.check_year = ?
        where checkArea.area = ?
      `,
      year,
      code
    )
  )[0]?.check_system;
}

async function total(code, year) {
  // 查询本级权限
  const areaModel: {
    code: string;
    name: string;
    parent: string;
    label: string;
  } = (
    await originalDB.execute(
      `
          select code, name, parent, label
          from area
          where code = ?`,
      code
    )
  )[0];
  if (!areaModel) throw new KatoCommonError(`地区 ${code} 不合法`);

  // 获取树形结构
  const tree = await getAreaTree('34');
  const parentIndex = tree.findIndex(it => it.code === areaModel.parent);

  // 如果没有传年份,获取年份
  year = getYear(year);

  // 通过地区编码和时间获取checkId
  const checkId = await yearGetCheckId(code, year);

  let reportArea;
  if (checkId) {
    // 查询考核体系
    reportArea = (
      await appDB.execute(
        // language=PostgreSQL
        `
            select "check" AS "checkId",
                   area    AS "areaCode",
                   "correctWorkPoint",
                   "workPoint",
                   "totalWorkPoint",
                   score,
                   rate,
                   budget,
                   created_at,
                   updated_at
            FROM report_area AS reportArea
            WHERE reportArea.area = ?
              AND reportArea."check" = ?
          `,
        code,
        checkId
      )
    )[0];
  }

  return {
    id: areaModel.code,
    name: areaModel.name,
    parent: parentIndex > -1 ? areaModel.parent : null,
    label: areaModel?.label ?? null,
    score: reportArea ? Number(reportArea.score) : 0,
    workPoint: reportArea ? Number(reportArea.workPoint) : 0,
    rate: reportArea ? Number(reportArea.rate) : 0,
    totalWorkPoint: reportArea ? Number(reportArea.totalWorkPoint) : 0,
    budget: reportArea ? Number(reportArea.budget) : 0,
    correctWorkPoint: reportArea ? Number(reportArea.correctWorkPoint) : 0
  };
}

describe('统计数据', () => {
  test('质量系数和公分值统计', async () => {
    //查询id
    const users = (
      await appDB.execute(`select id, area from "user" where account='admin'`)
    )[0];
    //设置token
    api.use(async (ctx, next) => {
      ctx.req.headers['token'] = users?.id;
      ctx.req.headers['code'] = users?.area;
      await next();
    });

    const oldTotal = await total('340202', 2021);
    const newTotal = await api.SystemArea.total('340202', 2021);
    expect(newTotal).toEqual(oldTotal);
  });
});
