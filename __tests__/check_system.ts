import {app, appDB} from '../src/app';
import {v4 as uuid} from 'uuid';
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

async function oldAddRule(params, createId) {
  const result = await appDB.transaction(async () => {
    const ruleId = uuid();
    await appDB.execute(
      // language=PostgreSQL
      `
        insert into check_rule(rule_id,
                               check_id,
                               parent_rule_id,
                               rule_name,
                               rule_score,
                               check_standard,
                               check_method,
                               evaluate_standard,
                               create_by,
                               update_by,
                               status,
                               created_at,
                               updated_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ruleId,
      params.checkId,
      params.parentRuleId,
      params.ruleName,
      params.ruleScore,
      params.checkStandard,
      params.checkMethod,
      params.evaluateStandard,
      createId,
      createId,
      params.status,
      new Date(),
      new Date()
    );
    return (
      await appDB.execute(
        // language=PostgreSQL
        `
          select rule_id           "ruleId",
                 check_id          "checkId",
                 parent_rule_id    "parentRuleId",
                 rule_name         "ruleName",
                 rule_score        "ruleScore",
                 check_standard    "checkStandard",
                 check_method      "checkMethod",
                 evaluate_standard "evaluateStandard",
                 create_by,
                 update_by,
                 status,
                 created_at,
                 updated_at,
                 deleted_at,
                 budget
          from check_rule
          where rule_id = ?
        `,
        ruleId
      )
    )[0];
  });
  return result;
}

describe('CheckSystem.addRule', () => {
  test('测试添加考核项6e478d88-48ab-427b-961f-f19151317973下考核细则', async () => {
    //查询id
    const user = (
      await appDB.execute(`select id, area from "user" where account='admin'`)
    )[0];
    //设置token
    api.use(async (ctx, next) => {
      ctx.req.headers['token'] = user?.id;
      await next();
    });

    const oldTotal = await oldAddRule(
      {
        checkId: 'fdc7906c-69dc-4099-95e1-3063ad31a83c',
        ruleName: '考核内容',
        parentRuleId: '6e478d88-48ab-427b-961f-f19151317973',
        ruleScore: 120,
        checkStandard: '考核标准',
        checkMethod: '考核方法',
        status: true,
        evaluateStandard: '评分标准'
      },
      user?.id
    );
    const newTotal = await api.CheckSystem.addRule({
      checkId: 'fdc7906c-69dc-4099-95e1-3063ad31a83c',
      ruleName: '考核内容',
      parentRuleId: '6e478d88-48ab-427b-961f-f19151317973',
      ruleScore: 120,
      checkStandard: '考核标准',
      checkMethod: '考核方法',
      status: true,
      evaluateStandard: '评分标准'
    });
    expect(newTotal).toEqual(oldTotal);
  });
});
