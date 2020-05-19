import {Context} from 'kato-server';
import {knrtDB} from '../../app';

export async function UserMiddleware(ctx: Context | any, next: Function) {
  try {
    const token = ctx.req.header('token');

    if (token) {
      const users = await knrtDB.execute(
        `
        select user.id,
               user.username,
               user.token,
               user.status,
               user.usertype,
               user.realname,
               user.duty,
               user.institutions,
               user.headpic,
               access.level,
               access.sys_code
        from leader_user user
               left join leader_access access on user.id = access.u_id
        where user.token = ?
          and user.status = ?
      `,
        token,
        1
      );

      ctx.user = users[0];
    }
  } catch (e) {
    console.log(e);
  }

  await next();
}
