import {appDB} from '../../app';
import {sql as sqlRender} from '../../database/template';

export default class AuditLog {
  async list(start, end, name, pageNo, pageSize) {
    if (name) name = `%${name}%`;
    const [sql, params] = sqlRender(
      `
        select *
        from audit_log
        where 1=1
        {{#if name}}
            AND "user_name" like {{? name}}
        {{/if}}
        {{#if start}}
          and time >= {{? start}} and time < {{? end}}
        {{/if}}
      `,
      {
        name,
        start: start,
        end: end
      }
    );
    console.log(sql);
    console.log(params);
    return await appDB.page(sql, pageNo ?? 1, pageSize ?? 10, ...params);
  }
}
