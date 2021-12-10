import {multistep} from '../../common/his';
import Decimal from 'decimal.js';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function equalResult(
  rules: {start: number | null; end: number | null; unit: number}[],
  exceptResult: {num: number; result: number[]}[]
) {
  for (const except of exceptResult) {
    const result = multistep(rules, except.num);
    //判断
    expect(result).toStrictEqual(
      rules.map((rule, index) => {
        return {
          ...rule,
          num: except.result[index] ?? 0,
          total: Decimal.mul(except.result[index] ?? 0, rule.unit).toNumber()
        };
      })
    );
  }
}

describe('梯度计算', () => {
  test('通用梯度', async () => {
    //梯度规则
    const rules = [{start: null, end: null, unit: 10}];
    const exceptResult = [
      {num: -100, result: [-100]},
      {num: 0, result: [0]},
      {num: 100, result: [100]}
    ];
    equalResult(rules, exceptResult);
  });
  test('正向梯度:整数区间', async () => {
    //梯度规则
    const rules = [
      {start: null, end: 10, unit: 1},
      {start: 10, end: 20, unit: 2},
      {start: 20, end: null, unit: 3}
    ];
    const exceptResult = [
      {num: 0, result: [0]},
      {num: 5, result: [5]},
      {num: 10, result: [10]},
      {num: 15, result: [10, 5]},
      {num: 20, result: [10, 10]},
      {num: 25, result: [10, 10, 5]}
    ];
    equalResult(rules, exceptResult);
  });
  test('正向梯度:小数区间', async () => {
    //梯度规则
    const rules = [
      {start: null, end: 10.1, unit: 1},
      {start: 10.1, end: 20, unit: 2},
      {start: 20, end: 30.1, unit: 3},
      {start: 30.1, end: null, unit: 4}
    ];
    const exceptResult = [
      {num: 0, result: [0]},
      {num: 5, result: [5]},
      {num: 10.1, result: [10.1]},
      {num: 15, result: [10.1, 4.9]},
      {num: 20, result: [10.1, 9.9]},
      {num: 25, result: [10.1, 9.9, 5]},
      {num: 30.1, result: [10.1, 9.9, 10.1]},
      {num: 35, result: [10.1, 9.9, 10.1, 4.9]}
    ];
    equalResult(rules, exceptResult);
  });
  test('负向梯度(整数/小数)', async () => {
    //梯度规则
    const rules = [
      {start: null, end: -30.1, unit: 4},
      {start: -30.1, end: -20, unit: 3},
      {start: -20, end: -10.1, unit: 2},
      {start: -10.1, end: null, unit: 1}
    ];
    const exceptResult = [
      {num: -31, result: [-0.9, -10.1, -9.9, -10.1]},
      {num: -30.1, result: [0, -10.1, -9.9, -10.1]},
      {num: -25, result: [0, -5, -9.9, -10.1]},
      {num: -20, result: [0, 0, -9.9, -10.1]},
      {num: -15, result: [0, 0, -4.9, -10.1]},
      {num: -10.1, result: [0, 0, 0, -10.1]},
      {num: -10, result: [0, 0, 0, -10]},
      {num: 0, result: []},
      {num: 1, result: [0, 0, 0, 1]}
    ];
    equalResult(rules, exceptResult);
  });
});
