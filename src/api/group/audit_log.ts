import {appDB} from '../../app';
import {sql as sqlRender} from '../../database/template';

export default class AuditLog {
  async list(start, end, name, module, method, pageNo, pageSize) {
    if (name) name = `%${name}%`;
    if (module) module = `%${module}%`;
    if (method) method = `%${method}%`;
    const [sql, params] = sqlRender(
      `
        select *
        from audit_log
        where 1=1
        {{#if start}}
          and time >= {{? start}} and time < {{? end}}
        {{/if}}
        {{#if name}}
            AND "user_name" like {{? name}}
        {{/if}}
        {{#if module}}
            AND "module" like {{? module}}
        {{/if}}
        {{#if method}}
            AND "method" like {{? method}}
        {{/if}}
      `,
      {
        name,
        module,
        method,
        start: start,
        end: end
      }
    );
    console.log(sql);
    console.log(params);
    return await appDB.page(sql, pageNo ?? 1, pageSize ?? 10, ...params);
  }
}
