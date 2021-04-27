import {Context} from '../context';
import {appDB} from '../../app';

/**
 * 审计注解符号
 */
const auditLogSymbol = Symbol('audit-log');

/**
 * 审计日志注解的对象参数
 */
type AuditLogModel = {
  module?: string; // 操作模块
  method?: string; // 操作方法
  //TODO: 这是可被json化的对象
  extra?: any; // 操作具体属性
  user_id?: string; // 操作人id
  user_name?: string; // 操作人名称
};

/**
 * 审计日志注解的函数参数
 */
type AuditLogFunction = () => Promise<AuditLogModel>;

/**
 * 审计日志注解
 *
 * @param params 注解参数
 */
export function AuditLog(params: AuditLogFunction | AuditLogModel) {
  return function(target, propertyName) {
    if (typeof target[propertyName] !== 'function') {
      throw new Error('AuditLog 只能作用在函数上');
    }

    target[propertyName][auditLogSymbol] = params;
  };
}

/**
 * 审计日志中间件
 */
export async function AuditLogMiddleware(
  ctx: Context,
  next: Function
): Promise<void> {
  // 日志时间
  const now = new Date();
  // kato流程完成后
  await next();
  // 获取注解对象
  const auditLogObject = ctx?.method?.method[auditLogSymbol];
  // 用户登录且有注解
  if (ctx.user && auditLogObject) {
    // 注解对象判断; 其实不用判断, 因为ts有类型检查
    if (
      typeof auditLogObject !== 'function' &&
      typeof auditLogObject !== 'object'
    ) {
      throw new Error('AuditLog 参数错误');
    }
    try {
      // 审计日志对象
      let auditLogModel: AuditLogModel;
      // 函数参数, 则执行
      if (typeof auditLogObject === 'function') {
        auditLogModel = await auditLogObject();
      }
      // 获取ip
      auditLogModel.extra.ip = Context.current.req.ip;

      if (!auditLogModel.extra?.checkName) {
        const checkSystem = await appDB.execute(
          `
            select
              check_name "name",
              check_year "year"
            from check_system
            where check_id = ?
          `,
          auditLogModel.extra?.checkId
        );
        auditLogModel.extra.checkName =
          checkSystem[0]?.name ?? '未找到考核名称';
        auditLogModel.extra.checkYear =
          checkSystem[0]?.year ?? '未找到考核年份';
      }
      // 对象参数, 直接赋值
      if (typeof auditLogObject === 'object') {
        auditLogModel = auditLogObject;
      }
      // 插入审计日志
      await appDB.execute(
        `insert into audit_log(time, user_id, user_name, module, method, extra) values (?, ?, ?, ?, ?, ?)`,
        now,
        auditLogModel.user_id ?? ctx.user.id,
        auditLogModel.user_name ?? ctx.user.name,
        auditLogModel.module ?? ctx.module.name,
        auditLogModel.method ?? ctx.method.name,
        JSON.stringify(auditLogModel.extra)
      );
    } catch (e) {
      // TODO: 等待统一的报警处理
      console.error(now, e);
    }
  }
}
