import {KatoClient} from 'kato-client';
import {app, appDB} from '../../src/app';

let api;
beforeAll(async () => {
  await app.start();
  api = new KatoClient('http://localhost:3000/api');
  await api.init();
});

afterAll(async () => {
  await app.shutdown();
});

describe('短信验证码相关', () => {
  test('手机号码校验 - 手机号码已被使用', async () => {
    const phone: string = (
      await appDB.execute(
        `select * from staff where left(phone, 1) = '1' and length(phone) = 11 limit 1`
      )
    )[0]?.phone;
    if (phone) {
      const valid = await api.AppUser.validPhone(phone);
      expect(valid).toEqual(false);
    } else {
      console.log('没找到手机号码');
    }
  });
});
