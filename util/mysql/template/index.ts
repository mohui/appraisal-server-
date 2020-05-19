import {engine} from './engine';
import {paramsSymbol} from './helpers';

export function sqlrender(sqlTemplate, data) {
  data = data || this;
  data[paramsSymbol] = [];
  const template = engine.compile(sqlTemplate, {noEscape: true});
  const sql = template(data);
  return [sql.trim(), data[paramsSymbol]];
}
