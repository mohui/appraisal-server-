const webpack = require('webpack');
const merge = require('webpack-merge');
const StartServerPlugin = require('start-server-webpack-plugin');
const base = require('./webpack.base');

module.exports = merge(base, {
  mode: 'development',
  entry: {
    main: [
      'source-map-support/register',
      'webpack/hot/poll?1000',
      './web-server.js'
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      _DEV_: true,
    }),
    new StartServerPlugin({
      name: 'main.js',
    }),
  ]
});
