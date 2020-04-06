const webpack = require('webpack');
const base = require('./webpack.base');
const merge = require('webpack-merge');
const StartServerPlugin = require('start-server-webpack-plugin');

module.exports = merge(base, {
  mode: 'development',
  entry: {
    main: ['source-map-support/register', 'webpack/hot/poll?1000', './index.js']
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({_DEV_: true}),
    new StartServerPlugin({
      name: 'main.js',
      nodeArgs: ['--inspect']
    })
  ]
});
