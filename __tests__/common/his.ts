import {multistep} from '../../common/his';

describe('梯度计算', () => {
  test('通用梯度', async () => {
    //梯度规则
    const rules = [
      {
        start: null,
        end: null,
        unit: 10
      }
    ];
    //总量
    const num = 100;
    //预计总量
    const exceptResult = rules.map(it => ({
      ...it,
      num: 100,
      total: 1000
    }));
    //梯度计算
    const result = multistep(rules, num);
    //判断
    expect(result).toStrictEqual(exceptResult);
  });
  test('正向梯度:整数区间', async () => {
    //梯度规则
    const rules = [
      {
        start: null,
        end: 10,
        unit: 1
      },
      {
        start: 10,
        end: null,
        unit: 2
      }
    ];
    //总量
    const num = 100;
    //预计总量
    const exceptResult = [
      {
        start: null,
        end: 10,
        unit: 1,
        num: 10,
        total: 10
      },
      {
        start: 10,
        end: null,
        unit: 2,
        num: 90,
        total: 180
      }
    ];
    //梯度计算
    const result = multistep(rules, num);
    //判断
    expect(result).toStrictEqual(exceptResult);
  });
  test('正向梯度:小数区间', async () => {
    //梯度规则
    const rules = [
      {
        start: null,
        end: 10.1,
        unit: 1
      },
      {
        start: 10.1,
        end: null,
        unit: 2
      }
    ];
    //总量
    const num = 100;
    //预计总量
    const exceptResult = [
      {
        start: null,
        end: 10.1,
        unit: 1,
        num: 10.1,
        total: 10.1
      },
      {
        start: 10.1,
        end: null,
        unit: 2,
        num: 89.9,
        total: 179.8
      }
    ];
    //梯度计算
    const result = multistep(rules, num);
    //判断
    expect(result).toStrictEqual(exceptResult);
  });
});
