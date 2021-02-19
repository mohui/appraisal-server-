import {IMigration} from '../migrater';
import {ExtendedSequelize} from '../client';
import {BasicTagUsages} from '../../../common/rule-score';
import {v4 as uuid} from 'uuid';

export class HE07Migration implements IMigration {
  name = '健康教育讲座次数合格率基础数据维护';
  version = 32;

  async up(client: ExtendedSequelize): Promise<void> {
    // 查询所有机构
    const hospitals: {id: string; name: string}[] = await client.execute(
      `select id, name from hospital`
    );
    // 删除历史数据
    await client.execute(
      `delete from basic_tag_data where code = ?`,
      BasicTagUsages.HE07
    );
    const now = new Date();
    // 插入2020年数据
    await client.execute(
      `insert into basic_tag_data(id, hospital, code, year, value, created_at, updated_at) values ${hospitals
        .map(() => '(?, ?, ?, ?, ?, ?, ?)')
        .join()}`,
      ...hospitals
        .map(it => [
          uuid(),
          it.id,
          BasicTagUsages.HE07,
          2020,
          it.name.endsWith('服务中心') || it.name.endsWith('卫生院') ? 12 : 6,
          now,
          now
        ])
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
