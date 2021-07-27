const webpack = require('webpack');
const glob = require('glob');
const path = require('upath');
const base = require('./webpack.base');
const merge = require('webpack-merge');

function getEntries() {
  let map = {};
  const entryFiles = glob.sync('./__tests__/**/*.ts');
  for (const filepath of entryFiles) {
    map[
      path.join(path.dirname(filepath), path.basename(filepath, '.ts'))
    ] = filepath;
  }
  return map;
}

module.exports = merge(base, {
  mode: 'production',
  entry: getEntries(),
  plugins: [new webpack.DefinePlugin({_DEV_: false})]
});
