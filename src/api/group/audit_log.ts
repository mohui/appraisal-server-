import {appDB} from '../../app';
import {sql as sqlRender} from '../../database/template';
import {Context} from '../context';

export async function contextAudit(params) {
  const {
    module,
    checkId,
    checkName,
    checkYear,
    curd,
    type,
    ruleId,
    ruleName,
    parentRuleId,
    parentRuleName
  } = params;
  Context.current.auditLog = {};
  Context.current.auditLog.module = module;
  Context.current.auditLog.checkId = checkId;
  Context.current.auditLog.checkName = checkName;
  Context.current.auditLog.checkYear = checkYear;
  Context.current.auditLog.ruleId = ruleId;
  Context.current.auditLog.ruleName = ruleName;
  Context.current.auditLog.parentRuleId = parentRuleId;
  Context.current.auditLog.parentRuleName = parentRuleName;
  Context.current.auditLog.curd = curd;
  Context.current.auditLog.type = type;
  Context.current.auditLog.ip = Context.current.req.ip;
  return Context.current.auditLog;
}
export default class AuditLog {
  async list(start, end, name, module, method, pageNo, pageSize) {
    if (name) name = `%${name}%`;
    if (module) module = `%${module}%`;
    if (method) method = `%${method}%`;
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
