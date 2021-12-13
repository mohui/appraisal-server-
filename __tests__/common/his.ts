import {multistep} from '../../common/his';
import Decimal from 'decimal.js';
import {KatoCommonError} from 'kato-server';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function equalResult(
  rules: {start: number | null; end: number | null; unit: number}[],
  exceptResult: {num: number; result: number[]}[]
) {
  for (const except of exceptResult) {
    const result = multistep(rules, except.num);
    if (
      except.num !== result.reduce((result, current) => result + current.num, 0)
    )
      throw new KatoCommonError(`数据总量不符：${except}`);
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
  test('全梯度计算(负整数/负小数/0/正整数/正小数)', async () => {
    //梯度规则
    const rules = [
      {start: null, end: -10, unit: 10},
      {start: -10, end: -7.5, unit: 9},
      {start: -7.5, end: -5, unit: 8},
      {start: -5, end: 2.5, unit: 7},
      {start: 2.5, end: 10, unit: 6},
      {start: 10, end: 17.5, unit: 5},
      {start: 17.5, end: null, unit: 4}
    ];
    const exceptResult = [
      {num: -5, result: [0, 0, 0, -5]}, //负数1个梯度
      {num: -6, result: [0, 0, -1, -5]}, //负数2个梯度
      {num: -2.5, result: [0, 0, 0, -2.5]}, //负小数1个梯度
      {num: -6.5, result: [0, 0, -1.5, -5]}, //负小数2个梯度
      {num: 0, result: []}, //0
      {num: 2, result: [0, 0, 0, 2]}, //正数1个梯度
      {num: 5, result: [0, 0, 0, 2.5, 2.5]}, //正数2个梯度
      {num: 1.5, result: [0, 0, 0, 1.5]}, //小数1个梯度
      {num: 5.5, result: [0, 0, 0, 2.5, 3]} //小数2个梯度
    ];
    equalResult(rules, exceptResult);
  });
});
