export const paramsSymbol = Symbol('params-syb');

export const helpers = {
  '?': function(value, context) {
    const root = context.data.root;
    root[paramsSymbol].push(value);
    return '?';
  },
  page: function(pageNo, pageSize, context) {
    if (arguments.length !== 3) throw new Error('page必须接受两个参数');

    const root = context.data.root;
    root[paramsSymbol].push(pageSize);
    root[paramsSymbol].push((pageNo - 1) * pageSize);

    return 'limit ? offset ?';
  },
  sep: function(context) {
    return context.data.last ? context.inverse() : context.fn();
  },
  compare: function(source, op, target, context) {
    function toCompare(condition, context, caller) {
      return condition ? context.fn(caller) : context.inverse(caller);
    }

    function isNotNullOrEmpty(val) {
      return !(val === '' || val === undefined || val === null);
    }

    // 拓展，单参数 判断 null undefined ""
    if (arguments.length === 2) {
      context = op;
      return toCompare(isNotNullOrEmpty(source), context, this);
    }
    if (arguments.length !== 4) throw new Error('compare 必须接受四个参数');
    if (op === undefined)
      throw new Error(
        '操作符不能为 undefined,请检查参数中是否含有操作符或操作符是否已被引号包裹'
      );
    if (op === 'eq' || op === '=') {
      return toCompare(
        isNotNullOrEmpty(source) && source === target,
        context,
        this
      );
    } else if (op === 'not eq' || op === '!=' || op === '<>') {
      return toCompare(
        isNotNullOrEmpty(source) && source !== target,
        context,
        this
      );
    } else if (op === '>=') {
      return toCompare(
        isNotNullOrEmpty(source) &&
          isNotNullOrEmpty(source) &&
          source >= target,
        context,
        this
      );
    } else if (op === '>') {
      return toCompare(
        isNotNullOrEmpty(source) && isNotNullOrEmpty(source) && source > target,
        context,
        this
      );
    } else if (op === '<=') {
      return toCompare(
        isNotNullOrEmpty(source) &&
          isNotNullOrEmpty(source) &&
          source <= target,
        context,
        this
      );
    } else if (op === '<') {
      return toCompare(
        isNotNullOrEmpty(source) && isNotNullOrEmpty(source) && source < target,
        context,
        this
      );
    } else if (op === '||' || op === 'or') {
      //可以传入两个变量过来 source 不为空或者 target 不为空
      return toCompare(
        isNotNullOrEmpty(source) || isNotNullOrEmpty(target),
        context,
        this
      );
    } else if (op === '&&' || op === 'and') {
      //source 不为空并且 target 不为空
      return toCompare(
        isNotNullOrEmpty(source) && isNotNullOrEmpty(target),
        context,
        this
      );
    } else {
      throw new Error(`不合法的操作符${op}`);
    }
  }
};
