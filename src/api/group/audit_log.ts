import {appDB} from '../../app';
import {sql as sqlRender} from '../../database/template';

export default class AuditLog {
  async list(name, pageNo, pageSize) {
    const [sql, params] = sqlRender(
      `
        select *
        from audit_log
        where 1=1
        {{#if name}}
            AND "user_name" like {{? name}}
        {{/if}}
      `,
      {
        name: `%${name}%`
      }
    );
    console.log(sql);
    console.log(params);
    return await appDB.page(sql, pageNo ?? 1, pageSize ?? 10, ...params);
  }
}
