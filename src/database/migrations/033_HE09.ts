import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {BasicTagUsages} from '../../../common/rule-score';
import {v4 as uuid} from 'uuid';

export class HE09Migration implements IMigration {
  name = '健康教育咨询次数合格率基础数据维护';
  version = 33;

  async up(client: ExtendedSequelize): Promise<void> {
    // 查询所有机构
    const hospitals: {id: string; name: string}[] = await client.execute(
      `select id, name from hospital where name like '%服务中心' or name like '%卫生院'`
    );
    // 删除历史数据
    await client.execute(
      `delete from basic_tag_data where code = ?`,
      BasicTagUsages.HE09
    );
    const now = new Date();
    // 插入2020年数据
    await client.execute(
      `insert into basic_tag_data(id, hospital, code, year, value, created_at, updated_at) values ${hospitals
        .map(() => '(?, ?, ?, ?, ?, ?, ?)')
        .join()}`,
      ...hospitals
        .map(it => [uuid(), it.id, BasicTagUsages.HE09, 2020, 9, now, now])
        .reduce((prev, current) => {
          return [...prev, ...current];
        }, [])
    );
    return;
  }

  async down(client: ExtendedSequelize, err?: Error): Promise<void> {
    return;
  }
}
