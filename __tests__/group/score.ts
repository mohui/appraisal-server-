import {app, appDB} from '../../src/app';
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

/***
 * 获取手动打分历史
 *
 * @param ruleId 细则id
 * @param code  地区code或者机构id
 */
async function mockManualScoreHistory(ruleId, code) {
  return (
    await appDB.execute(
      // language=PostgreSQL
      `
        SELECT "ManualScoreHistory"."id",
               "ManualScoreHistory"."rule"    AS "ruleId",
               "ManualScoreHistory"."code",
               "ManualScoreHistory"."creator" AS "creatorId",
               "ManualScoreHistory"."score",
               "ManualScoreHistory"."remark",
               "ManualScoreHistory"."created_at",
               "ManualScoreHistory"."updated_at",
               "creator"."id"                 AS "creatorId2",
               "creator"."account"            AS "creatorAccount",
               "creator"."name"               AS "creatorName",
               "creator"."password"           AS "creatorPassword",
               "creator"."area"               AS "creatorAreaCode",
               "creator"."region"             AS "creatorRegionId",
               "creator"."creator"            AS "creatorCreatorId",
               "creator"."editor"             AS "creatorEditorId",
               "creator"."created_at"         AS "creatorCreated_at",
               "creator"."updated_at"         AS "creatorUpdated_at"
        FROM "manual_score_history" AS "ManualScoreHistory"
               LEFT OUTER JOIN "user" AS "creator" ON "ManualScoreHistory"."creator" = "creator"."id"
        WHERE "ManualScoreHistory"."rule" = ?
          AND "ManualScoreHistory"."code" = ?
        ORDER BY "ManualScoreHistory"."created_at" DESC;

      `,
      ruleId,
      code
    )
  ).map(it => ({
    id: it.id,
    ruleId: it.ruleId,
    code: it.code,
    creatorId: it.creatorId,
    score: it.score,
    remark: it.remark,
    // eslint-disable-next-line @typescript-eslint/camelcase
    created_at: it.created_at,
    // eslint-disable-next-line @typescript-eslint/camelcase
    updated_at: it.updated_at,
    creator: {
      id: it.creatorId2,
      account: it.creatorAccount,
      name: it.creatorName,
      password: it.creatorPassword,
      areaCode: it.creatorAreaCode,
      regionId: it.creatorRegionId,
      creatorId: it.creatorCreatorId,
      editorId: it.creatorEditorId,
      // eslint-disable-next-line @typescript-eslint/camelcase
      created_at: it.creatorCreated_at,
      // eslint-disable-next-line @typescript-eslint/camelcase
      updated_at: it.creatorUpdated_at
    }
  }));
}

describe('Score.manualScoreHistory', () => {
  test('测试39b9a7f0-b66a-47d0-87f4-f785e226c64d 和 7dc8edb1-3d60-4e4d-a4a0-b7ce90bdf2c7', async () => {
    //查询id
    const user = (
      await appDB.execute(`select id, area from "user" where account='admin'`)
    )[0];
    //设置token
    api.use(async (ctx, next) => {
      ctx.req.headers['token'] = user?.id;
      await next();
    });

    const oldTotal = await mockManualScoreHistory(
      '39b9a7f0-b66a-47d0-87f4-f785e226c64d',
      '7dc8edb1-3d60-4e4d-a4a0-b7ce90bdf2c7'
    );
    const newTotal = await api.Score.manualScoreHistory(
      '39b9a7f0-b66a-47d0-87f4-f785e226c64d',
      '7dc8edb1-3d60-4e4d-a4a0-b7ce90bdf2c7'
    );
    expect(newTotal).toEqual(oldTotal);
  });
});
