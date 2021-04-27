import {appDB} from '../../app';
import {sql as sqlRender} from '../../database/template';
import {Context} from '../context';

export default class AuditLog {
  async list(start, end, checkId, name, pageNo, pageSize) {
    if (name) name = `%${name}%`;
    const [sql, params] = sqlRender(
      `
        select *
        from audit_log
        where extra ->> 'type' = 'check'
        {{#if start}}
          and time >= {{? start}} and time < {{? end}}
        {{/if}}
        {{#if name}}
            AND "user_name" like {{? name}}
        {{/if}}
        {{#if checkId}}
            AND extra ->> 'checkId' = {{? checkId}}
        {{/if}}
        order by created_at desc
      `,
      {
        name,
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
