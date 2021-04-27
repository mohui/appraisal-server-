import {appDB} from '../../app';
import {sql as sqlRender} from '../../database/template';
import {Context} from '../context';

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
    return await appDB.page(sql, pageNo ?? 1, pageSize ?? 10, ...params);
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
