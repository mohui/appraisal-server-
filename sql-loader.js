const htmlParser = require('node-html-parser');
const handlebars = require('handlebars');
const helpers = require('handlebars-helpers')();
const path = require('path');
const fse = require('fs-extra');

console.warn('[SQL] init @types/sql.hbs.stub module');

//用于loader的模板引擎
const engine = handlebars.create();
engine.registerHelper(helpers);
engine.registerHelper('sep', (context) => context.data.last ? context.inverse() : context.fn());

// JS模板
const jsTemplate = engine.compile(`
    //引入依赖
    import Handlebars from 'handlebars';
    import Helpers from 'handlebars-helpers';
    import { helpers as customHelpers, paramsSymbol } from '{{helperPath}}';
    import { mysql } from '{{mysqlPath}}';

    //新建模板引擎
    const engine = Handlebars.create();
    engine.registerHelper({
      ...Helpers(),
      ...customHelpers
    });

    //注册partials
    {{#each partials}}
    engine.registerPartial({{JSONstringify this.id}}, {{JSONstringify this.template}})
    {{/each}}

    //导出变量
    const exports = {};

    //导出sql模板方法
    {{#each sqls}}
    const {{this.id}}_template = engine.compile({{JSONstringify  this.template}}, { noEscape: true });
    exports[{{JSONstringify this.id}}] = function (data) {
      data = data || {};
      data[paramsSymbol] = [];
      const sql = {{this.id}}_template(data).trim();
      const params = data[paramsSymbol];
      delete data[paramsSymbol];
      return [sql, params];
    }
    {{/each}}

    //导出方法
    {{#each methods}}
    const {{this.id}}_template = engine.compile({{JSONstringify  this.template}}, { noEscape: true });
    exports[{{JSONstringify this.id}}] = async function () {
      const data = {};
      data[paramsSymbol] = [];
      {{#each this.params}}
      data[{{JSONstringify this}}] = arguments[{{@index}}];
      {{/each}}
      const sql = {{this.id}}_template(data).trim();
      const params = data[paramsSymbol];
      delete data[paramsSymbol];

      //普通函数
      {{#eq this.type 'normal'}}
      return await mysql.execute(sql, ...params);
      {{/eq}}

      {{#eq this.type 'jointx'}}
      return await mysql.jointx(async conn => await conn.execute(sql, ...params));
      {{/eq}}

      {{#eq this.type 'tx'}}
      return await mysql.tx(async conn => await conn.execute(sql, ...params));
      {{/eq}}

      {{#eq this.type 'page'}}
      if(arguments.length<2)
        throw new Error('分页参数至少需要两个');
      const pageNo = arguments[arguments.length - 2];
      const pageSize = arguments[arguments.length - 1];
      return await mysql.page(sql, pageNo, pageSize, ...params)
      {{/eq}}
    }
    {{/each}}

    export default exports;
`, {noEscape: true});

module.exports = function (hbsSource) {
  const callback = this.async();
  (async () => {
    //解析xml模板,找到sql节点并解析它们
    const xmlNodes = htmlParser
      .parse(hbsSource)
      .childNodes
      .filter(it => it.tagName && ['part', 'sql', 'method'].includes(it.tagName))
      .filter(it => {
        //id为空过滤
        if (it.id && it.id.trim() !== "" && it.id.trim() !== `""`) {
          return true
        } else {
          console.warn(`[SQL] 文件: ${this.resourcePath} 中存在id为空的节点`);
          return false;
        }
      })
      .filter(it => it.childNodes && it.childNodes.length && it.childNodes.length > 0)
      .filter((it, index, array) => {
        //id去重操作
        if (array.map(a => a.id).indexOf(it.id) !== index) {
          //有重复,输出警告
          console.warn(`[SQL] 文件: ${this.resourcePath} 中存在重复id [${it.id}]`);
          return false;
        } else
          return true;
      })
      .map(it => ({
        id: it.id,
        type: it.tagName,
        attrs: it.attributes,
        text: it.childNodes[0]
      }))
      .filter(it => it.text.rawText);

    //找到所有的partials
    const partials = xmlNodes
      .filter(it => it.type === 'part')
      .map(it => ({id: it.id, template: it.text.rawText.trim()}));

    //找到所有的sql
    const sqls = xmlNodes
      .filter(it => it.type === 'sql')
      .map(it => ({id: it.id, template: it.text.rawText.trim()}));

    //找到所有的method
    const methods = xmlNodes
      .filter(it => it.type === 'method')
      .map(it => ({
        id: it.id,
        type: it.attrs.type || 'normal',
        params: it.attrs.params ? it.attrs.params.split(',').map(it => it.trim()) : [],
        template: it.text.rawText.trim()
      }));

    //开始生成js文件
    //解析模块路径用
    const resolve = (modulePath) => {
      let resolved = path.relative(
        this.context,
        modulePath
      ).replace(/\\/g, '/');
      if (!resolved.startsWith('.'))
        resolved = './' + resolved;
      return resolved;
    };

    //获取到helpers的路径
    const helperPath = resolve('./util/mysql/template/helpers.ts');
    //获取到mysql的路径
    const mysqlPath = resolve('./util/mysql/index.ts');

    //生成对应的js文件,然后传入到webpack中,参与再次编译
    return jsTemplate({helperPath, mysqlPath, sqls, methods, partials});
  })().then(result => callback(null, result)).catch(err => callback(err));
};

