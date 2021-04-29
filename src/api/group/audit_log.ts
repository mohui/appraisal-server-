import {appDB} from '../../app';
import {sql as sqlRender} from '../../database/template';
import IP2Region from 'ip2region';

const ip2region = new IP2Region();

export default class AuditLog {
  async list(start, end, checkId, account, pageNo, pageSize) {
    if (account) account = `%${account}%`;
    const [sql, params] = sqlRender(
      `
        select *
        from audit_log
        where extra ->> 'type' = 'check'
        {{#if start}}
          and time >= {{? start}} and time < {{? end}}
        {{/if}}
        {{#if account}}
            AND extra ->> 'account' like {{? account}}
        {{/if}}
        {{#if checkId}}
            AND extra ->> 'checkId' = {{? checkId}}
        {{/if}}
        order by created_at desc
      `,
      {
        account,
        checkId,
        start: start,
        end: end
      }
    );
    const result = await appDB.page(
      sql,
      pageNo ?? 1,
      pageSize ?? 10,
      ...params
    );
    //补充ip地址查询
    for (const row of result.data) {
      if (row.extra?.ip) {
        const ipResult = ip2region.search(row.extra.ip);
        row.extra.region = (ipResult?.province ?? '') + (ipResult?.city ?? '');
      }
    }
    return result;
  }

  async checkSystems() {
    return appDB.execute(
      `select
              check_id "checkId",
              check_name "checkName",
              check_year "checkYear"
            from check_system
            order by created_at desc`
    );
  }
}
