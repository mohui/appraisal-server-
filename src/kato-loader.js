const glob = require('glob');

async function fileMatch(pattern, options) {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, matches) => err ? reject(err) : resolve(matches))
  })
}

module.exports = function (config) {
  const callback = this.async();
  config = JSON.parse(config);

  (async () => {
    const files = (
      await Promise.all(config.include.map(i => fileMatch(i, {
        ignore: config.exclude,
        cwd: this.context,
        nodir: true
      }))))
      .reduce((p, n) => [...p, ...n], [])
      .filter((file, index, array) => array.indexOf(file) === index)
      .map(file => './' + file);

    //添加config文件所在的目录作为依赖,监听其文件更改
    this.addContextDependency(this.context);

    return `
    module.exports = function(kato) {
      console.log('[kato-loader] 获取到 ${files.length} 个需要加载的模块文件');
      ${files.map(file => `
      //kato类加载
      {
        let katoClass = require('${file}');
        if (typeof katoClass.default === 'function')
          katoClass = katoClass.default;
        if (typeof katoClass === 'function') {
          kato.load(katoClass);
          console.log('[kato-loader] => 加载kato模块 ${file}');
        } else
          console.warn('[kato-loader] => 文件 ${file} 中找不到可加载类');
        if (module.hot) {
          module.hot.accept('${file}', () => {
            let katoClass = require('${file}');
            if (typeof katoClass.default === 'function')
              katoClass = katoClass.default;
            if (typeof katoClass === 'function') {
              kato.load(katoClass);
              console.log('[kato-loader] => 加载kato模块 ${file}');
            } else
              console.warn('[kato-loader] => 文件 ${file} 中找不到可加载类');
          });
        }
      }`).join('\n')}
      console.log('[kato-loader] 所有模块加载完毕!');
    }`;
  })()
    .then(result => callback(null, result))
    .catch(err => callback(err));
};
